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

  // The device's screen, not the computer's monitor. Mobile sites (Facebook's
  // among them) size their layout from these.
  if (cfg.sw && cfg.sh) {
    const S = Screen.prototype;
    for (const k of ["width", "availWidth"]) def(S, k, cfg.sw);
    for (const k of ["height", "availHeight"]) def(S, k, cfg.sh);
    for (const k of ["availLeft", "availTop"]) def(S, k, 0);
    def(window, "screenX", 0);
    def(window, "screenY", 0);
    def(window, "screenLeft", 0);
    def(window, "screenTop", 0);
    def(window, "outerWidth", cfg.sw);
    def(window, "outerHeight", cfg.sh);
    try {
      const o = screen.orientation;
      if (o) {
        def(Object.getPrototypeOf(o), "type", cfg.land ? "landscape-primary" : "portrait-primary");
        def(Object.getPrototypeOf(o), "angle", cfg.land ? 90 : 0);
      }
    } catch {
      /* ignore */
    }
    if (cfg.touch) def(window, "orientation", cfg.land ? 90 : 0);

    // Media queries asked from script: a touch screen of the device's size.
    const W = cfg.sw, H = cfg.sh;
    const yes = "(min-width: 0px)", no = "(max-width: -1px)";
    const devCmp = (feat, op, val) => {
      const v = feat === "width" ? W : feat === "height" ? H : W / H;
      const n = parseFloat(val);
      return (op === "min" ? v >= n : op === "max" ? v <= n : v === n) ? yes : no;
    };
    const rewrite = (q) => {
      q = String(q).replace(/\(\s*(min-|max-)?device-(width|height)\s*:\s*([\d.]+)px\s*\)/gi, (_, op, feat, val) =>
        devCmp(feat.toLowerCase(), (op || "").replace("-", "").toLowerCase(), val));
      if (cfg.touch) {
        q = q
          .replace(/\(\s*(any-)?pointer\s*:\s*coarse\s*\)/gi, yes)
          .replace(/\(\s*(any-)?pointer\s*:\s*fine\s*\)/gi, no)
          .replace(/\(\s*(any-)?hover\s*:\s*none\s*\)/gi, yes)
          .replace(/\(\s*(any-)?hover\s*:\s*hover\s*\)/gi, no)
          .replace(/\(\s*(any-)?(pointer|hover)\s*\)/gi, (_, any, f) => (f.toLowerCase() === "pointer" ? yes : no));
      }
      return q;
    };
    const mm = window.matchMedia;
    const wrapped = function matchMedia(q) {
      const r = mm.call(window, rewrite(q));
      try {
        Object.defineProperty(r, "media", { value: String(q) });
      } catch {
        /* ignore */
      }
      return r;
    };
    try {
      Object.defineProperty(wrapped, "toString", { value: () => "function matchMedia() { [native code] }" });
    } catch {
      /* ignore */
    }
    window.matchMedia = wrapped;
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
