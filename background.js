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

async function attach(tabId) {
  const targets = await chrome.debugger.getTargets();
  const already = targets.some((t) => t.tabId === tabId && t.attached && t.extensionId === chrome.runtime.id);
  if (!already) {
    try {
      await chrome.debugger.attach({ tabId }, "1.3");
    } catch (e) {
      if (!String(e.message).includes("Already attached")) throw e;
    }
  }
}

const cdp = (tabId, method, params = {}) => chrome.debugger.sendCommand({ tabId }, method, params);

/**
 * Emulates a viewport of w×h on the tab. If it's bigger than the real viewport
 * the page is scaled down to fit, like DevTools' device toolbar.
 */
async function emulate(tabId, { w, h, dpr = 0, mobile = false, ua = null, label, key }) {
  const before = await getEmulation(tabId);
  const real = await measure(tabId);
  // Real viewport size (with any previous emulation removed).
  let availW = real?.outerWidth ? real.outerWidth - 16 : 1200;
  let availH = real?.outerHeight ? real.outerHeight - 140 : 800;
  if (before?.real) ({ availW, availH } = before.real);
  else if (real) ({ innerWidth: availW, innerHeight: availH } = real);

  const scale = Math.min(1, availW / w, availH / h);

  await attach(tabId);
  await cdp(tabId, "Emulation.setDeviceMetricsOverride", {
    width: w,
    height: h,
    deviceScaleFactor: dpr,
    mobile,
    scale: Math.round(scale * 1000) / 1000,
  });
  await cdp(tabId, "Emulation.setTouchEmulationEnabled", { enabled: mobile, maxTouchPoints: mobile ? 5 : 0 });
  await cdp(tabId, "Emulation.setUserAgentOverride", { userAgent: ua ? UA[ua] : "" });

  await chrome.storage.session.set({
    [emuKey(tabId)]: { label, key, ua: !!ua, real: { availW, availH } },
  });

  // Sites usually pick mobile vs desktop layout (and UA) on load, so reload
  // whenever the user agent changes.
  if (!!ua !== !!before?.ua || ua) await chrome.tabs.reload(tabId);

  return scale < 1 ? { note: `Shown at ${Math.round(scale * 100)}% so it fits your window.` } : {};
}

async function stopEmulation(tabId) {
  const emu = await getEmulation(tabId);
  if (!emu) return;
  await chrome.storage.session.remove(emuKey(tabId));
  try {
    await chrome.debugger.detach({ tabId });
  } catch {
    /* already detached */
  }
  if (emu.ua) await chrome.tabs.reload(tabId);
  await sleep(150);
}

// The user can also end emulation from Chrome's "is debugging this browser" bar.
chrome.debugger.onDetach.addListener(({ tabId }) => {
  if (tabId != null) chrome.storage.session.remove(emuKey(tabId));
});
chrome.tabs.onRemoved.addListener((tabId) => chrome.storage.session.remove(emuKey(tabId)));

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
      return { size, emulation, window: { width: win.width, height: win.height } };
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
