/* global DESKTOP, DEVICES */
const $ = (id) => document.getElementById(id);
let tab;
let orientation = "portrait";
let lastState = null;

function paintOrientation() {
  const land = orientation === "landscape";
  $("oPortrait").setAttribute("aria-pressed", String(!land));
  $("oLandscape").setAttribute("aria-pressed", String(land));
  for (const [group, el] of [["Tablet", "tablet"], ["Mobile", "mobile"]]) {
    [...$(el).children].forEach((b, i) => {
      const d = DEVICES[group][i];
      b.children[1].textContent = land ? `${d.h} × ${d.w}` : `${d.w} × ${d.h}`;
    });
  }
}

function setOrientation(o) {
  orientation = o;
  chrome.storage.local.set({ orientation: o });
  paintOrientation();
  // A phone or tablet is already showing? Turn it right away.
  const k = lastState?.emulation?.key || "";
  const m = k.match(/^(Tablet|Mobile)-(\d+)$/);
  if (m) run({ cmd: "emulate", group: m[1], index: +m[2], orientation: o });
}

function send(msg) {
  return chrome.runtime.sendMessage({ ...msg, tabId: tab.id, windowId: tab.windowId });
}

function showStatus(text) {
  $("status").textContent = text || "";
  $("status").classList.toggle("hidden", !text);
}

async function refresh() {
  const s = await send({ cmd: "state" });
  lastState = s;
  if (s.size) {
    $("now").textContent = `${s.size.outerWidth} × ${s.size.outerHeight}`;
    $("vp").textContent = `${s.size.innerWidth} × ${s.size.innerHeight}`;
  } else if (s.window) {
    $("now").textContent = `${s.window.width} × ${s.window.height}`;
    $("vp").textContent = "—";
  }
  $("emu").classList.toggle("hidden", !s.emulation);
  $("emuLabel").textContent = s.emulation ? `Emulating ${s.emulation.label}` : "";
  document.querySelectorAll("[data-key]").forEach((b) => {
    const k = b.dataset.key;
    const active = s.emulation ? s.emulation.key === k : s.size && k === `d${s.size.innerWidth}`;
    b.classList.toggle("active", !!active);
  });
}

async function run(msg) {
  showStatus("");
  document.body.style.cursor = "progress";
  try {
    const res = await send(msg);
    // Only real problems are shown; informational notes are skipped.
    if (res?.error) showStatus(res.error);
  } finally {
    document.body.style.cursor = "";
    refresh();
  }
}

function build() {
  for (const w of DESKTOP) {
    const b = document.createElement("button");
    b.textContent = `${w}`;
    b.title = `Make the page ${w}px wide`;
    b.dataset.key = `d${w}`;
    b.onclick = () => run({ cmd: "resize", width: w });
    $("desktop").appendChild(b);
  }
  for (const [group, el] of [["Tablet", "tablet"], ["Mobile", "mobile"]]) {
    DEVICES[group].forEach((d, i) => {
      const b = document.createElement("button");
      b.dataset.key = `${group}-${i}`;
      b.innerHTML = `<span></span><span></span>`;
      b.children[0].textContent = d.name;
      b.children[1].textContent = `${d.w} × ${d.h}`;
      b.onclick = () => run({ cmd: "emulate", group, index: i, orientation });
      $(el).appendChild(b);
    });
  }
  $("oPortrait").onclick = () => setOrientation("portrait");
  $("oLandscape").onclick = () => setOrientation("landscape");
  $("reset").onclick = () => run({ cmd: "reset" });
  $("custom").onsubmit = (e) => {
    e.preventDefault();
    const width = +$("cw").value;
    const height = +$("ch").value || 0;
    run({ cmd: "custom", width, height });
  };
}

(async () => {
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const saved = await chrome.storage.local.get("orientation");
  if (saved.orientation === "landscape") orientation = "landscape";
  build();
  paintOrientation();
  refresh();
  // Keep the numbers live while the popup is open.
  setInterval(refresh, 300);
})();
