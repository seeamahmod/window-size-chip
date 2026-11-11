/* global DESKTOP, DEVICES, UA */
importScripts("presets.js");

// ---------- Toolbar icon + badge ----------

function drawIcon(size) {
  const c = new OffscreenCanvas(size, size);
  const g = c.getContext("2d");
  const s = size / 16;
  g.fillStyle = "#1f6f4a";
  g.beginPath();
  g.roundRect(0, 0, size, size, 3 * s);
  g.fill();
  g.strokeStyle = "#ffffff";
  g.lineWidth = 1.5 * s;
  g.strokeRect(3.5 * s, 3.5 * s, 9 * s, 9 * s);
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.moveTo(12.5 * s, 8 * s);
  g.lineTo(12.5 * s, 12.5 * s);
  g.lineTo(8 * s, 12.5 * s);
  g.closePath();
  g.fill();
  return g.getImageData(0, 0, size, size);
}

function setIcon() {
  chrome.action.setIcon({
    imageData: { 16: drawIcon(16), 32: drawIcon(32), 48: drawIcon(48) },
  });
  chrome.action.setBadgeBackgroundColor({ color: "#1f6f4a" });
  chrome.action.setBadgeTextColor?.({ color: "#ffffff" });
}

function setBadge(width, height) {
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
});
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
}

async function clearViewRules(tabId) {
  const ids = await ruleIds(tabId, false);
  await chrome.storage.session.remove(`rules_${tabId}`);
  if (ids.length) await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: ids }).catch(() => {});
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

/** Shows the tab's page at exactly w×h, centered. */
async function emulate(tabId, { w, h, dpr = 0, ua = null, label, key }) {
  const before = await getEmulation(tabId);
  let url;
  let real = before?.real || null;
  if (before) {
    url = (await chrome.storage.session.get(viewUrlKey(tabId)))[viewUrlKey(tabId)] || before.url;
  } else {
    url = (await chrome.tabs.get(tabId)).url;
    const m = await measure(tabId);
    if (m) real = { availW: m.innerWidth, availH: m.innerHeight };
  }
  if (!/^https?:/i.test(url || "")) return { error: "Open a website first, then pick a size." };

  await setViewRules(tabId, ua);
  await chrome.storage.session.set({
    [emuKey(tabId)]: { label, key, w, h, url, real },
    [viewUrlKey(tabId)]: url,
  });
  const p = new URLSearchParams({ w: String(w), h: String(h), ua: ua || "", dpr: String(dpr || 0), u: url });
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

  // Width of window borders + scrollbar-free frame, in window units.
  const frame = m ? m.outerWidth - Math.round(m.innerWidth * zoom) : 16;
  let width = Math.round(target * zoom) + frame;

  const update = (w) => {
    const props = { state: "normal", width: w };
    if (win.state === "maximized" || win.state === "fullscreen") props.height = win.height;
    // Keep the window on screen when it grows.
    if (m?.screen) {
      const right = m.screen.availLeft + m.screen.availWidth;
      const left = win.left ?? m.screen.availLeft;
      if (left + w > right) props.left = Math.max(m.screen.availLeft, right - w);
    }
    return chrome.windows.update(windowId, props);
  };

  await update(width);

  // Nudge until the page's viewport is exactly the target width.
  for (let i = 0; i < 4 && m; i++) {
    await sleep(120);
    m = await measure(tabId);
    win = await chrome.windows.get(windowId);
    if (!m || m.innerWidth === target) break;
    const diff = target - m.innerWidth;
    const next = win.width + Math.round(diff * zoom);
    if (next === win.width) break;
    width = next;
    await update(width);
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
      const d = DEVICES[msg.group]?.[msg.index];
      if (!d) return { error: "Unknown device." };
      const land = msg.orientation === "landscape";
      const w = land ? d.h : d.w;
      const h = land ? d.w : d.h;
      return emulate(tabId, {
        w,
        h,
        dpr: d.dpr,
        mobile: !!d.ua,
        ua: d.ua,
        label: `${d.name} (${w} × ${h}${land ? ", horizontal" : ""})`,
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

setIcon();
updateBadge();
