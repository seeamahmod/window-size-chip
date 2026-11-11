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

// Background: the site's own color, nudged a little lighter or darker.
function shadeOf(color) {
  const m = String(color).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  if (a === 0) return null;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const dark = lum < 0.5;
  const f = (c) => Math.round(dark ? c + (255 - c) * 0.09 : c * 0.92);
  return { css: `rgb(${f(r)}, ${f(g)}, ${f(b)})`, dark };
}
function applyBackground(color) {
  const s = shadeOf(color) || shadeOf("rgb(255, 255, 255)");
  document.body.style.backgroundColor = s.css;
  document.body.classList.toggle("dark", s.dark);
}

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
  } else if (e.data?.wsc === "bg") {
    applyBackground(e.data.color);
  }
});
