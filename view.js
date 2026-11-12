/* global UA, PLATFORM */
// Shows a page at an exact viewport size, centered in the tab.
// URL: view.html?w=402&h=874&ua=ios&dpr=3&u=<page url>

const params = new URLSearchParams(location.search);
const W = Math.max(200, +params.get("w") || 1024);
const H = Math.max(200, +params.get("h") || 768);
const uaKey = params.get("ua") || "";
const dpr = +params.get("dpr") || 0;
let currentUrl = params.get("u") || "about:blank";
const hasChrome = typeof chrome !== "undefined" && !!chrome.tabs;

const box = document.getElementById("box");

// The site can't see this page, so the device settings travel in the frame's
// name; inject.js reads them before the site's own scripts run. The frame is
// created here with its name already set: renaming an existing frame doesn't
// reach a page from another site.
const iframe = document.createElement("iframe");
iframe.id = "page";
iframe.title = "Page at the selected size";
iframe.name = "wsc:" + JSON.stringify({
  ua: uaKey && typeof UA !== "undefined" ? UA[uaKey] : null,
  platform: uaKey && typeof PLATFORM !== "undefined" ? PLATFORM[uaKey] : null,
  touch: !!uaKey,
  mobile: uaKey === "ios" || uaKey === "android",
  dpr,
});
iframe.allow = "clipboard-read; clipboard-write; fullscreen; geolocation; camera; microphone; autoplay";
iframe.style.width = `${W}px`;
iframe.style.height = `${H}px`;
iframe.src = currentUrl;

// Always shown at exactly 100%: the screen is the size the popup says.
// When it's bigger than the window, the view scrolls around it instead.
box.style.width = `${W}px`;
box.style.height = `${H}px`;

// ---------- Device frame (phones, tablets, foldables) ----------
// Drawn around the screen; never changes the screen's size.
const FRAMES = {
  // bezel insets in portrait [top, right, bottom, left], screen corner radius
  island: { bezel: [12, 12, 12, 12], r: 52 },
  notch: { bezel: [12, 12, 12, 12], r: 44 },
  home: { bezel: [74, 16, 74, 16], r: 0 },
  punch: { bezel: [11, 10, 13, 10], r: 32 },
  fold: { bezel: [10, 10, 10, 10], r: 18 },
  tablet: { bezel: [24, 24, 24, 24], r: 18 },
  surface: { bezel: [28, 28, 28, 28], r: 6 },
  duo: { bezel: [14, 14, 14, 14], r: 22 },
};
const frameStyle = FRAMES[params.get("f")] ? params.get("f") : "";
if (frameStyle) buildFrame(frameStyle, params.get("o") === "l");
// Load the page only once everything around it is in place (moving a frame
// in the page would load it twice).
box.appendChild(iframe);

function buildFrame(style, landscape) {
  const spec = FRAMES[style];
  const E = 5; // metal edge
  // Portrait screen size, and insets turned with the device (rotated left).
  const pw = landscape ? H : W;
  const ph = landscape ? W : H;
  const [pt, pr, pb, pl] = spec.bezel;
  const [bt, br, bb, bl] = landscape ? [pr, pb, pl, pt] : [pt, pr, pb, pl];
  const FW = W + bl + br + E * 2;
  const FH = H + bt + bb + E * 2;
  const bezelR = style === "home" ? 54 : spec.r + Math.min(pt, pl);

  const device = document.createElement("div");
  device.id = "device";
  device.style.cssText = `width:${FW}px;height:${FH}px;border-radius:${bezelR + E}px`;
  box.replaceWith(device);
  const bezel = document.createElement("div");
  bezel.className = "bezel";
  bezel.style.cssText = `inset:${E}px;border-radius:${bezelR}px`;
  device.append(bezel, box);
  box.style.position = "absolute";
  box.style.left = `${E + bl}px`;
  box.style.top = `${E + bt}px`;
  box.style.borderRadius = `${spec.r}px`;
  box.style.boxShadow = "none";
  document.body.classList.add("framed");

  // Portrait coordinates → current orientation (device turned to the left).
  const PW = pw + pl + pr + E * 2;
  const place = (x, y, w, h) =>
    landscape ? { left: y, top: PW - x - w, width: h, height: w } : { left: x, top: y, width: w, height: h };
  const add = (cls, x, y, w, h, extra = "") => {
    const r = place(x, y, w, h);
    const el = document.createElement("div");
    el.className = cls;
    el.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;${extra}`;
    device.appendChild(el);
    return el;
  };

  const sx = E + pl; // screen left (portrait)
  const sy = E + pt; // screen top (portrait)
  const cx = sx + pw / 2;
  const PH = ph + pt + pb + E * 2;

  switch (style) {
    case "island":
      add("cutout", cx - 62, sy + 11, 124, 36, "border-radius:20px");
      add("lens", cx + 34, sy + 22, 13, 13, "z-index:3");
      break;
    case "notch": {
      const nw = Math.round(pw * 0.41);
      add("cutout", cx - nw / 2, sy - 1, nw, 32, `border-radius:${landscape ? "0 22px 22px 0" : "0 0 22px 22px"}`);
      add("slit", cx - 26, sy + 7, 52, 5);
      add("lens", cx + 34, sy + 9, 10, 10, "z-index:3");
      break;
    }
    case "home":
      add("slit", cx - 24, E + 36, 48, 6);
      add("lens", cx - 52, E + 33, 11, 11);
      add("home-btn", cx - 26, sy + ph + 11, 52, 52);
      break;
    case "punch":
    case "fold":
      add("lens", cx - 7, sy + 10, 14, 14, "z-index:3");
      break;
    case "tablet":
    case "surface":
      add("lens", cx - 4, E + (pt - 8) / 2, 8, 8);
      break;
    case "duo":
      add("lens", sx + pw - 26, E + (pt - 8) / 2, 8, 8);
      break;
  }

  // Side buttons in the edge color.
  const btn = (side, at, len) => {
    if (side === "left") add("side-btn", -3, at, 4, len);
    if (side === "right") add("side-btn", PW - 1, at, 4, len);
    if (side === "top") add("side-btn", at, -3, len, 4);
  };
  if (["island", "notch", "home"].includes(style)) {
    btn("left", PH * 0.17, 28);
    btn("left", PH * 0.25, 56);
    btn("left", PH * 0.33, 56);
    btn("right", PH * 0.28, 88);
  } else if (style === "punch" || style === "fold") {
    btn("right", PH * 0.22, 80);
    btn("right", PH * 0.36, 52);
  } else if (style === "duo") {
    btn("right", PH * 0.2, 60);
  } else {
    btn("top", PW - 100, 56);
    btn("right", 80, 48);
    btn("right", 138, 48);
  }
}

// Background: a softer version of the site's own color.
//   white → off-white, black → gray, red → soft red.
function shadeOf(color) {
  const m = String(color).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  if ([r, g, b].some((n) => !Number.isFinite(n))) return null;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  let f;
  if (lum > 0.88) f = (c) => c * 0.95; // very light: a touch darker (off-white)
  else if (lum < 0.25) f = (c) => c + (255 - c) * 0.16; // dark: lighter (gray)
  else f = (c) => c + (255 - c) * 0.35; // colors: mixed with white (soft)
  const out = [r, g, b].map((c) => Math.round(f(c)));
  const outLum = (0.299 * out[0] + 0.587 * out[1] + 0.114 * out[2]) / 255;
  return { css: `rgb(${out.join(", ")})`, dark: outLum < 0.5 };
}
function applyBackground(color) {
  const s = shadeOf(color) || shadeOf("rgb(255, 255, 255)");
  document.body.style.backgroundColor = s.css;
  document.body.classList.toggle("dark", s.dark);
}
applyBackground(params.get("bg") || "rgb(255, 255, 255)");

let tabId = null;
function saveUrl() {
  if (hasChrome && tabId != null) chrome.storage.session.set({ [`viewurl_${tabId}`]: currentUrl });
}
if (hasChrome) {
  chrome.tabs.getCurrent().then((t) => {
    tabId = t?.id ?? null;
    saveUrl();
  });
}

window.addEventListener("message", (e) => {
  if (e.source !== iframe.contentWindow) return;
  if (e.data?.wsc === "url") {
    currentUrl = String(e.data.href);
    if (e.data.title) document.title = e.data.title;
    saveUrl();
  }
});
