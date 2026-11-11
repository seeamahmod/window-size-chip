// Keeps the toolbar icon's badge + tooltip in sync with the window size,
// and lets the toolbar button toggle the in-page chip on/off.

function drawIcon(size) {
  const c = new OffscreenCanvas(size, size);
  const g = c.getContext("2d");
  const s = size / 16;
  g.fillStyle = "#1f6f4a";
  g.beginPath();
  g.roundRect(0, 0, size, size, 3 * s);
  g.fill();
  // A little "resize frame" glyph
  g.strokeStyle = "#ffffff";
  g.lineWidth = 1.5 * s;
  g.strokeRect(3.5 * s, 3.5 * s, 9 * s, 9 * s);
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.moveTo(12.5 * s, 8 * s);
  g.lineTo(12.5 * s, 12.5 * s);
  g.lineTo(8 * s, 12.5 * s);
  g.closePath();
  g.fill();
  return g.getImageData(0, 0, size, size);
}

function setIcon() {
  chrome.action.setIcon({
    imageData: { 16: drawIcon(16), 32: drawIcon(32), 48: drawIcon(48) },
  });
  chrome.action.setBadgeBackgroundColor({ color: "#1f6f4a" });
  chrome.action.setBadgeTextColor?.({ color: "#ffffff" });
}

async function updateBadge(windowId) {
  try {
    const win =
      windowId == null
        ? await chrome.windows.getLastFocused()
        : await chrome.windows.get(windowId);
    if (!win || win.width == null) return;
    // Badge fits ~4 characters, so it shows the width; tooltip shows both.
    chrome.action.setBadgeText({ text: String(win.width) });
    chrome.action.setTitle({
      title: `Window: ${win.width} × ${win.height}\nClick to show/hide the on-page chip`,
    });
  } catch {
    /* window closed mid-update */
  }
}

chrome.runtime.onInstalled.addListener(() => {
  setIcon();
  updateBadge();
});
chrome.runtime.onStartup.addListener(() => {
  setIcon();
  updateBadge();
});

chrome.windows.onBoundsChanged.addListener((win) => updateBadge(win.id));
chrome.windows.onFocusChanged.addListener((id) => {
  if (id !== chrome.windows.WINDOW_ID_NONE) updateBadge(id);
});

// Content scripts ping on resize too (covers fullscreen/devtools changes).
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type !== "resized" || !sender.tab) return;
  // Use the page's live numbers directly: chrome.windows only reports the
  // final size once the drag ends.
  if (msg.width && msg.height) {
    chrome.action.setBadgeText({ text: String(msg.width) });
    chrome.action.setTitle({
      title: `Window: ${msg.width} × ${msg.height}\nClick to show/hide the on-page chip`,
    });
  } else {
    updateBadge(sender.tab.windowId);
  }
});

// Toolbar click toggles the chip everywhere.
chrome.action.onClicked.addListener(async () => {
  const { chipHidden = false } = await chrome.storage.local.get("chipHidden");
  await chrome.storage.local.set({ chipHidden: !chipHidden });
});

setIcon();
updateBadge();
