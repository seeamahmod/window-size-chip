// Runs in the page's own JavaScript world, before its scripts. Does nothing
// unless the page is the site inside the extension's device frame.
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
    def(Navigator.prototype, "userAgent", cfg.ua);
    def(Navigator.prototype, "appVersion", cfg.ua.replace(/^Mozilla\//, ""));
    def(Navigator.prototype, "platform", cfg.platform || "");
    def(Navigator.prototype, "vendor", /iP(hone|ad)/.test(cfg.ua) ? "Apple Computer, Inc." : "Google Inc.");
    if (/iP(hone|ad)/.test(cfg.ua)) {
      def(Navigator.prototype, "userAgentData", undefined);
    } else {
      def(Navigator.prototype, "userAgentData", {
        brands: [{ brand: "Chromium", version: "138" }, { brand: "Google Chrome", version: "138" }],
        mobile: !!cfg.mobile,
        platform: "Android",
        getHighEntropyValues: async () => ({ platform: "Android", mobile: !!cfg.mobile }),
        toJSON() {
          return { brands: this.brands, mobile: this.mobile, platform: this.platform };
        },
      });
    }
  }
  if (cfg.touch) {
    def(Navigator.prototype, "maxTouchPoints", 5);
    if (!("ontouchstart" in window)) window.ontouchstart = null;
  }
  if (cfg.dpr) def(window, "devicePixelRatio", cfg.dpr);

  // Tell the frame page where we are, so Exit returns to the same page.
  const report = () => {
    try {
      window.parent.postMessage({ wsc: "url", href: location.href, title: document.title }, "*");
    } catch {
      /* ignore */
    }
  };
  report();
  window.addEventListener("load", report);
  window.addEventListener("popstate", report);
  window.addEventListener("hashchange", report);
  for (const m of ["pushState", "replaceState"]) {
    const orig = history[m];
    history[m] = function (...args) {
      const r = orig.apply(this, args);
      setTimeout(report, 0);
      return r;
    };
  }
})();
