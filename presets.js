// Size presets shown in the popup. Shared by popup.js, background.js and frame.js.

const UA = {
  ios: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
  ipad: "Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
  android: "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
  androidTab: "Mozilla/5.0 (Linux; Android 15; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
};

const PLATFORM = { ios: "iPhone", ipad: "iPad", android: "Linux armv81", androidTab: "Linux armv81" };

// Desktop presets resize the real window so the page's viewport is exactly this wide.
const DESKTOP = [1920, 1600, 1536, 1440, 1366, 1280, 1200, 1024];

// Phones and tablets open in a device frame. Each device comes in exactly one
// finish, drawn as the frame's edge color.
//   w × h  CSS viewport in portrait, dpr = device pixel ratio
//   style  island | notch | home | punch | fold | tablet | surface
//   r      screen corner radius (px)
const DEVICES = {
  Mobile: [
    { name: "iPhone SE (3rd gen)", color: "Midnight", hex: "#2b3038", w: 375, h: 667, dpr: 2, ua: "ios", style: "home", r: 0 },
    { name: "iPhone 13 mini", color: "Starlight", hex: "#efe8dc", w: 375, h: 812, dpr: 3, ua: "ios", style: "notch", r: 44 },
    { name: "iPhone 11", color: "Purple", hex: "#d4c8e2", w: 414, h: 896, dpr: 2, ua: "ios", style: "notch", r: 42 },
    { name: "iPhone 14", color: "Blue", hex: "#a9bfd6", w: 390, h: 844, dpr: 3, ua: "ios", style: "notch", r: 47 },
    { name: "iPhone 15", color: "Pink", hex: "#f1cdd2", w: 393, h: 852, dpr: 3, ua: "ios", style: "island", r: 50 },
    { name: "iPhone 16", color: "Ultramarine", hex: "#7f8ce6", w: 393, h: 852, dpr: 3, ua: "ios", style: "island", r: 50 },
    { name: "iPhone 16 Plus", color: "Teal", hex: "#a3d4cf", w: 430, h: 932, dpr: 3, ua: "ios", style: "island", r: 52 },
    { name: "iPhone 16 Pro", color: "Desert Titanium", hex: "#bfa58e", w: 402, h: 874, dpr: 3, ua: "ios", style: "island", r: 55 },
    { name: "iPhone 16 Pro Max", color: "Black Titanium", hex: "#3d3d3f", w: 440, h: 956, dpr: 3, ua: "ios", style: "island", r: 55 },
    { name: "iPhone 17", color: "Lavender", hex: "#cdbfe6", w: 402, h: 874, dpr: 3, ua: "ios", style: "island", r: 55 },
    { name: "iPhone Air", color: "Sky Blue", hex: "#c2d9ec", w: 420, h: 912, dpr: 3, ua: "ios", style: "island", r: 55 },
    { name: "iPhone 17 Pro", color: "Cosmic Orange", hex: "#d9692f", w: 402, h: 874, dpr: 3, ua: "ios", style: "island", r: 55 },
    { name: "iPhone 17 Pro Max", color: "Deep Blue", hex: "#2f3b57", w: 440, h: 956, dpr: 3, ua: "ios", style: "island", r: 55 },
    { name: "Galaxy Z Fold5 (folded)", color: "Icy Blue", hex: "#b9cde1", w: 344, h: 882, dpr: 3, ua: "android", style: "fold", r: 18 },
    { name: "Galaxy S8", color: "Orchid Gray", hex: "#a6a0b3", w: 360, h: 740, dpr: 4, ua: "android", style: "punch", r: 30 },
    { name: "Galaxy S21", color: "Phantom Violet", hex: "#b8a7d4", w: 360, h: 800, dpr: 3, ua: "android", style: "punch", r: 30 },
    { name: "Galaxy S24", color: "Cobalt Violet", hex: "#6f5f9f", w: 360, h: 780, dpr: 3, ua: "android", style: "punch", r: 30 },
    { name: "Galaxy S24 Ultra", color: "Titanium Yellow", hex: "#e8dfb8", w: 384, h: 824, dpr: 3.75, ua: "android", style: "punch", r: 14 },
    { name: "Pixel 7", color: "Lemongrass", hex: "#e2e6b0", w: 412, h: 915, dpr: 2.625, ua: "android", style: "punch", r: 36 },
    { name: "Pixel 8", color: "Hazel", hex: "#8e9289", w: 412, h: 915, dpr: 2.625, ua: "android", style: "punch", r: 38 },
  ],
  Tablet: [
    { name: "iPad mini (A17 Pro)", color: "Purple", hex: "#cfc1e3", w: 744, h: 1133, dpr: 2, ua: "ipad", style: "tablet", r: 22 },
    { name: "Galaxy Tab S9", color: "Beige", hex: "#e5dbc9", w: 800, h: 1280, dpr: 2, ua: "androidTab", style: "tablet", r: 18 },
    { name: "iPad (A16)", color: "Yellow", hex: "#f0dc7d", w: 820, h: 1180, dpr: 2, ua: "ipad", style: "tablet", r: 18 },
    { name: "iPad Air 11\" (M3)", color: "Blue", hex: "#b6c8dc", w: 820, h: 1180, dpr: 2, ua: "ipad", style: "tablet", r: 18 },
    { name: "iPad Pro 11\" (M4)", color: "Space Black", hex: "#2f2f31", w: 834, h: 1210, dpr: 2, ua: "ipad", style: "tablet", r: 20 },
    { name: "Surface Pro 7", color: "Platinum", hex: "#d7d7d4", w: 912, h: 1368, dpr: 2, ua: null, style: "surface", r: 6 },
    { name: "iPad Air 13\" (M3)", color: "Starlight", hex: "#eee5d6", w: 1024, h: 1366, dpr: 2, ua: "ipad", style: "tablet", r: 18 },
    { name: "iPad Pro 13\" (M4)", color: "Silver", hex: "#dadbdd", w: 1032, h: 1376, dpr: 2, ua: "ipad", style: "tablet", r: 20 },
  ],
};
