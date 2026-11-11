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
      b.querySelector(".sz").textContent = land ? `${d.h} × ${d.w}` : `${d.w} × ${d.h}`;
    });
  }
}

async function setOrientation(o) {
  orientation = o;
  chrome.storage.local.set({ orientation: o });
  paintOrientation();
  // Already showing a device? Turn it right away.
  const k = lastState?.emulation?.mode === "frame" ? lastState.emulation.key : null;
  if (k) {
    const [group, index] = k.split("-");
    run({ cmd: "emulate", group, index: +index, orientation: o });
  }
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
    if (res?.error) showStatus(res.error);
    else if (res?.note) showStatus(res.note);
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
      b.title = `${d.name} in ${d.color}`;
      b.innerHTML = `<span class="dev"><span class="dot"></span><span><span class="n"></span><small></small></span></span><span class="sz"></span>`;
      b.querySelector(".dot").style.background = d.hex;
      b.querySelector(".n").textContent = d.name;
      b.querySelector("small").textContent = d.color;
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
