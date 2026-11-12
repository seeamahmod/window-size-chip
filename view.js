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
const landscapeView = params.get("o") === "l";
if (frameStyle) buildFrame(frameStyle, landscapeView);

// ---------- Status bar ----------
// Like the real device: time and icons at the top, in the page's own color,
// and the page starts below it.
const SB = frameStyle && typeof statusBarHeight === "function" ? statusBarHeight(frameStyle, landscapeView) : 0;
if (SB) {
  iframe.style.top = `${SB}px`;
  iframe.style.height = `${H - SB}px`;
  box.appendChild(buildStatusBar(frameStyle, SB));
}

// Load the page only once everything around it is in place (moving a frame
// in the page would load it twice).
box.appendChild(iframe);

function buildStatusBar(style, height) {
  const bar = document.createElement("div");
  bar.className = `statusbar sb-${style}`;
  bar.style.height = `${height}px`;
  // Page color from the screenshot, with readable text on top.
  const m = String(params.get("bg") || "").match(/(\d+)\D+(\d+)\D+(\d+)/);
  const [r, g, b] = m ? m.slice(1).map(Number) : [255, 255, 255];
  bar.style.background = `rgb(${r}, ${g}, ${b})`;
  bar.style.color = (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#000" : "#fff";

  const apple = uaKey === "ios" || uaKey === "ipad";
  const time = document.createElement("span");
  time.className = "sb-time";
  const tick = () => {
    const d = new Date();
    const hm = `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}`;
    time.textContent =
      uaKey === "ipad"
        ? `${hm}  ${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`
        : hm;
  };
  tick();
  setInterval(tick, 20000);

  const icons = document.createElement("span");
  icons.className = "sb-icons";
  const signal = `<svg viewBox="0 0 18 12" width="18" height="12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>`;
  const wifi = `<svg viewBox="0 0 16 12" width="16" height="12" fill="currentColor"><path d="M8 2.2c2.3 0 4.4.9 6 2.4l1.2-1.3A10.3 10.3 0 0 0 8 .4C5.2.4 2.7 1.5.8 3.3L2 4.6a8.5 8.5 0 0 1 6-2.4Zm0 3.6c1.3 0 2.5.5 3.4 1.3l1.2-1.3A6.7 6.7 0 0 0 8 4a6.7 6.7 0 0 0-4.6 1.8l1.2 1.3c.9-.8 2.1-1.3 3.4-1.3Zm0 3.5c-.6 0-1.1.2-1.5.6L8 11.6l1.5-1.7c-.4-.4-.9-.6-1.5-.6Z"/></svg>`;
  const battery = apple
    ? `<svg viewBox="0 0 27 13" width="27" height="13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2" fill="currentColor"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" fill="currentColor" opacity=".4"/></svg>`
    : `<svg viewBox="0 0 9 15" width="8" height="14" fill="currentColor"><path d="M3 0h3v1.5h1.5C8.3 1.5 9 2.2 9 3v10.5c0 .8-.7 1.5-1.5 1.5h-6C.7 15 0 14.3 0 13.5V3c0-.8.7-1.5 1.5-1.5H3Z"/></svg>`;
  icons.innerHTML = apple ? `${signal}${wifi}${battery}` : `${wifi}${signal}${battery}<b>100%</b>`;

  if (style === "island" || style === "notch") {
    // iPhone: time and icons sit in the "ears" either side of the cutout.
    const cut = style === "island" ? 124 : Math.round(W * 0.41);
    const ear = (W - cut) / 2;
    bar.style.gridTemplateColumns = `${ear}px ${cut}px ${ear}px`;
    bar.classList.add("ears");
    bar.append(time, document.createElement("span"), icons);
  } else if (style === "home") {
    // Classic iPhone: signal left, time centered, battery right.
    const left = document.createElement("span");
    left.className = "sb-icons";
    left.innerHTML = signal + wifi;
    const right = document.createElement("span");
    right.className = "sb-icons";
    right.innerHTML = `<b>100%</b>${battery}`;
    bar.classList.add("classic");
    bar.append(left, time, right);
  } else {
    bar.append(time, icons);
  }
  return bar;
}

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
