# Chrome Web Store listing

Copy each part into the matching field of the Chrome Web Store Developer Dashboard.

## Store listing tab

**Name**
Window Size Chip

**Summary** (from the manifest, 113 characters)
See your exact window and viewport size live, and switch any page to desktop, tablet or phone sizes in one click.

**Category**
Developer Tools

**Language**
English

**Description**

```
Know your exact screen size. Switch it in one click.

Window Size Chip is made for designers and developers who test responsive layouts all day.

Most resizer tools change the window. But your CSS breakpoints care about the viewport, the part that actually shows your page. Borders, scrollbars and zoom eat into it, so you pick 1440 and end up testing at 1423 without knowing it. Window Size Chip measures the viewport and adjusts until it's exact.

LIVE SIZE
• The viewport width shows right on the toolbar icon and updates while you drag the window edge.
• Click the icon to see the exact viewport width × height, with the full window size beside it.

EXACT DESKTOP WIDTHS
• 2560, 1920, 1600, 1536, 1440, 1366, 1280 and 1200.
• The page lands on the exact pixel width you pick, accounting for borders, scrollbars and page zoom.

PHONES AND TABLETS IN ONE CLICK
• iPhone SE to iPhone 18 Pro Max (including iPhone Air), Galaxy S8 to S24 Ultra, Pixel, Galaxy Z Fold, iPad Mini, Air and Pro, Galaxy Tab and Surface Pro.
• Shown inside a device frame (Dynamic Island, notch, home button, punch-hole camera, tablet or Surface Duo) at the exact viewport size, with its mobile browser identity, so sites serve their real phone or tablet layout.
• Foldable: Surface Duo, folded or unfolded across both screens.
• Turn devices on their side with Vertical / Horizontal.
• No DevTools needed.

CUSTOM SIZES
• Type any width, and optionally a height.

LIGHT AND PRIVATE
• No data collected, no ads, no tracking, no account.
• Does nothing in the background until you resize the window or open it.
• Free and open source: https://github.com/seeamahmod/window-size-chip

Works on Windows, macOS, Linux and ChromeOS.
```

**Graphic assets**

| Field | File |
|---|---|
| Store icon (128×128) | `icons/icon128.png` |
| Screenshots (1280×800) | `store/screenshot-1.png`, `store/screenshot-2.png`, `store/screenshot-3.png` |
| Small promo tile (440×280) | `store/promo-small.png` |

**Additional fields**

| Field | Value |
|---|---|
| Official URL | (leave empty unless you own a verified site) |
| Homepage URL | https://github.com/seeamahmod/window-size-chip |
| Support URL | https://github.com/seeamahmod/window-size-chip/issues |

## Privacy practices tab

**Single purpose**

```
Shows the browser's current window and viewport size, and lets the user view the current page at preset or custom screen sizes (desktop, tablet and phone) for testing responsive layouts.
```

**Permission justifications**

| Permission | Justification |
|---|---|
| tabs | Reads the active tab's URL and window so it can resize the window to the chosen size and show the page at tablet and phone sizes. |
| storage | Saves the user's Vertical / Horizontal preference and, for the current session only, the page being viewed at a tablet or phone size so Reset can return to it. |
| scripting | Loads a small helper into pages only while a tablet or phone size is showing (to apply that device's browser identity), and loads the size-reporting script into tabs that were already open when the extension is installed or updated. |
| declarativeNetRequestWithHostAccess | For the single tab showing a tablet or phone size only: sets that device's User-Agent header and removes frame-blocking headers so the page can be displayed inside the extension's sized view. The rules are removed as soon as the user resets or leaves. |
| Host permission (all sites) | Needed on whatever site the user is testing: to measure the page's viewport, capture the visible tab once to pick a matching background color (never stored or sent), and display the page at the chosen tablet or phone size. |

**Remote code**
No, I am not using remote code.

**Data usage**
Tick nothing in the list of data types. Then tick all three certifications:
- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL**
https://github.com/seeamahmod/window-size-chip/blob/main/PRIVACY.md

## Distribution tab

- Visibility: **Public**
- Regions: **All regions**
- Pricing: **Free**
