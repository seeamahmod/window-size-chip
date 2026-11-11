// No on-page UI: this script only reports the page's live sizes to the
// extension (for the toolbar badge and the popup).
(() => {
  if (window.top !== window || window.__windowSizeChip) return;
  window.__windowSizeChip = true;

  let lastSent = "";
  function report() {
    const key = `${window.outerWidth}x${window.outerHeight}`;
    if (key === lastSent) return;
    lastSent = key;
    try {
      chrome.runtime.sendMessage({
        type: "resized",
        width: window.outerWidth,
        height: window.outerHeight,
      });
    } catch {
      /* extension reloaded */
    }
  }

  // Update on every resize event so the badge follows the drag live.
  window.addEventListener("resize", report);
  // Some drags (left/top edge) don't fire resize every frame; poll while visible.
  setInterval(() => {
    if (!document.hidden) report();
  }, 50);

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
})();
