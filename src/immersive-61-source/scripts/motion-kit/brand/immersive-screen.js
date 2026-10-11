/* Deterministic screen-workflow helpers; no async, playback callbacks, clocks or network. */
(() => {
  const S = (window.SW = {});
  S.bind = (v) => {
    for (const el of document.querySelectorAll("[data-bind]")) {
      if (v[el.dataset.bind] !== undefined) el.textContent = String(v[el.dataset.bind]);
    }
  };
  S.cursor = (parent, id) => {
    const el = document.createElement("div");
    el.id = id || "cursor";
    el.className = "sw-cursor";
    el.innerHTML =
      '<svg viewBox="0 0 32 40"><path d="M3 2L28 24L17 25L12 37L3 2Z" fill="#f4f3ee" stroke="#0a0a0a" stroke-width="2" stroke-linejoin="round"/></svg>';
    parent.appendChild(el);
    return el;
  };
  S.move = (tl, x, y, at, duration, id) => {
    tl.to(id || "#cursor", { x, y, duration: duration || 0.6, ease: "power3.inOut" }, at);
  };
  S.press = (tl, at, id) => {
    tl.to(
      id || "#cursor",
      { scale: 0.8, duration: 0.1, ease: "power2.in", yoyo: true, repeat: 1 },
      at,
    );
  };
  S.camera = (tl, scale, x, y, at, duration) => {
    tl.to("#surface", { scale, x, y, duration: duration || 0.8, ease: "power3.inOut" }, at);
  };
})();
