/* global DEVICES, UA, PLATFORM */
// Shows the page inside a drawn device frame (phones and tablets only).
// URL: frame.html?g=Mobile&i=11&o=portrait&u=<page url>

const params = new URLSearchParams(location.search);
const group = params.get("g") === "Tablet" ? "Tablet" : "Mobile";
const device = DEVICES[group][+params.get("i")] || DEVICES.Mobile[0];
const landscape = params.get("o") === "landscape";
let currentUrl = params.get("u") || "about:blank";
const hasChrome = typeof chrome !== "undefined" && !!chrome.tabs;

// ---------- Geometry ----------

// Bezel insets in portrait: top, right, bottom, left.
const BEZEL = {
  island: [11, 11, 11, 11],
  notch: [12, 12, 12, 12],
  home: [72, 16, 72, 16],
  punch: [10, 9, 12, 9],
  fold: [9, 9, 9, 9],
  tablet: [22, 22, 22, 22],
  surface: [26, 26, 26, 26],
};
const EDGE = device.style === "tablet" || device.style === "surface" ? 4 : 5;

// Rotating the device to the left (counter-clockwise): top → left, left → bottom,
// bottom → right, right → top.
function rotInsets([t, r, b, l]) {
  return landscape ? [r, b, l, t] : [t, r, b, l];
}

const W = landscape ? device.h : device.w;
const H = landscape ? device.w : device.h;
const [bt, br, bb, bl] = rotInsets(BEZEL[device.style]);
const FW = W + bl + br + EDGE * 2;
const FH = H + bt + bb + EDGE * 2;
const screenR = device.r;
const bezelR = device.style === "home" ? 52 : screenR + Math.min(bt, bl);
const outerR = bezelR + EDGE;

function el(cls, style, parent) {
  const n = document.createElement("div");
  n.className = cls;
  Object.assign(n.style, style);
  parent.appendChild(n);
  return n;
}
const px = (n) => `${Math.round(n * 10) / 10}px`;

// Converts a portrait position to the current orientation.
// Portrait box: x across, y down. Landscape (rotated left): x' = y, y' = PW - x - len.
function place(x, y, w, h) {
  if (!landscape) return { left: px(x), top: px(y), width: px(w), height: px(h) };
  const PW = device.w + BEZEL[device.style][1] + BEZEL[device.style][3] + EDGE * 2;
  return { left: px(y), top: px(PW - x - w), width: px(h), height: px(w) };
}

function buildDevice() {
  const d = document.getElementById("device");
  d.style.width = px(FW);
  d.style.height = px(FH);
  d.style.setProperty("--edge", device.hex);
  d.style.setProperty("--outer-r", px(outerR));
  d.style.setProperty("--bezel-r", px(bezelR));
  d.style.setProperty("--screen-r", px(screenR));

  el("bezel", { left: px(EDGE), top: px(EDGE), right: px(EDGE), bottom: px(EDGE) }, d);

  const screen = el("screen", { left: px(EDGE + bl), top: px(EDGE + bt), width: px(W), height: px(H) }, d);

  // Portrait geometry helpers (screen origin, in portrait coordinates).
  const [pt, , , pl] = BEZEL[device.style];
  const sx = EDGE + pl; // screen left in portrait
  const sy = EDGE + pt; // screen top in portrait
  const cx = sx + device.w / 2; // screen center x in portrait

  switch (device.style) {
    case "island": {
      const iw = device.w >= 430 ? 126 : 122;
      el("cutout", { ...place(cx - iw / 2, sy + 11, iw, 36), borderRadius: "20px" }, d);
      break;
    }
    case "notch": {
      const nw = Math.round(device.w * 0.41);
      el("cutout", { ...place(cx - nw / 2, sy - 1, nw, 31), borderRadius: landscape ? "0 22px 22px 0" : "0 0 22px 22px" }, d);
      el("slit", place(cx - 26, sy + 6, 52, 5), d);
      break;
    }
    case "home": {
      el("slit", place(cx - 24, EDGE + 34, 48, 6), d);
      el("lens", place(cx - 52, EDGE + 31, 11, 11), d);
      el("home-btn", place(cx - 25, sy + device.h + 11, 50, 50), d);
      break;
    }
    case "punch":
    case "fold": {
      el("lens", { ...place(cx - 6, sy + 10, 12, 12), zIndex: 2 }, d);
      break;
    }
    case "tablet":
    case "surface": {
      el("lens", place(cx - 4, EDGE + (BEZEL[device.style][0] - 8) / 2, 8, 8), d);
      break;
    }
  }

  // Side buttons, in portrait coordinates relative to the outer frame.
  const tall = device.h + BEZEL[device.style][0] + BEZEL[device.style][2] + EDGE * 2;
  const wide = device.w + BEZEL[device.style][1] + BEZEL[device.style][3] + EDGE * 2;
  const btn = (side, at, len) => {
    const t = 4;
    if (side === "left") el("side-btn", { ...place(-t + 1, at, t, len), borderRadius: "2px" }, d);
    if (side === "right") el("side-btn", { ...place(wide - 1, at, t, len), borderRadius: "2px" }, d);
    if (side === "top") el("side-btn", { ...place(at, -t + 1, len, t), borderRadius: "2px" }, d);
  };
  if (device.ua === "ios") {
    if (device.style === "home") {
      btn("left", 120, 26);
      btn("left", 175, 46);
      btn("left", 235, 46);
      btn("right", 175, 62);
    } else {
      btn("left", tall * 0.19, 28);
      btn("left", tall * 0.27, 56);
      btn("left", tall * 0.35, 56);
      btn("right", tall * 0.3, 90);
    }
  } else if (device.ua === "android") {
    btn("right", tall * 0.22, 80);
    btn("right", tall * 0.36, 52);
  } else {
    // Tablets: power on the top edge, volume on the right.
    btn("top", wide - 90, 54);
    btn("right", 70, 46);
    btn("right", 126, 46);
  }

  return screen;
}

// ---------- Page in the screen ----------

function buildFrame(screen) {
  const iframe = document.createElement("iframe");
  // The site can't see this page, so the device settings travel in the
  // frame's name; inject.js reads them before the site's own scripts run.
  iframe.name = "wsc:" + JSON.stringify({
    ua: device.ua ? UA[device.ua] : null,
    platform: device.ua ? PLATFORM[device.ua] : null,
    touch: !!device.ua,
    mobile: device.ua === "ios" || device.ua === "android",
    dpr: device.dpr,
  });
  iframe.allow = "clipboard-read; clipboard-write; fullscreen; geolocation; camera; microphone; autoplay";
  iframe.src = currentUrl;
  screen.appendChild(iframe);
  return iframe;
}

function fitToWindow() {
  const stage = document.getElementById("stage");
  const cs = getComputedStyle(stage);
  const aw = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const ah = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const s = Math.min(1, aw / FW, ah / FH);
  const fit = document.getElementById("fit");
  fit.style.width = px(FW * s);
  fit.style.height = px(FH * s);
  document.getElementById("device").style.transform = `scale(${s})`;
  document.getElementById("size").textContent =
    `${W} × ${H}` + (s < 1 ? ` · shown at ${Math.round(s * 100)}%` : "");
}

// ---------- Toolbar ----------

let tabId = null;

function saveUrl() {
  if (hasChrome && tabId != null) chrome.storage.session.set({ [`frameurl_${tabId}`]: currentUrl });
}

function go(o) {
  const p = new URLSearchParams({ g: group, i: params.get("i") || "0", o, u: currentUrl });
  location.replace(`frame.html?${p}`);
}

async function init() {
  document.getElementById("name").textContent = device.name;
  document.getElementById("colorName").textContent = device.color;
  document.getElementById("swatch").style.background = device.hex;
  document.getElementById("rotateLabel").textContent = landscape ? "Vertical" : "Horizontal";

  const screen = buildDevice();
  const iframe = buildFrame(screen);
  fitToWindow();
  window.addEventListener("resize", fitToWindow);

  if (hasChrome) {
    const tab = await chrome.tabs.getCurrent();
    tabId = tab?.id ?? null;
    saveUrl();
  }

  // inject.js reports the page's address as the user clicks around.
  window.addEventListener("message", (e) => {
    if (e.source !== iframe.contentWindow || e.data?.wsc !== "url") return;
    currentUrl = String(e.data.href);
    document.title = `${device.name} · ${e.data.title || new URL(currentUrl).hostname}`;
    saveUrl();
  });

  document.getElementById("rotate").onclick = () => {
    const o = landscape ? "portrait" : "landscape";
    if (hasChrome) chrome.storage.local.set({ orientation: o });
    go(o);
  };
  document.getElementById("reload").onclick = () => {
    iframe.src = currentUrl;
  };
  document.getElementById("exit").onclick = () => {
    location.href = currentUrl;
  };
}

init();
