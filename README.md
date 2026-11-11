# Window Size Chip

A Chrome extension that shows the live size of your browser window and switches
it to common screen sizes in one click.

## Features

- **On-page chip**: a floating pill in the corner of each page shows the window
  `W × H` plus the `viewport W × H`, updating live while you drag the window edge.
  Click the chip to move it to another corner.
- **Toolbar badge**: the window width shows on the extension icon.
- **Size presets** (click the toolbar icon):
  - **Desktop**: 1920, 1600, 1536, 1440, 1366, 1280, 1200, 1024. The real window
    is resized so the page's viewport is exactly that wide. If your screen is too
    narrow for that size, it's emulated and scaled down to fit.
  - **Tablet and mobile**: iPhone SE through iPhone 16 Pro Max, Galaxy, Pixel,
    Galaxy Fold, iPad Mini/Air/Pro, Galaxy Tab, Surface Pro. These are emulated
    on the current tab (exact viewport, pixel density, touch and mobile user
    agent), since Chrome won't shrink a real window that small.
  - **Custom**: type a width (and optionally a height).
  - **Reset** ends emulation on the tab.
- Toggle the on-page chip on or off from the popup.

While a tablet or mobile size is active, Chrome shows a "Window Size Chip started
debugging this browser" bar. That's how extensions emulate devices; press
**Reset** (or **Cancel** on the bar) to end it.

## Install (unpacked)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick this folder.
4. Pin the extension (puzzle icon → pin) so it stays in the toolbar.

The chip and presets don't work on `chrome://` pages or the Chrome Web Store;
Chrome blocks extensions there.

## License

MIT
