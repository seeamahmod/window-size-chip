// Floating chip that shows the live window size (and viewport size) on every page.
(() => {
  if (window.top !== window || document.getElementById("__window-size-chip")) return;

  const CORNERS = ["top-right", "top-left", "bottom-left", "bottom-right"];

  const host = document.createElement("div");
  host.id = "__window-size-chip";
  const root = host.attachShadow({ mode: "closed" });
  root.innerHTML = `
    <style>
      :host { all: initial; }
      .chip {
        position: fixed; z-index: 2147483647;
        display: inline-flex; align-items: center; gap: 8px;
        padding: 5px 12px 5px 10px;
        border-radius: 999px;
        background: rgba(32, 33, 36, 0.92);
        color: #fff;
        font: 500 12px/1.2 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        font-variant-numeric: tabular-nums;
        box-shadow: 0 2px 10px rgba(0,0,0,.25);
        border: 1px solid rgba(255,255,255,.12);
        cursor: pointer; user-select: none;
        transition: opacity .15s;
      }
      .chip:hover { opacity: .35; }
      .dot { width: 8px; height: 8px; border-radius: 50%; background: #34c77b; }
      .main { font-weight: 600; letter-spacing: .2px; }
      .sub { color: rgba(255,255,255,.6); font-size: 11px; }
      .top-right    { top: 10px;    right: 10px; }
      .top-left     { top: 10px;    left: 10px; }
      .bottom-left  { bottom: 10px; left: 10px; }
      .bottom-right { bottom: 10px; right: 10px; }
      .hidden { display: none; }
    </style>
    <div class="chip top-right" title="Window size (viewport size). Click to move to another corner.">
      <span class="dot"></span>
      <span class="main"></span>
      <span class="sub"></span>
    </div>`;

  const chip = root.querySelector(".chip");
  const main = root.querySelector(".main");
  const sub = root.querySelector(".sub");
  let corner = "top-right";

  function render() {
    main.textContent = `${window.outerWidth} × ${window.outerHeight}`;
    sub.textContent = `viewport ${window.innerWidth} × ${window.innerHeight}`;
  }

  function applyState({ chipHidden = false, chipCorner = "top-right" }) {
    corner = CORNERS.includes(chipCorner) ? chipCorner : "top-right";
    chip.className = `chip ${corner}${chipHidden ? " hidden" : ""}`;
  }

  chip.addEventListener("click", () => {
    const next = CORNERS[(CORNERS.indexOf(corner) + 1) % CORNERS.length];
    chrome.storage.local.set({ chipCorner: next });
  });

  // Update on every resize event (no debouncing) so the numbers follow the drag live.
  let lastSent = "";
  function onResize() {
    render();
    const key = `${window.outerWidth}x${window.outerHeight}`;
    if (key !== lastSent) {
      lastSent = key;
      try {
        chrome.runtime.sendMessage({
          type: "resized",
          width: window.outerWidth,
          height: window.outerHeight,
        });
      } catch {}
    }
  }
  window.addEventListener("resize", onResize);
  // Some resizes (e.g. dragging the window's left/top edge) don't change the
  // viewport in a way that fires "resize" every frame; poll while the tab is visible.
  setInterval(() => {
    if (!document.hidden) onResize();
  }, 50);

  // The popup/background asks for live sizes when applying presets.
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type !== "getSize") return;
    sendResponse({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      screen: {
        availLeft: screen.availLeft ?? 0,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight,
      },
    });
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.chipHidden || changes.chipCorner) {
      chrome.storage.local.get(["chipHidden", "chipCorner"], applyState);
    }
  });

  chrome.storage.local.get(["chipHidden", "chipCorner"], applyState);
  render();
  (document.body || document.documentElement).appendChild(host);
})();
