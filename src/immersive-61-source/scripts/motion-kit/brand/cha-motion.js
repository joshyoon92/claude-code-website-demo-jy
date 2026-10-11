/* CHA Motion Kit runtime — shared builders for HyperFrames compositions (GSAP 3, paused + seekable).
   Every helper is deterministic: no Math.random, no Date, no callbacks that only fire on play.
   Load order in a piece: brand/gsap.min.js → brand/cha-motion.js → the piece script.
   API summary (README.md has the long form):
     CHA.vars(defaults)                     variables: data-composition-variables / --variables, merged over defaults
     (register the timeline literally in the piece — the linter reads it:
        const tl = gsap.timeline({paused:true}); window.__timelines = window.__timelines || {}; window.__timelines["<id>"] = tl;)
     CHA.rng(seed)                          seeded PRNG → () => [0,1)
     eases: "cha.spring" (~8% overshoot, UI), "cha.pop" (~20%, emphasis), "cha.settle" (no visible overshoot)
     CHA.phone / CHA.laptop / CHA.win / CHA.cursor (HTML strings; generic devices, no maker logos)
     CHA.type(tl, el, text, at, opts)       keystroke typing with Hangul IME composition (ㅎ→하→한); returns end time
     CHA.blink(tl, el, from, to)            caret blink as explicit sets
     CHA.words(el, text?)                   wrap words in <span class="w">, returns the spans
     CHA.count(tl, el, from, to, at, dur, o) seek-safe number roll
     CHA.cursorTo / CHA.click               cursor travel and a click (press + lime ring)
     CHA.guides(el, w, h, xs, ys)           thin rail lines
     CHA.logo(kind)                         <img> of the approved logo (lime | light | dark | paper)
*/
(function () {
  const CHA = (window.CHA = {});

  CHA.vars = function (defaults) {
    let v = {};
    try {
      const hf = window.__hyperframes;
      if (hf && typeof hf.getVariables === "function") v = hf.getVariables() || {};
    } catch (e) { v = {}; }
    return Object.assign({}, defaults || {}, v);
  };

  CHA.timeline = function (id) {
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true });
    window.__timelines[id] = tl;
    return tl;
  };

  CHA.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // damped spring as an ease (z = damping ratio). Lower z = more overshoot.
  function spring(z, w0) {
    const w = w0 / z, wd = w * Math.sqrt(1 - z * z);
    return function (p) { return p >= 1 ? 1 : 1 - Math.exp(-z * w * p) * (Math.cos(wd * p) + ((z * w) / wd) * Math.sin(wd * p)); };
  }
  if (window.gsap) {
    gsap.registerEase("cha.spring", spring(0.62, 6.6));
    gsap.registerEase("cha.pop", spring(0.45, 6.9));
    gsap.registerEase("cha.settle", spring(0.86, 7.6));
  }

  // ---------------------------------------------------------------- devices
  CHA.phone = function (o) {
    o = Object.assign({ id: "", w: 420, h: 880, status: true, time: "9:41", screen: "", cls: "" }, o || {});
    const st = o.status
      ? `<div class="cha-status"><span>${o.time}</span><span style="display:flex;gap:7px;align-items:center">` +
        `<i style="width:26px;height:13px;border-radius:4px;border:2px solid #fff;display:inline-block;position:relative">` +
        `<i style="position:absolute;left:2px;top:2px;bottom:2px;width:15px;border-radius:1px;background:#fff"></i></i></span></div>`
      : "";
    return `<div class="cha-phone ${o.cls}" ${o.id ? `id="${o.id}"` : ""} style="width:${o.w}px;height:${o.h}px">` +
      `<div class="cha-island"></div><div class="cha-screen">${st}${o.screen}</div></div>`;
  };

  // A 3D laptop modelled on MacBook Pro 14 (Alex 2026-10-02: "키보드가 화면보다 길어 … 맥북으로 정확하게 모델링해").
  // Real proportions, as fractions of the width w (= lid width = base width, 312.6 mm):
  //   base depth 0.708w (221.2 mm), base thickness 0.05w (15.5 mm), lid outer height ≈ h (pieces keep their own h;
  //   MBP is 0.69w), display bezels sides 0.021w / top 0.031w / bottom 0.028w with a camera notch, full-width keyboard
  //   (function row + 5 rows, real key widths) between speaker grilles, trackpad 0.43w near the front, finger notch.
  // No maker logo on the lid back. The lid is a vertical plane hinged on its bottom edge; the deck a horizontal plane
  // extending toward the viewer. Closed: lid rotationX ≈ -88.5 (folded onto the deck). Open: 0; leaning back: +4…+8.
  // Put it inside a .cha-world (preserve-3d) under a .cha-view (perspective). opts.finish: "black" | "silver".
  CHA.laptopDims = function (w, h) {
    h = h || Math.round(w * 0.69);
    const bs = w * 0.021, bt = w * 0.031, bb = w * 0.028;
    return { w: w, h: h, depth: Math.round(w * 0.708), thick: Math.round(w * 0.05), bezel: { side: bs, top: bt, bottom: bb },
      screenW: Math.round(w - 2 * bs), screenH: Math.round(h - bt - bb) };
  };
  CHA.laptop = function (o) {
    o = Object.assign({ id: "", w: 880, h: 0, screen: "", cls: "", finish: "black" }, o || {});
    const d = CHA.laptopDims(o.w, o.h), w = o.w, h = d.h, D = d.depth, u = w / 312.6;  // u = px per mm
    const metal = o.finish === "silver" ? ["#E6E7E8", "#CFD1D3", "#BFC1C4"] : ["#3A3A3D", "#2C2C2F", "#232326"];
    const key = o.finish === "silver" ? "#111113" : "#0B0B0C";
    // keyboard rows: [height factor, [units…]] — each row spans 15 units
    const rows = [
      [0.55, [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5]],
      [1, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2]],
      [1, [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5]],
      [1, [1.8, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.2]],
      [1, [2.35, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.65]],
      [1, [1, 1, 1, 1.25, 5.5, 1.25, 1, "arrows"]]
    ];
    const kbW = 276 * u, gap = 1.9 * u, unit = (kbW - 14 * gap) / 15, kh = 16.2 * u;
    let kb = "";
    rows.forEach(function (r) {
      const hh = Math.round(kh * r[0]);
      kb += `<div style="display:flex;gap:${gap.toFixed(1)}px;margin-bottom:${gap.toFixed(1)}px;height:${hh}px">`;
      r[1].forEach(function (k) {
        if (k === "arrows") {
          const aw = (unit * 3 + gap * 2) / 3 - gap * 2 / 3;
          kb += `<div style="flex:3;display:flex;gap:${gap.toFixed(1)}px;align-items:flex-end">` +
            `<i style="flex:1;height:${Math.round(hh / 2)}px;border-radius:${(1.4 * u).toFixed(1)}px;background:${key}"></i>` +
            `<span style="flex:1;display:flex;flex-direction:column;gap:${(gap / 2).toFixed(1)}px;height:100%">` +
            `<i style="flex:1;border-radius:${(1.4 * u).toFixed(1)}px;background:${key}"></i><i style="flex:1;border-radius:${(1.4 * u).toFixed(1)}px;background:${key}"></i></span>` +
            `<i style="flex:1;height:${Math.round(hh / 2)}px;border-radius:${(1.4 * u).toFixed(1)}px;background:${key}"></i></div>`;
          return;
        }
        kb += `<i style="flex:${k};border-radius:${(1.6 * u).toFixed(1)}px;background:${key};box-shadow:inset 0 -${(0.4 * u).toFixed(1)}px 0 rgba(255,255,255,0.06)"></i>`;
      });
      kb += `</div>`;
    });
    const grille = (side) => `<div style="position:absolute;top:${(14 * u).toFixed(1)}px;${side}:${(6.5 * u).toFixed(1)}px;width:${(9 * u).toFixed(1)}px;height:${(96 * u).toFixed(1)}px;` +
      `background-image:radial-gradient(rgba(0,0,0,0.55) ${(0.45 * u).toFixed(2)}px, transparent ${(0.55 * u).toFixed(2)}px);background-size:${(1.6 * u).toFixed(1)}px ${(1.6 * u).toFixed(1)}px"></div>`;
    const r = (7.5 * u).toFixed(1);  // corner radius
    const deck =
      `<div class="cha-deck" style="left:0;top:${h}px;width:${w}px;height:${D}px;border-radius:${(2 * u).toFixed(1)}px ${(2 * u).toFixed(1)}px ${r}px ${r}px;` +
      `background:linear-gradient(${metal[0]}, ${metal[1]});box-shadow:inset 0 0 0 ${Math.max(1, 0.5 * u).toFixed(1)}px rgba(255,255,255,0.10)">` +
      grille("left") + grille("right") +
      `<div style="position:absolute;left:${((312.6 - 276) / 2 * u).toFixed(1)}px;top:${(9.5 * u).toFixed(1)}px;width:${kbW.toFixed(1)}px;` +
      `padding:${(1.2 * u).toFixed(1)}px;border-radius:${(2.4 * u).toFixed(1)}px;background:rgba(0,0,0,0.28)">${kb}</div>` +
      `<div style="position:absolute;left:${((312.6 - 135) / 2 * u).toFixed(1)}px;bottom:${(9 * u).toFixed(1)}px;width:${(135 * u).toFixed(1)}px;height:${(86 * u).toFixed(1)}px;` +
      `border-radius:${(4 * u).toFixed(1)}px;background:${metal[1]};box-shadow:inset 0 0 0 ${Math.max(1, 0.4 * u).toFixed(1)}px rgba(255,255,255,0.12), inset 0 ${(0.6 * u).toFixed(1)}px ${(1.5 * u).toFixed(1)}px rgba(0,0,0,0.25)"></div>` +
      `<div class="cha-lip" style="position:absolute;left:0;bottom:0;width:${w}px;height:${d.thick}px;transform-origin:50% 100%;transform:rotateX(90deg);` +
      `background:linear-gradient(${metal[2]}, ${metal[1]});border-radius:0 0 ${r}px ${r}px">` +
      `<b style="position:absolute;left:50%;top:0;width:${(24 * u).toFixed(1)}px;height:${(2.6 * u).toFixed(1)}px;margin-left:${(-12 * u).toFixed(1)}px;` +
      `border-radius:0 0 ${(3 * u).toFixed(1)}px ${(3 * u).toFixed(1)}px;background:rgba(0,0,0,0.45)"></b></div></div>`;
    const bz = d.bezel;
    const lid =
      `<div class="cha-lid" style="width:${w}px;height:${h}px">` +
      `<div class="cha-lid-front" style="position:absolute;inset:0;border-radius:${r}px ${r}px ${(2 * u).toFixed(1)}px ${(2 * u).toFixed(1)}px;background:#060607;` +
      `box-shadow:inset 0 0 0 ${Math.max(1.5, 0.9 * u).toFixed(1)}px ${metal[0]};padding:${bz.top.toFixed(1)}px ${bz.side.toFixed(1)}px ${bz.bottom.toFixed(1)}px">` +
      `<div class="cha-screen" style="border-radius:${(3.2 * u).toFixed(1)}px ${(3.2 * u).toFixed(1)}px 0 0">${o.screen}</div>` +
      `<i class="cha-notch" style="position:absolute;left:50%;top:${(bz.top - 0.5).toFixed(1)}px;width:${(30 * u).toFixed(1)}px;height:${(5.2 * u).toFixed(1)}px;` +
      `margin-left:${(-15 * u).toFixed(1)}px;border-radius:0 0 ${(2.4 * u).toFixed(1)}px ${(2.4 * u).toFixed(1)}px;background:#060607;z-index:6"></i></div>` +
      `<div class="cha-lid-back" style="position:absolute;inset:0;border-radius:${r}px ${r}px ${(2 * u).toFixed(1)}px ${(2 * u).toFixed(1)}px;` +
      `background:linear-gradient(160deg, ${metal[0]}, ${metal[1]} 60%, ${metal[2]});transform:rotateY(180deg)"></div></div>`;
    return `<div class="cha-laptop p3d ${o.cls}" ${o.id ? `id="${o.id}"` : ""} style="width:${w}px;height:${h}px">${deck}${lid}</div>`;
  };

  CHA.win = function (o) {
    o = Object.assign({ id: "", w: 760, h: 480, title: "", body: "", cls: "" }, o || {});
    return `<div class="cha-win ${o.cls}" ${o.id ? `id="${o.id}"` : ""} style="width:${o.w}px;height:${o.h}px">` +
      `<div class="cha-bar"><b></b><b></b><b></b><span>${o.title}</span></div>` +
      `<div class="cha-body" style="height:${o.h - 56}px">${o.body}</div></div>`;
  };

  CHA.cursor = function (id) {
    return `<div class="cha-cursor" id="${id || "cursor"}"><svg viewBox="0 0 46 56">` +
      `<path d="M4 3 L4 44 L14.5 34.5 L21.5 51 L29.5 47.5 L22.5 31.5 L37 31.5 Z" fill="#FFFFFF" stroke="#0A0A0A" stroke-width="3.2" stroke-linejoin="round"/>` +
      `</svg></div>`;
  };

  CHA.logo = function (kind) {
    const f = { lime: "cha-logo-lime-tight.svg", light: "cha-logo-transparent-light-ink-tight.svg",
      dark: "cha-logo-transparent-dark-ink-tight.svg", paper: "cha-logo-paper.svg" }[kind || "light"];
    return `brand/logo/${f}`;
  };

  // ---------------------------------------------------------------- typing (Hangul IME aware)
  const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
  function stages(ch, ime) {
    const c = ch.charCodeAt(0) - 0xac00;
    if (!ime || c < 0 || c > 11171) return [ch];
    const L = Math.floor(c / 588), V = Math.floor((c % 588) / 28), T = c % 28;
    const out = [CHO[L], String.fromCharCode(0xac00 + (L * 21 + V) * 28)];
    if (T) out.push(ch);
    return out;
  }

  // Types `text` into `el` (cleared). opts: cps (chars/s, default 14), seed, ime (default true), caret (default true),
  // jitter (0..1, default 0.35). Returns the time the last stroke lands. The caret stays (call CHA.blink afterwards).
  CHA.type = function (tl, el, text, at, opts) {
    el = typeof el === "string" ? document.querySelector(el) : el;
    opts = Object.assign({ cps: 14, seed: 7, ime: true, caret: true, jitter: 0.35 }, opts || {});
    const r = CHA.rng(opts.seed);
    el.textContent = "";
    let t = at;
    const base = 1 / opts.cps;
    for (const ch of Array.from(text)) {
      if (ch === "\n") { const br = document.createElement("br"); br.style.display = "none"; el.appendChild(br); tl.set(br, { display: "inline" }, t); t += base * 2; continue; }
      const st = stages(ch, opts.ime);
      let prev = null;
      st.forEach(function (s, i) {
        const sp = document.createElement("span");
        sp.className = "k-ch";
        sp.textContent = s;
        el.appendChild(sp);
        tl.set(sp, { display: "inline" }, t);
        if (prev) tl.set(prev, { display: "none" }, t);
        prev = sp;
        const step = base * (st.length > 1 ? 0.55 : 1) * (1 + (r() * 2 - 1) * opts.jitter);
        if (i < st.length - 1) t += step;
      });
      t += base * (1 + (r() * 2 - 1) * opts.jitter) * (ch === " " ? 1.35 : /[,.!?…]/.test(ch) ? 2.6 : 1);
    }
    if (opts.caret) {
      const c = document.createElement("span");
      c.className = "cha-caret";
      el.appendChild(c);
    }
    return t;
  };

  CHA.blink = function (tl, el, from, to, period) {
    period = period || 0.53;
    for (let t = from, on = false; t < to; t += period, on = !on) tl.set(el, { opacity: on ? 1 : 0 }, t);
    tl.set(el, { opacity: 1 }, to);
  };

  CHA.words = function (el, text) {
    el = typeof el === "string" ? document.querySelector(el) : el;
    const s = text != null ? text : el.textContent;
    el.textContent = "";
    const out = [];
    s.split(/(\s+)/).forEach(function (part) {
      if (!part) return;
      if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(part)); return; }
      const w = document.createElement("span");
      w.className = "w";
      w.style.display = "inline-block";
      w.textContent = part;
      el.appendChild(w);
      out.push(w);
    });
    return out;
  };

  CHA.count = function (tl, el, from, to, at, dur, o) {
    el = typeof el === "string" ? document.querySelector(el) : el;
    o = Object.assign({ decimals: 0, prefix: "", suffix: "", ease: "power3.out", comma: true }, o || {});
    const fmt = function (v) {
      let s = v.toFixed(o.decimals);
      if (o.comma) { const p = s.split("."); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ","); s = p.join("."); }
      return o.prefix + s + o.suffix;
    };
    const box = { v: from };
    el.textContent = fmt(from);
    tl.to(box, { v: to, duration: dur, ease: o.ease, onUpdate: function () { el.textContent = fmt(box.v); } }, at);
  };

  // cursor travel (tip at x,y) with a slight arc; cursorTo returns arrival time
  CHA.cursorTo = function (tl, sel, x, y, at, dur, ease) {
    tl.to(sel, { x: x, y: y, duration: dur || 0.7, ease: ease || "power3.inOut" }, at);
    return at + (dur || 0.7);
  };
  CHA.click = function (tl, sel, ringSel, x, y, at) {
    tl.to(sel, { scale: 0.86, duration: 0.07, ease: "power2.out", transformOrigin: "10% 6%" }, at);
    tl.to(sel, { scale: 1, duration: 0.3, ease: "cha.spring" }, at + 0.07);
    if (ringSel) {
      tl.set(ringSel, { x: x, y: y, scale: 0.35, opacity: 1 }, at);
      tl.to(ringSel, { scale: 1.5, opacity: 0, duration: 0.5, ease: "power2.out" }, at + 0.02);
    }
    return at + 0.12;
  };

  // Measured lens centres of CHA.logo('light') (tight SVG), as fractions of the logo box (batch B/F builders).
  CHA.LOGO_LENS = { left: [0.3994, 0.4287], right: [0.5918, 0.4277], half: [0.0771, 0.0713] };

  // Highlighter on an ink ground: the text stays white until the lime fill passes, then reads ink.
  // Structure: <span class="mark mark-ink"><i class="mark-fill"></i><span>text</span><b class="mark-ink-copy">text</b></span>
  // markInk() builds the copy when it is missing and sweeps fill + copy together.
  CHA.markInk = function (tl, el, at, dur, ease) {
    el = typeof el === "string" ? document.querySelector(el) : el;
    dur = dur || 0.45; ease = ease || "power3.out";
    let copy = el.querySelector(".mark-ink-copy");
    if (!copy) {
      copy = document.createElement("b");
      copy.className = "mark-ink-copy";
      copy.textContent = el.querySelector("span").textContent;
      el.appendChild(copy);
    }
    gsap.set(el.querySelector(".mark-fill"), { scaleX: 0 });
    gsap.set(copy, { clipPath: "inset(0 100% 0 0)" });
    tl.to(el.querySelector(".mark-fill"), { scaleX: 1, duration: dur, ease: ease }, at);
    tl.to(copy, { clipPath: "inset(0 0% 0 0)", duration: dur, ease: ease }, at);
  };

  CHA.guides = function (el, w, h, xs, ys) {
    el = typeof el === "string" ? document.querySelector(el) : el;
    const g = document.createElement("div");
    g.className = "guides";
    (xs || []).forEach(function (x) { const i = document.createElement("i"); i.style.cssText = `left:${x}px;top:0;width:1.5px;height:${h}px`; g.appendChild(i); });
    (ys || []).forEach(function (y) { const i = document.createElement("i"); i.style.cssText = `top:${y}px;left:0;height:1.5px;width:${w}px`; g.appendChild(i); });
    el.appendChild(g);
    return g;
  };
})();
