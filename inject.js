// Runs in the page's own JavaScript world, before its scripts. Does nothing
// unless the page is the site shown inside the extension's sized view.
(() => {
  let cfg;
  try {
    if (!window.name || !window.name.startsWith("wsc:")) return;
    const anc = location.ancestorOrigins;
    if (!anc || anc.length !== 1 || !anc[0].startsWith("chrome-extension://")) return;
    cfg = JSON.parse(window.name.slice(4));
  } catch {
    return;
  }

  const def = (obj, key, value) => {
    try {
      Object.defineProperty(obj, key, { get: () => value, configurable: true });
    } catch {
      /* not configurable */
    }
  };

  if (cfg.ua) {
    const apple = /iP(hone|ad)/.test(cfg.ua);
    def(Navigator.prototype, "userAgent", cfg.ua);
    def(Navigator.prototype, "appVersion", cfg.ua.replace(/^Mozilla\//, ""));
    def(Navigator.prototype, "platform", cfg.platform || "");
    def(Navigator.prototype, "vendor", apple ? "Apple Computer, Inc." : "Google Inc.");
    def(
      Navigator.prototype,
      "userAgentData",
      apple
        ? undefined
        : {
            brands: [{ brand: "Chromium", version: "138" }, { brand: "Google Chrome", version: "138" }],
            mobile: !!cfg.mobile,
            platform: "Android",
            getHighEntropyValues: async () => ({ platform: "Android", mobile: !!cfg.mobile }),
            toJSON() {
              return { brands: this.brands, mobile: this.mobile, platform: this.platform };
            },
          }
    );
  }
  if (cfg.touch) {
    def(Navigator.prototype, "maxTouchPoints", 5);
    if (!("ontouchstart" in window)) window.ontouchstart = null;
  }

  // Hide scrollbars at every emulated size, so the page gets exactly the width
  // the popup shows (a scrollbar would take ~15-20px). Scrolling still works.
  const style = document.createElement("style");
  style.textContent =
    "html{scrollbar-width:none!important}" +
    "::-webkit-scrollbar{width:0!important;height:0!important;display:none!important}";
  (document.head || document.documentElement).appendChild(style);
  if (cfg.dpr) def(window, "devicePixelRatio", cfg.dpr);

  const post = (msg) => {
    try {
      window.parent.postMessage(msg, "*");
    } catch {
      /* ignore */
    }
  };

  // Where we are, so Reset returns to the same page.
  const reportUrl = () => post({ wsc: "url", href: location.href, title: document.title });

  reportUrl();
  document.addEventListener("DOMContentLoaded", reportUrl);
  window.addEventListener("load", reportUrl);
  window.addEventListener("popstate", reportUrl);
  window.addEventListener("hashchange", reportUrl);
  for (const m of ["pushState", "replaceState"]) {
    const orig = history[m];
    history[m] = function (...args) {
      const r = orig.apply(this, args);
      setTimeout(reportUrl, 0);
      return r;
    };
  }
})();
