<img width="1080" height="1350" alt="Poster 1080×1350@1x" src="https://github.com/user-attachments/assets/f77bde0b-8122-46fc-80cc-a3086616187f" />
# Window Size Chip

A Chrome extension that shows the live size of your browser window and switches
it to common screen sizes in one click.

## Features

- **Toolbar badge**: the window width shows on the extension icon and updates
  live while you drag the window edge.
- **Popup**: click the icon to see the exact window and viewport `W × H`.
- **Size presets** (click the toolbar icon):
  - **Desktop**: 1920, 1600, 1536, 1440, 1366, 1280, 1200, 1024. The real window
    is resized so the page's viewport is exactly that wide. If your screen is too
    narrow for that size, it's emulated and scaled down to fit.
  - **Tablet and mobile**: 20 phones (iPhone SE to iPhone 17 Pro Max, Galaxy,
    Pixel, Galaxy Fold) and 8 tablets (iPad mini/Air/Pro, Galaxy Tab, Surface
    Pro). The page opens inside a drawn device frame in that device's own
    finish, for example iPhone 17 Pro in Cosmic Orange, at the device's exact
    viewport size, with its mobile user agent and pixel density.
  - **Vertical / Horizontal**: turn phones and tablets on their side, from the
    popup or the bar above the device.
  - **Custom**: type a width (and optionally a height).
  - **Reset** (or **Exit** above the device) goes back to the normal page.

Desktop sizes use the real window, so they have no device frame. If your screen
is too narrow for a desktop size or a custom size, Chrome shows a "Window Size
Chip started debugging this browser" bar while it's emulated; press **Reset**
to end it.

## Install (unpacked)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick this folder.
4. Pin the extension (puzzle icon → pin) so it stays in the toolbar.

The presets don't work on `chrome://` pages or the Chrome Web Store;
Chrome blocks extensions there.

## License

MIT
