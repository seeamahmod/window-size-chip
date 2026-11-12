<img width="1080" height="1350" alt="Poster 1080×1350@1x" src="https://github.com/user-attachments/assets/a6aaab58-1943-41b0-abca-bdb5355c7415" />

# Window Size Chip

A Chrome extension that shows the live size of your browser window and switches
it to common screen sizes in one click.

## Features

- **Toolbar badge**: the viewport width (the space the page gets) shows on the extension icon and updates
  live while you drag the window edge.
- **Popup**: click the icon to see the exact viewport `W × H`, with the full window size beside it.
- **Size presets** (click the toolbar icon):
  - **Desktop**: 2560, 1920, 1600, 1536, 1440, 1366, 1280, 1200. The real window
    is resized so the page's viewport is exactly that wide. If your screen is too
    narrow for that size, it's shown at full size and you scroll to see the rest.
  - **Tablet and mobile**: iPhone SE through iPhone 18 Pro Max (including iPhone Air), Galaxy, Pixel,
    Galaxy Fold, iPad Mini/Air/Pro, Galaxy Tab, Surface Pro. The page is shown
    at the device's exact viewport, centered in the tab on a shade just lighter
    or darker than the site's own background, with the device's mobile user
    agent and pixel density, inside a frame of that kind of device (Dynamic
    Island, notch, home button, punch-hole camera, tablet or Surface Duo), with
    a live status bar at the top and the page starting below it, as on the device.
    iPhones use the iOS 27 look: Safari 27 identity, the Liquid Glass address bar
    and the home indicator.
    Always shown at 100% with no scrollbar taking width;
    if it's bigger than your window, scroll to see the rest.
  - **Foldable**: Surface Duo, folded (540 × 720) or unfolded across both
    screens (1114 × 720).
  - **Vertical / Horizontal**: turn phones, tablets and foldables on their side.
  - **Custom**: type a width (and optionally a height).
  - **Reset** goes back to the normal page.

A few sites refuse to be shown inside another page; those may stay blank at
phone and tablet sizes.

## Supported systems

Works in desktop Chrome on **Windows, macOS, Linux (Ubuntu, Fedora, Debian and
others) and ChromeOS**, and in other Chromium browsers that run Chrome
extensions, such as Microsoft Edge, Brave, Opera and Vivaldi.

On a phone or tablet (iPhone, iPad, Android), Chrome doesn't run extensions at
all, so it can't be installed there. Use the phone and tablet sizes on your
computer instead.

## Install (unpacked)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick this folder.
4. Pin the extension (puzzle icon → pin) so it stays in the toolbar.

The presets don't work on `chrome://` pages or the Chrome Web Store;
Chrome blocks extensions there.

## License

MIT

## Privacy

The extension collects no data. See the [Privacy Policy](PRIVACY.md).
