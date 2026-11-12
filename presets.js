// Size presets shown in the popup. Shared by popup.js and background.js.

const UA = {
  ios: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  ipad: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  androidTab: "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
};

const PLATFORM = { ios: "iPhone", ipad: "iPad", android: "Linux armv81", androidTab: "Linux armv81" };

// Desktop presets resize the real window so the page's viewport is exactly this wide.
const DESKTOP = [2560, 1920, 1600, 1536, 1440, 1366, 1280, 1200];

// Status bar height (CSS px) per frame style: [vertical, horizontal].
// The page starts below it, as in the real browser. iPhones hide the status
// bar when turned horizontal; Windows tablets have none.
const STATUS_BAR = {
  island: [54, 0],
  notch: [47, 0],
  home: [20, 0],
  punch: [28, 28],
  fold: [28, 28],
  tablet: [24, 24],
  surface: [0, 0],
  duo: [28, 28],
};
const statusBarHeight = (frame, landscape) => (STATUS_BAR[frame] || [0, 0])[landscape ? 1 : 0];

// Foldables have a folded and an unfolded size (unfolded spans both screens).
const FOLDABLE = [
  {
    name: "Surface Duo",
    folded: { w: 540, h: 720 },
    unfolded: { w: 1114, h: 720 },
    dpr: 2.5,
    ua: "android",
    frame: "duo",
  },
];

// Mobile/tablet presets are emulated (Chrome won't shrink a real window this small).
const DEVICES = {
  Mobile: [
    { name: "iPhone SE (1st gen)", w: 320, h: 568, dpr: 2, ua: "ios", frame: "home" },
    { name: "Galaxy Z Fold (folded)", w: 344, h: 882, dpr: 3, ua: "android", frame: "fold" },
    { name: "Galaxy S8", w: 360, h: 740, dpr: 4, ua: "android", frame: "punch" },
    { name: "Galaxy S23 / S24", w: 360, h: 780, dpr: 3, ua: "android", frame: "punch" },
    { name: "Galaxy S20 / S21 / S22", w: 360, h: 800, dpr: 3, ua: "android", frame: "punch" },
    { name: "iPhone SE (2nd/3rd gen)", w: 375, h: 667, dpr: 2, ua: "ios", frame: "home" },
    { name: "iPhone 12 / 13 mini", w: 375, h: 812, dpr: 3, ua: "ios", frame: "notch" },
    { name: "Galaxy S24 Ultra", w: 384, h: 824, dpr: 3.75, ua: "android", frame: "punch" },
    { name: "iPhone 12 / 13 / 14", w: 390, h: 844, dpr: 3, ua: "ios", frame: "notch" },
    { name: "iPhone 14 Pro / 15 / 16", w: 393, h: 852, dpr: 3, ua: "ios", frame: "island" },
    { name: "iPhone 16 Pro", w: 402, h: 874, dpr: 3, ua: "ios", frame: "island" },
    { name: "iPhone 17 / 17 Pro", w: 402, h: 874, dpr: 3, ua: "ios", frame: "island" },
    { name: "iPhone 18 Pro", w: 402, h: 874, dpr: 3, ua: "ios", frame: "island" },
    { name: "Pixel 7 / 8", w: 412, h: 915, dpr: 2.625, ua: "android", frame: "punch" },
    { name: "iPhone XR / 11", w: 414, h: 896, dpr: 2, ua: "ios", frame: "notch" },
    { name: "iPhone Air", w: 420, h: 912, dpr: 3, ua: "ios", frame: "island" },
    { name: "iPhone 14 Plus", w: 428, h: 926, dpr: 3, ua: "ios", frame: "notch" },
    { name: "iPhone 15 / 16 Plus, 15 Pro Max", w: 430, h: 932, dpr: 3, ua: "ios", frame: "island" },
    { name: "iPhone 16 Pro Max", w: 440, h: 956, dpr: 3, ua: "ios", frame: "island" },
    { name: "iPhone 17 Pro Max", w: 440, h: 956, dpr: 3, ua: "ios", frame: "island" },
    { name: "iPhone 18 Pro Max", w: 440, h: 956, dpr: 3, ua: "ios", frame: "island" },
  ],
  Tablet: [
    { name: "iPad Mini", w: 768, h: 1024, dpr: 2, ua: "ipad", frame: "tablet" },
    { name: "Galaxy Tab S9", w: 800, h: 1280, dpr: 2, ua: "androidTab", frame: "tablet" },
    { name: "iPad Air", w: 820, h: 1180, dpr: 2, ua: "ipad", frame: "tablet" },
    { name: "iPad Pro 11\"", w: 834, h: 1194, dpr: 2, ua: "ipad", frame: "tablet" },
    { name: "Surface Pro 7", w: 912, h: 1368, dpr: 2, ua: null, frame: "surface" },
    { name: "iPad Pro 12.9\"", w: 1024, h: 1366, dpr: 2, ua: "ipad", frame: "tablet" },
  ],
};
