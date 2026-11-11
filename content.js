// No on-page UI: reports the window size to the extension (toolbar badge and
// popup). Does no work until the window is resized or the popup asks.
(() => {
  // Each install or update of the extension runs its own copy; a copy left
  // over from an older version just stops responding.
  if (window.top !== window) return;
  const token = `${chrome.runtime.id}@${chrome.runtime.getManifest().version}`;
  if (window.__windowSizeChip === token) return;
  window.__windowSizeChip = token;

  let last = "";
  let queued = false;

  // At most one message per frame while the window is being dragged.
  function report() {
    queued = false;
    const w = window.outerWidth;
    const h = window.outerHeight;
    const key = `${w}x${h}`;
    if (key === last) return;
    last = key;
    try {
      chrome.runtime.sendMessage({ type: "resized", width: w, height: h });
    } catch {
      /* extension was reloaded; this copy is stale */
    }
  }

  window.addEventListener(
    "resize",
    () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(report);
      }
    },
    { passive: true }
  );

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
