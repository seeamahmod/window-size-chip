/* global DEVICES, FOLDABLE, UA */
importScripts("presets.js");

// ---------- Toolbar icon + badge ----------

// The icon itself comes from icons/ via the manifest; only the badge is styled here.
function setIcon() {
  chrome.action.setBadgeBackgroundColor({ color: "#1f6f4a" });
  chrome.action.setBadgeTextColor?.({ color: "#ffffff" });
}

let lastBadge = "";
function setBadge(width, height) {
  const key = `${width}x${height}`;
  if (key === lastBadge) return;
  lastBadge = key;
  chrome.action.setBadgeText({ text: String(width) });
  chrome.action.setTitle({ title: `Window: ${width} × ${height}\nClick for preset sizes` });
}

async function updateBadge(windowId) {
  try {
    const win =
      windowId == null
        ? await chrome.windows.getLastFocused()
        : await chrome.windows.get(windowId);
    if (win && win.width != null) setBadge(win.width, win.height);
  } catch {
    /* window closed mid-update */
  }
}

chrome.runtime.onInstalled.addListener(() => {
  setIcon();
  updateBadge();
  refreshOpenTabs();
});

// After an install or update, Chrome doesn't put the new content script into
// tabs that are already open. Add it to them so nobody has to reload pages.
async function refreshOpenTabs() {
  const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] }).catch(() => []);
  await Promise.all(
    tabs.map((t) =>
      chrome.scripting.executeScript({ target: { tabId: t.id }, files: ["content.js"] }).catch(() => {})
    )
  );
}
chrome.runtime.onStartup.addListener(() => {
  setIcon();
  updateBadge();
});
chrome.windows.onBoundsChanged.addListener((win) => updateBadge(win.id));
chrome.windows.onFocusChanged.addListener((id) => {
  if (id !== chrome.windows.WINDOW_ID_NONE) updateBadge(id);
});

// ---------- Helpers ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Asks the page's content script for its live sizes. Null on pages Chrome
// doesn't let extensions touch (chrome://, Web Store, PDF viewer…).
async function measure(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: "getSize" });
  } catch {
    return null;
  }
}

// ---------- Emulation (mobile / tablet / too-big desktop) ----------

const emuKey = (tabId) => `emu_${tabId}`;

async function getEmulation(tabId) {
  const k = emuKey(tabId);
  return (await chrome.storage.session.get(k))[k] || null;
}

// The tab shows view.html, which loads the site in an iframe of the exact size,
// centered on a shade of the site's own background. Session rules let sites
// load in the iframe and send the device's user agent; inject.js does the rest
// inside the page.

const VIEW_URL = chrome.runtime.getURL("view.html");
const viewUrlKey = (tabId) => `viewurl_${tabId}`;
// Rule ids must be small integers, but Chrome's tab ids can be huge, so each
// tab gets its own pair of ids from a counter.
async function ruleIds(tabId, create = true) {
  const k = `rules_${tabId}`;
  const got = await chrome.storage.session.get([k, "ruleSeq"]);
  if (got[k]) return got[k];
  if (!create) return [];
  const next = (got.ruleSeq || 0) + 2;
  const ids = [next - 1, next];
  await chrome.storage.session.set({ [k]: ids, ruleSeq: next });
  return ids;
}
const SUB_RESOURCES = [
  "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest",
  "ping", "csp_report", "media", "websocket", "other",
];

async function setViewRules(tabId, ua) {
  const ids = await ruleIds(tabId);
  const [uaId, frameId] = ids;
  const rules = [
    {
      id: frameId,
      priority: 1,
      action: {
        type: "modifyHeaders",
        responseHeaders: [
          { header: "x-frame-options", operation: "remove" },
          { header: "content-security-policy", operation: "remove" },
        ],
      },
      condition: { tabIds: [tabId], resourceTypes: ["sub_frame"] },
    },
  ];
  if (ua) {
    const apple = ua === "ios" || ua === "ipad";
    rules.push({
      id: uaId,
      priority: 1,
      action: {
        type: "modifyHeaders",
        requestHeaders: [
          { header: "user-agent", operation: "set", value: UA[ua] },
          { header: "sec-ch-ua-mobile", operation: "set", value: ua === "ios" || ua === "android" ? "?1" : "?0" },
          { header: "sec-ch-ua-platform", operation: "set", value: apple ? '"iOS"' : '"Android"' },
        ],
      },
      condition: { tabIds: [tabId], resourceTypes: SUB_RESOURCES },
    });
  }
  await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: ids, addRules: rules });
  await setInject(true);
}

// inject.js is only registered while some tab is showing a sized view, so
// normal browsing never loads it.
async function setInject(on) {
  const [cur] = await chrome.scripting.getRegisteredContentScripts({ ids: ["wsc-inject"] });
  if (on && !cur) {
    await chrome.scripting.registerContentScripts([
      {
        id: "wsc-inject",
        js: ["inject.js"],
        matches: ["<all_urls>"],
        allFrames: true,
        runAt: "document_start",
        world: "MAIN",
        persistAcrossSessions: false,
      },
    ]);
  } else if (!on && cur) {
    await chrome.scripting.unregisterContentScripts({ ids: ["wsc-inject"] });
  }
}

async function clearViewRules(tabId) {
  const ids = await ruleIds(tabId, false);
  await chrome.storage.session.remove(`rules_${tabId}`);
  if (ids.length) await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: ids }).catch(() => {});
  // Last sized view closed: stop loading inject.js anywhere.
  const left = await chrome.declarativeNetRequest.getSessionRules();
  if (!left.length) await setInject(false).catch(() => {});
}

function waitForLoad(tabId, ms = 8000) {
  return new Promise((resolve) => {
    const done = () => {
      chrome.tabs.onUpdated.removeListener(onUpd);
      clearTimeout(timer);
      resolve();
    };
    const onUpd = (id, info) => {
      if (id === tabId && info.status === "complete") done();
    };
    const timer = setTimeout(done, ms);
    chrome.tabs.onUpdated.addListener(onUpd);
  });
}

// The page's main background color, read from a screenshot of the tab: the
// most common color along the page's left, right and bottom edges.
async function pageColor(windowId) {
  try {
    const shot = await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
    const bmp = await createImageBitmap(await (await fetch(shot)).blob());
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(bmp, 0, 0);
    const pts = [];
    for (const fx of [0.005, 0.02, 0.98]) for (const fy of [0.15, 0.3, 0.45, 0.6, 0.75, 0.9]) pts.push([fx, fy]);
    for (const fx of [0.2, 0.4, 0.6, 0.8]) pts.push([fx, 0.985]);
    const counts = new Map();
    for (const [fx, fy] of pts) {
      const [r, gg, b] = g.getImageData(Math.floor(bmp.width * fx), Math.floor(bmp.height * fy), 1, 1).data;
      const key = `${r},${gg},${b}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const [best] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return `rgb(${best})`;
  } catch {
    return null;
  }
}

/** Shows the tab's page at exactly w×h, centered. */
async function emulate(tabId, { w, h, dpr = 0, ua = null, hinge = 0, hingeDir = "v", label, key }) {
  const before = await getEmulation(tabId);
  let url;
  let real = before?.real || null;
  let bg = before?.bg || null;
  if (before) {
    url = (await chrome.storage.session.get(viewUrlKey(tabId)))[viewUrlKey(tabId)] || before.url;
  } else {
    const tab = await chrome.tabs.get(tabId);
    url = tab.url;
    const m = await measure(tabId);
    if (m) real = { availW: m.innerWidth, availH: m.innerHeight };
    bg = await pageColor(tab.windowId);
  }
  if (!/^https?:/i.test(url || "")) return { error: "Open a website first, then pick a size." };

  await setViewRules(tabId, ua);
  await chrome.storage.session.set({
    [emuKey(tabId)]: { label, key, w, h, url, real, bg },
    [viewUrlKey(tabId)]: url,
  });
  const p = new URLSearchParams({ w: String(w), h: String(h), ua: ua || "", dpr: String(dpr || 0), bg: bg || "", hinge: String(hinge), hd: hingeDir, u: url });
  await chrome.tabs.update(tabId, { url: `${VIEW_URL}?${p}` });
  return {};
}

async function stopEmulation(tabId) {
  const emu = await getEmulation(tabId);
  if (!emu) return;
  const url = (await chrome.storage.session.get(viewUrlKey(tabId)))[viewUrlKey(tabId)] || emu.url;
  await chrome.storage.session.remove([emuKey(tabId), viewUrlKey(tabId)]);
  await clearViewRules(tabId);
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (tab?.url?.startsWith(VIEW_URL) && url) {
    await chrome.tabs.update(tabId, { url });
    await waitForLoad(tabId);
  }
}

// Leaving the view any other way (typing a URL, Back) ends it.
chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  if (!info.url || info.url.startsWith(VIEW_URL)) return;
  if (await getEmulation(tabId)) {
    await chrome.storage.session.remove([emuKey(tabId), viewUrlKey(tabId)]);
    await clearViewRules(tabId);
  }
});
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove([emuKey(tabId), viewUrlKey(tabId)]);
  clearViewRules(tabId);
});

// ---------- Real window resize (desktop presets) ----------

async function resizeWindowTo(tabId, windowId, target) {
  await stopEmulation(tabId);

  let win = await chrome.windows.get(windowId);
  let m = await measure(tabId);
  const zoom = await chrome.tabs.getZoom(tabId).catch(() => 1);

  // Maximized, full-screen or snapped windows can't take a size directly. Leave
  // that state first and wait for it to finish (macOS animates leaving full
  // screen; some Linux window managers apply it late).
  const keepHeight = win.state !== "normal" ? win.height : null;
  if (win.state !== "normal") {
    await chrome.windows.update(windowId, { state: "normal" });
    for (let i = 0; i < 25; i++) {
      await sleep(60);
      win = await chrome.windows.get(windowId);
      if (win.state === "normal") break;
    }
    await sleep(win.state === "normal" ? 250 : 0);
    win = await chrome.windows.get(windowId);
    m = (await measure(tabId)) || m;
  }

  // Width of the window's own frame (borders, plus any side panel), in window units.
  // It's 0 on most macOS and Linux setups and a few px on Windows.
  const frame = m ? Math.max(0, m.outerWidth - Math.round(m.innerWidth * zoom)) : 16;
  let width = Math.round(target * zoom) + frame;

  const update = (w) => {
    const props = { width: w };
    if (keepHeight) props.height = keepHeight;
    // Keep the window on screen when it grows.
    if (m?.screen) {
      const right = m.screen.availLeft + m.screen.availWidth;
      const left = win.left ?? m.screen.availLeft;
      if (left + w > right) props.left = Math.max(m.screen.availLeft, right - w);
    }
    return chrome.windows.update(windowId, props);
  };

  // Waits until the window actually reports the new width (or gives up).
  const settle = async (w) => {
    for (let i = 0; i < 16; i++) {
      await sleep(50);
      const now = await chrome.windows.get(windowId);
      if (now.width === w) break;
    }
    await sleep(60);
  };

  await update(width);
  await settle(width);

  // Nudge until the page's viewport is exactly the target width.
  for (let i = 0; i < 5 && m; i++) {
    m = await measure(tabId);
    win = await chrome.windows.get(windowId);
    if (!m || m.innerWidth === target) break;
    const diff = target - m.innerWidth;
    const next = win.width + Math.round(diff * zoom);
    if (next === win.width) break;
    width = next;
    await update(width);
    await settle(width);
  }

  m = await measure(tabId);
  win = await chrome.windows.get(windowId);
  setBadge(win.width, win.height);

  if (!m) {
    return { note: `Window set to ${win.width}px wide (this page can't report its viewport).` };
  }
  if (m.innerWidth < target) {
    // Screen isn't wide enough for a real window: emulate it, scaled to fit.
    const res = await emulate(tabId, {
      w: target,
      h: m.innerHeight,
      mobile: false,
      label: `${target}px desktop`,
      key: `d${target}`,
    });
    return { note: `Your screen is narrower than ${target}px, so it's emulated. ${res.note || ""}`.trim() };
  }
  return {};
}

// ---------- Messages from popup + content scripts ----------

async function handle(msg, sender) {
  if (msg?.type === "resized") {
    if (msg.width && msg.height) setBadge(msg.width, msg.height);
    return;
  }

  const { cmd, tabId, windowId } = msg || {};
  switch (cmd) {
    case "state": {
      const [size, emulation, win] = await Promise.all([
        measure(tabId),
        getEmulation(tabId),
        chrome.windows.get(windowId),
      ]);
      const viewSize = emulation
        ? { innerWidth: emulation.w, innerHeight: emulation.h, outerWidth: win.width, outerHeight: win.height }
        : null;
      return { size: viewSize || size, emulation, window: { width: win.width, height: win.height } };
    }
    case "resize":
      return resizeWindowTo(tabId, windowId, msg.width);
    case "emulate": {
      const foldable = msg.group === "Foldable";
      const d = foldable ? FOLDABLE[msg.index] : DEVICES[msg.group]?.[msg.index];
      if (!d) return { error: "Unknown device." };
      const unfolded = foldable && msg.fold === "unfolded";
      const dims = foldable ? (unfolded ? d.unfolded : d.folded) : d;
      const land = msg.orientation === "landscape";
      const w = land ? dims.h : dims.w;
      const h = land ? dims.w : dims.h;
      const notes = [foldable ? (unfolded ? "unfolded" : "folded") : "", land ? "horizontal" : ""].filter(Boolean);
      return emulate(tabId, {
        w,
        h,
        dpr: d.dpr,
        ua: d.ua,
        hinge: dims.hinge || 0,
        hingeDir: land ? "h" : "v",
        label: `${d.name} (${w} × ${h}${notes.length ? ", " + notes.join(", ") : ""})`,
        key: `${msg.group}-${msg.index}`,
      });
    }
    case "custom": {
      const w = Math.round(msg.width);
      const h = Math.round(msg.height || 0);
      if (!(w >= 200 && w <= 4000)) return { error: "Width must be between 200 and 4000." };
      if (h && !(h >= 200 && h <= 4000)) return { error: "Height must be between 200 and 4000." };
      if (!h && w >= 600) return resizeWindowTo(tabId, windowId, w);
      const m = await measure(tabId);
      const height = h || (await getEmulation(tabId))?.real?.availH || m?.innerHeight || 800;
      return emulate(tabId, {
        w,
        h: height,
        dpr: w < 768 ? 2 : 0,
        mobile: w < 768,
        label: `${w} × ${height}`,
        key: `c${w}x${height}`,
      });
    }
    case "reset":
      await stopEmulation(tabId);
      return {};
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handle(msg, sender)
    .then((res) => sendResponse(res ?? {}))
    .catch((e) => sendResponse({ error: e?.message || String(e) }));
  return true;
});
