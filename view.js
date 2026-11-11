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

const iframe = document.getElementById("page");
const box = document.getElementById("box");

// The site can't see this page, so the device settings travel in the frame's
// name; inject.js reads them before the site's own scripts run.
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

// Foldables shown unfolded: draw the hinge across the middle of the page.
const hinge = +params.get("hinge") || 0;
if (hinge) {
  const bar = document.createElement("div");
  bar.className = "hinge";
  if (params.get("hd") === "h") {
    bar.style.cssText = `left:0;right:0;top:${((H - hinge) / 2 / H) * 100}%;height:${(hinge / H) * 100}%;` +
      "background:linear-gradient(180deg,#1b1b1d,#3a3a3e 50%,#1b1b1d)";
  } else {
    bar.style.cssText = `top:0;bottom:0;left:${((W - hinge) / 2 / W) * 100}%;width:${(hinge / W) * 100}%`;
  }
  box.appendChild(bar);
}

// Fit inside the tab: shrink when bigger, never enlarge.
function fit() {
  const stage = document.getElementById("stage");
  const cs = getComputedStyle(stage);
  const aw = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const ah = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const s = Math.min(1, aw / W, ah / H);
  box.style.width = `${W * s}px`;
  box.style.height = `${H * s}px`;
  iframe.style.transform = s < 1 ? `scale(${s})` : "";
}
fit();
window.addEventListener("resize", fit);

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
