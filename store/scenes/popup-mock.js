/* global DESKTOP, DEVICES */
// Builds a static copy of the extension popup for screenshots, using the real
// popup.css and presets.js. Options: window, viewport, active key, emulating
// label, landscape, and how many device rows to show.
function popupMock(el, o) {
  const land = !!o.landscape;
  const rows = (group, n, start = 0) =>
    DEVICES[group]
      .slice(start, start + n)
      .map((d, j) => {
        const key = `${group}-${start + j}`;
        const size = land ? `${d.h} × ${d.w}` : `${d.w} × ${d.h}`;
        return `<button class="${o.active === key ? "active" : ""}"><span>${d.name}</span><span>${size}</span></button>`;
      })
      .join("");
  el.innerHTML = `
  <div class="pop">
    <header>
      <div><div class="label">Window</div><div class="now">${o.window}</div></div>
      <div class="right"><div class="label">Viewport</div><div class="vp">${o.viewport}</div></div>
    </header>
    ${o.emu ? `<div class="emu"><span>Emulating ${o.emu}</span><button>Reset</button></div>` : ""}
    <section><h2>Desktop <small>resizes the window</small></h2>
      <div class="grid">${DESKTOP.map((w) => `<button class="${o.active === "d" + w ? "active" : ""}">${w}</button>`).join("")}</div>
    </section>
    <section><h2>Tablet, mobile &amp; foldable position</h2>
      <div class="seg"><button aria-pressed="${!land}">Vertical</button><button aria-pressed="${land}">Horizontal</button></div>
    </section>
    <section><h2>Tablet <small>emulated</small></h2><div class="list">${rows("Tablet", o.tablets ?? 3, o.tabletStart)}</div></section>
    <section><h2>Mobile <small>emulated</small></h2><div class="list">${rows("Mobile", o.phones ?? 4, o.phoneStart)}</div></section>
    ${o.footer === false ? "" : `<footer>Copyright (c) 2026 <a>Seeam Ahmod</a></footer>`}
  </div>`;
}
