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

  // The page's background color, so the view can use a nearby shade around it.
  const reportBg = () => {
    const clear = (c) => !c || c === "transparent" || /rgba\([^)]*,\s*0\)$/.test(c);
    let c = document.body && getComputedStyle(document.body).backgroundColor;
    if (clear(c)) c = document.documentElement && getComputedStyle(document.documentElement).backgroundColor;
    if (clear(c)) c = "rgb(255, 255, 255)";
    post({ wsc: "bg", color: c });
  };

  reportUrl();
  document.addEventListener("DOMContentLoaded", () => {
    reportUrl();
    reportBg();
  });
  window.addEventListener("load", () => {
    reportUrl();
    reportBg();
    setTimeout(reportBg, 1000);
  });
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
