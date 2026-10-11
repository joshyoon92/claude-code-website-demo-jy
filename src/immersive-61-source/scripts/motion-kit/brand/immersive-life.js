/* Immersive pack "life" layer (2026-10-03 quality pass). The audit found the 61 pieces still for 77% of their frames
   (median longest hold 2.4 s). IMM.life(tl), called after a piece's timeline is complete:
   - upgrades opacity-only entrances to a short rise and settle (expo.out), so fades stop reading as slides;
   - adds a camera that follows the action: it reads, from the piece's own paused timeline, where the cursor moves and
     which elements change (box, opacity, stroke drawing, fill, colour), eases in toward them shortly before they act,
     never zooms past the point where everything visible still fits or a line of text would be cut at the frame edge, and drifts back with a slow push-in when it rests.
   Screen and create pieces move a layer inside their clipping window (.sw-window #world, .ic-body), so the headline
   and footer stay fixed; other pieces move #stage itself, capped so no edge element leaves the canvas. Deterministic:
   the path is sampled once at setup and written back as plain keyframes. */
(() => {
  const IMM = (window.IMM = {});
  const CURSORS = "#cursor, #ic-cursor, .sw-cursor, .ic-cursor, .cursor";

  // the cursor tip in camera-box coordinates (s = the box's client rect, w × h its size)
  function cursorAt(s, w, h, el) {
    if (!el) return null;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || Number.parseFloat(cs.opacity) < 0.05) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0) return null;
    // client rects can be scaled by the renderer's viewport; convert to the box's layout units
    const k = s.width / w || 1;
    const x = (r.left - s.left + r.width * 0.25) / k;
    const y = (r.top - s.top + r.height * 0.2) / k;
    if (x < 0 || y < 0 || x > w || y > h) return null;
    return { x, y };
  }

  function smooth(arr, sigma) {
    const r = Math.ceil(sigma * 3);
    const k = [];
    let sum = 0;
    for (let i = -r; i <= r; i++) {
      const w = Math.exp(-0.5 * (i / sigma) ** 2);
      k.push(w);
      sum += w;
    }
    return arr.map((_, i) => {
      let v = 0;
      for (let j = -r; j <= r; j++)
        v += arr[Math.min(arr.length - 1, Math.max(0, i + j))] * k[j + r];
      return v / sum;
    });
  }

  // IMM.life(tl, o) — call after the piece's timeline is complete, before registering it.
  //   o = { push: 0.06 (slow push-in over the piece), zoom: 0.16 (extra zoom while something acts),
  //         follow: 0.6 (how far toward the action the camera re-centres), fps: 15, rise: true (fade → rise) }
  //   Pieces without a screen window are capped at push 0.03 / zoom 0.015 / follow 0.25.
  IMM.life = (tl, opts) => {
    const o = Object.assign(
      { push: 0.06, zoom: 0.16, follow: 0.6, fps: 15, rise: true },
      opts || {},
    );
    const stage = document.getElementById("stage");
    // Camera target. Screen and create pieces zoom inside their clipping window (.sw-window #world, .ic-body): the headline and
    // footer stay put and the zoom can be strong. Everything else moves #stage itself, capped so no edge element leaves
    // the canvas (HyperFrames' motion_off_frame check enforces this).
    let world = stage.querySelector(".sw-window #world");
    // Create pieces clip their content in .ic-body: wrap its children once in a full-size camera layer (positions are
    // unchanged — the layer has the same box — and tweens keep their element references).
    const body = !world && stage.querySelector(".ic-body");
    if (body) {
      world = document.createElement("div");
      world.id = "imm-cam";
      world.style.cssText = "position:absolute;inset:0";
      while (body.firstChild) world.appendChild(body.firstChild);
      body.appendChild(world);
    }
    const cam = world || stage;
    if (!world) {
      o.push = Math.min(o.push, 0.03);
      o.zoom = Math.min(o.zoom, 0.015);
      o.follow = Math.min(o.follow, 0.25);
    }
    // the camera box: the window for screen pieces, else the composition size (some pieces size #stage with
    // height:100% of an unsized body, so the laid-out box can read 0)
    const W = world
      ? world.parentElement.offsetWidth
      : Number.parseFloat(stage.dataset.width) || stage.offsetWidth;
    const H = world
      ? world.parentElement.offsetHeight
      : Number.parseFloat(stage.dataset.height) || stage.offsetHeight;
    const origin = () => (world ? world.parentElement : stage).getBoundingClientRect();
    const D = Number.parseFloat(stage.dataset.duration) || tl.duration();
    const cur = stage.querySelector(CURSORS);
    const n = Math.max(2, Math.round(D * o.fps) + 1);
    const ts = Array.from({ length: n }, (_, i) => (i / (n - 1)) * D);
    // 0) a fade alone reads as a slide; give opacity-only entrances a short rise and settle (expo.out). Only elements
    //    whose transform no tween or set in this timeline touches, and that sit untransformed at setup, are upgraded.
    if (o.rise) {
      const tweens = tl.getChildren(true, true, false);
      const moved = new Set();
      for (const tw of tweens) {
        const v = tw.vars || {};
        if (
          [
            "x",
            "y",
            "xPercent",
            "yPercent",
            "scale",
            "scaleX",
            "scaleY",
            "rotation",
            "transform",
            "keyframes",
          ].some((k) => k in v)
        ) {
          for (const el of tw.targets()) moved.add(el);
        }
      }
      for (const tw of tweens) {
        const v = tw.vars || {};
        const keys = Object.keys(v).filter(
          (k) =>
            ![
              "duration",
              "ease",
              "delay",
              "stagger",
              "overwrite",
              "immediateRender",
              "onComplete",
              "onUpdate",
            ].includes(k),
        );
        if (
          keys.length !== 1 ||
          keys[0] !== "opacity" ||
          Number(v.opacity) !== 1 ||
          tw.duration() > 1.2
        )
          continue;
        for (const el of tw.targets()) {
          if (!(el instanceof Element) || moved.has(el) || el === stage || el.matches(CURSORS))
            continue;
          if (getComputedStyle(el).transform !== "none") continue;
          const r = el.getBoundingClientRect();
          const kk = origin().width / W || 1;
          if ((r.width * r.height) / (kk * kk) > W * H * 0.5) continue;
          moved.add(el);
          tl.fromTo(
            el,
            { y: 18, scale: 0.965 },
            {
              y: 0,
              scale: 1,
              duration: Math.max(0.55, tw.duration() * 1.6),
              ease: "expo.out",
              immediateRender: false,
            },
            tw.startTime(),
          );
          gsap.set(el, { y: 18, scale: 0.965 });
        }
      }
    }
    // 1) read where the action is from the piece's own timeline: the cursor while it is visible, and every element a
    //    tween animates (excluding full-frame layers), sampled at setup; an element counts as active when its box or
    //    opacity changed since the previous sample
    const targets = new Set();
    for (const tw of tl.getChildren(true, true, false)) {
      for (const el of tw.targets()) {
        if (el instanceof Element && el !== stage && el !== cam && !el.matches(CURSORS))
          targets.add(el);
      }
    }
    const area = W * H;
    const box = (el) => {
      const r = el.getBoundingClientRect();
      const s0 = origin();
      const cs = getComputedStyle(el);
      const op = Number.parseFloat(cs.opacity);
      // drawing, filling and recolouring are action too, though they leave the box where it is
      const look = `${cs.strokeDashoffset}|${cs.fill}|${cs.clipPath}|${cs.backgroundColor}|${cs.color}`;
      const k = s0.width / W || 1;
      return {
        x: (r.left - s0.left) / k,
        y: (r.top - s0.top) / k,
        w: r.width / k,
        h: r.height / k,
        op,
        look,
      };
    };
    // text that is on screen: the camera may push text fully out of frame, but never cut a line in half
    const texts = [...(world || stage).querySelectorAll("*")].filter(
      (el) =>
        !el.matches(CURSORS) &&
        [...el.childNodes].some((nd) => nd.nodeType === 3 && nd.textContent.trim()),
    );
    const textBoxes = [];
    let prev = null;
    const pts = [];
    const hot = [];
    for (const t of ts) {
      tl.seek(t, true);
      pts.push(cursorAt(origin(), W, H, cur));
      const o0 = origin();
      textBoxes.push(
        texts
          .map((el) => {
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            if (r.width * r.height < 4 || Number.parseFloat(cs.opacity) < 0.05) return null;
            const k = o0.width / W || 1;
            return {
              x: (r.left - o0.left) / k,
              y: (r.top - o0.top) / k,
              w: r.width / k,
              h: r.height / k,
            };
          })
          .filter(Boolean),
      );
      const now = new Map();
      for (const el of targets) now.set(el, box(el));
      let sx = 0;
      let sy = 0;
      let sw = 0;
      let bx0 = Number.POSITIVE_INFINITY;
      let by0 = Number.POSITIVE_INFINITY;
      let bx1 = Number.NEGATIVE_INFINITY;
      let by1 = Number.NEGATIVE_INFINITY;
      // everything visible (not background-sized) must stay in frame: it bounds the zoom
      let vx0 = Number.POSITIVE_INFINITY;
      let vy0 = Number.POSITIVE_INFINITY;
      let vx1 = Number.NEGATIVE_INFINITY;
      let vy1 = Number.NEGATIVE_INFINITY;
      for (const b of now.values()) {
        if (b.op < 0.05 || b.w * b.h > area * 0.6 || b.w * b.h < 4) continue;
        vx0 = Math.min(vx0, Math.max(0, b.x));
        vy0 = Math.min(vy0, Math.max(0, b.y));
        vx1 = Math.max(vx1, Math.min(W, b.x + b.w));
        vy1 = Math.max(vy1, Math.min(H, b.y + b.h));
      }
      if (prev) {
        for (const [el, b] of now) {
          const q = prev.get(el);
          if (!q || b.w * b.h > area * 0.6 || b.w * b.h < 4 || b.op < 0.05) continue;
          const moved =
            Math.abs(b.x - q.x) +
            Math.abs(b.y - q.y) +
            Math.abs(b.w - q.w) +
            Math.abs(b.h - q.h) +
            200 * Math.abs(b.op - q.op) +
            (b.look !== q.look ? 2 : 0);
          if (moved > 1.5) {
            const w = Math.sqrt(b.w * b.h);
            sx += (b.x + b.w / 2) * w;
            sy += (b.y + b.h / 2) * w;
            sw += w;
            bx0 = Math.min(bx0, b.x);
            by0 = Math.min(by0, b.y);
            bx1 = Math.max(bx1, b.x + b.w);
            by1 = Math.max(by1, b.y + b.h);
          }
        }
      }
      hot.push(
        sw > 0
          ? {
              x: sx / sw,
              y: sy / sw,
              bw: Math.max(bx1, vx1) - Math.min(bx0, vx0),
              bh: Math.max(by1, vy1) - Math.min(by0, vy0),
            }
          : null,
      );
      prev = now;
    }
    tl.seek(0, true);
    const speed = pts.map((p, i) => {
      const q = pts[i - 1];
      return p && q ? Math.hypot(p.x - q.x, p.y - q.y) : 0;
    });
    // focus: the cursor when it moves, else the centre of what is changing; activity looks ahead so the camera arrives first
    const focus = ts.map((_, i) => (pts[i] && speed[i] > 1.5 ? pts[i] : hot[i] || null));
    const act = ts.map((_, i) => {
      let a = 0;
      for (let j = i - 4; j <= i + 9; j++) if (j >= 0 && j < ts.length && focus[j]) a = 1;
      return a;
    });
    const actS = smooth(act, o.fps * 0.3);
    // never zoom past the point where the action stops fitting in the frame (a big glyph keeps its apex)
    let lastFit = o.zoom;
    const fit = ts.map((_, i) => {
      const h = hot[i];
      if (h)
        lastFit = Math.max(
          0,
          Math.min(
            o.zoom,
            Math.min((0.9 * W) / Math.max(1, h.bw), (0.9 * H) / Math.max(1, h.bh)) - 1,
          ),
        );
      return lastFit;
    });
    const fitS = smooth(fit, o.fps * 0.4);
    let lastX = W / 2;
    let lastY = H / 2;
    const fx = [];
    const fy = [];
    for (let i = 0; i < ts.length; i++) {
      // look ahead to the next focus so the move starts before the action
      let p = focus[i];
      for (let j = i; !p && j < Math.min(ts.length, i + 8); j++) p = focus[j];
      if (p) {
        lastX = p.x;
        lastY = p.y;
      }
      fx.push(lastX);
      fy.push(lastY);
    }
    const fxS = smooth(fx, o.fps * 0.35);
    const fyS = smooth(fy, o.fps * 0.35);
    // 2) camera keyframes: scale and a clamped translation that moves the focus partway to the centre
    const frames = ts.map((t, i) => {
      const u = t / D;
      const drift = Math.sin(u * Math.PI * 1.3) * 0.5;
      const s =
        1 +
        o.push * u +
        Math.max(0, Math.min(o.zoom, fitS[i] - o.push * u)) * actS[i] +
        0.012 * drift;
      const f = o.follow * actS[i];
      const px = W / 2 + (fxS[i] - W / 2) * (1 - f) + drift * 6;
      const py = H / 2 + (fyS[i] - H / 2) * (1 - f);
      let x = px - s * fxS[i] + (s - 1) * 0;
      let y = py - s * fyS[i];
      // without cursor activity, scale about the centre
      x = x * f + ((W - s * W) / 2) * (1 - f) + drift * (world ? 10 : 4);
      y = y * f + ((H - s * H) / 2) * (1 - f);
      x = Math.min(0, Math.max(W - s * W, x));
      y = Math.min(0, Math.max(H - s * H, y));
      return {
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        scale: Math.round(s * 10000) / 10000,
      };
    });
    const crosses = (k, r) => {
      const x0 = k.x + k.scale * r.x;
      const x1 = k.x + k.scale * (r.x + r.w);
      const y0 = k.y + k.scale * r.y;
      const y1 = k.y + k.scale * (r.y + r.h);
      return (
        (x0 < -1 && x1 > 1) ||
        (x0 < W - 1 && x1 > W + 1) ||
        (y0 < -1 && y1 > 1) ||
        (y0 < H - 1 && y1 > H + 1)
      );
    };
    // a line the piece itself already runs across the edge (a clipped card, a scroll, a reveal) is its own design
    const still = { scale: 1, x: 0, y: 0 };
    for (let i = 0; i < textBoxes.length; i++)
      textBoxes[i] = textBoxes[i].filter((r) => !crosses(still, r));
    const cut = (k, i) => textBoxes[i].some((r) => crosses(k, r));
    // when a frame would cut a line, ease toward the gentlest push-in that cuts nothing: centred, then anchored to
    // one edge (a title bar sits on the very edge), then a half push, and only then the full frame
    const fix = (k0, i) => {
      if (!cut(k0, i)) return k0;
      const bs = 1 + o.push * (ts[i] / D);
      const hs = 1 + (bs - 1) / 2;
      const cx = (W - bs * W) / 2;
      const cy = (H - bs * H) / 2;
      const targets = [
        { scale: bs, x: cx, y: cy },
        { scale: bs, x: cx, y: 0 },
        { scale: bs, x: cx, y: H - bs * H },
        { scale: bs, x: 0, y: cy },
        { scale: bs, x: W - bs * W, y: cy },
        { scale: hs, x: (W - hs * W) / 2, y: 0 },
        { scale: hs, x: (W - hs * W) / 2, y: (H - hs * H) / 2 },
        { scale: 1, x: 0, y: 0 },
      ];
      for (const t of targets) {
        for (let step = 1; step <= 10; step++) {
          const w = step / 10;
          const k = {
            scale: k0.scale * (1 - w) + t.scale * w,
            x: k0.x * (1 - w) + t.x * w,
            y: k0.y * (1 - w) + t.y * w,
          };
          if (!cut(k, i)) return k;
        }
      }
      return { scale: 1, x: 0, y: 0 };
    };
    const round = () => {
      for (const k of frames) {
        k.scale = Math.round(k.scale * 10000) / 10000;
        k.x = Math.round(k.x * 10) / 10;
        k.y = Math.round(k.y * 10) / 10;
      }
    };
    // fix, smooth so the corrections ease in and out instead of stepping, and repeat: smoothing can pull a frame back
    // over an edge for a moment, so the last pass is a fix without smoothing
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < frames.length; i++) frames[i] = fix(frames[i], i);
      for (const key of ["x", "y", "scale"]) {
        const v = smooth(
          frames.map((k) => k[key]),
          1.5,
        );
        frames.forEach((k, i) => {
          k[key] = v[i];
        });
      }
    }
    for (let i = 0; i < frames.length; i++) frames[i] = fix(frames[i], i);
    round();
    gsap.set(cam, {
      transformOrigin: "0 0",
      x: frames[0].x,
      y: frames[0].y,
      scale: frames[0].scale,
    });
    tl.to(
      cam,
      {
        keyframes: frames.slice(1).map((k) => Object.assign({ ease: "none" }, k)),
        duration: D,
        ease: "none",
      },
      0,
    );
    return tl;
  };
})();
