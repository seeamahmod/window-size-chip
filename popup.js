/* global DESKTOP, DEVICES, FOLDABLE */
const $ = (id) => document.getElementById(id);
let tab;
let orientation = "portrait";
let fold = "folded";
let lastState = null;

const sizeText = (w, h) => (orientation === "landscape" ? `${h} × ${w}` : `${w} × ${h}`);

function paintOrientation() {
  const land = orientation === "landscape";
  $("oPortrait").setAttribute("aria-pressed", String(!land));
  $("oLandscape").setAttribute("aria-pressed", String(land));
  $("fFolded").setAttribute("aria-pressed", String(fold === "folded"));
  $("fUnfolded").setAttribute("aria-pressed", String(fold === "unfolded"));
  for (const [group, el] of [["Tablet", "tablet"], ["Mobile", "mobile"]]) {
    [...$(el).children].forEach((b, i) => {
      const d = DEVICES[group][i];
      b.children[1].textContent = sizeText(d.w, d.h);
    });
  }
  [...$("foldable").children].forEach((b, i) => {
    const s = FOLDABLE[i][fold];
    b.children[1].textContent = sizeText(s.w, s.h);
  });
}

// A phone, tablet or foldable is already showing? Apply the change right away.
function reapply() {
  const k = lastState?.emulation?.key || "";
  const m = k.match(/^(Tablet|Mobile|Foldable)-(\d+)$/);
  if (m) run({ cmd: "emulate", group: m[1], index: +m[2], orientation, fold });
}

function setOrientation(o) {
  orientation = o;
  chrome.storage.local.set({ orientation: o });
  paintOrientation();
  reapply();
}

function setFold(f) {
  fold = f;
  chrome.storage.local.set({ fold: f });
  paintOrientation();
  if ((lastState?.emulation?.key || "").startsWith("Foldable-")) reapply();
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
  // Skip all DOM work when nothing changed since the last check.
  const sig = JSON.stringify([s.size, s.window, s.emulation?.key, s.emulation?.label]);
  if (sig === refresh.sig) return;
  refresh.sig = sig;
  lastState = s;
  if (s.size) {
    $("now").textContent = `${s.size.outerWidth} × ${s.size.outerHeight}`;
    $("vp").textContent = `${s.size.innerWidth} × ${s.size.innerHeight}`;
  } else if (s.window) {
    $("now").textContent = `${s.window.width} × ${s.window.height}`;
    $("vp").textContent = "—";
  }
  $("emu").classList.toggle("hidden", !s.emulation);
  // The position switch only appears while a tablet, phone or foldable is
  // showing, and Folded / Unfolded only while the foldable is.
  const key = s.emulation?.key || "";
  $("posSection").classList.toggle("hidden", !/^(Tablet|Mobile|Foldable)-/.test(key));
  $("foldSeg").classList.toggle("hidden", !key.startsWith("Foldable-"));
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
    refresh.sig = "";
    refresh();
  }
}

function row(key, name, onclick) {
  const b = document.createElement("button");
  b.dataset.key = key;
  b.innerHTML = `<span></span><span></span>`;
  b.children[0].textContent = name;
  b.onclick = onclick;
  return b;
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
      $(el).appendChild(row(`${group}-${i}`, d.name, () => run({ cmd: "emulate", group, index: i, orientation })));
    });
  }
  FOLDABLE.forEach((d, i) => {
    $("foldable").appendChild(
      row(`Foldable-${i}`, d.name, () => run({ cmd: "emulate", group: "Foldable", index: i, orientation, fold }))
    );
  });
  $("oPortrait").onclick = () => setOrientation("portrait");
  $("oLandscape").onclick = () => setOrientation("landscape");
  $("fFolded").onclick = () => setFold("folded");
  $("fUnfolded").onclick = () => setFold("unfolded");
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
  const saved = await chrome.storage.local.get(["orientation", "fold"]);
  if (saved.orientation === "landscape") orientation = "landscape";
  if (saved.fold === "unfolded") fold = "unfolded";
  build();
  paintOrientation();
  refresh();
  // Keep the numbers live while the popup is open (it closes when you click away).
  setInterval(refresh, 500);
})();
