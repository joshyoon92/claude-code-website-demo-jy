/* CHA Figure v4 — the CareerHacker Alex logo come to life as a realistic-proportion editorial SVG rig (GSAP 3, paused + seekable).
   v4 (2026-10-03, Alex picked draft B): ~7.5 heads, turtleneck/slacks/loafers, charcoal interior lines + a rim edge. The API
   below is unchanged from v3 (rollback: `git show 8962f0f:scripts/motion-kit/brand/cha-figure.js`). The v2/v3 notes that follow describe the head.
   HEAD = THE LOGO: hair, forehead, ears, face, glasses (filled Volt Lime lenses + white glints), neck and turtleneck
   collar are the logo's own vector paths (brand/logo/cha-logo-*-tight.svg), transformed 1:1 (uniform scale 0.385; the head group is then scaled 0.9 about the chin and moved, paths untouched) — never
   redrawn. The gaps between the logo paths (the hairline, the jaw and collar lines) show the ground colour, exactly like
   the transparent logo masters. Body (v3): head ≈ 40% of the height, a slim turtleneck-sweater body (the logo's collar into
   sloped shoulders about as wide as the head, straight taper to the hips), slim capsule limbs, small round hands and shoes. The glasses are the figure's
   one lime signal. Self-contained: needs only gsap. Deterministic: no Math.random/Date/rAF; jitter uses a local PRNG.
   Canonical copy: scripts/motion-kit/brand/cha-figure.js (pieces load brand/cha-figure.js; no per-piece copies).

   ── API ──────────────────────────────────────────────────────────────────────────────────────────────────────
   CHAFigure.svg(opts) → SVG string. Put it in a sized box (the SVG fills its container; aspect 520:1040).
       opts.id      element id (required if you want to address it: sel = "#"+id)
       opts.view    "side" (default; body faces screen-right, the logo head looks at camera) | "front"
       opts.ground  "paper" (default; fill #0A0A0A, seams in paper) | "ink" (fill #1A1A1A, seams in ink, thin light outline)
       opts.seam    seam colour override (the colour BEHIND the figure: seams cut limbs apart like a sticker edge)
       opts.pivots  true → draws small joint dots (class cf-pivot, hidden by default; reveal with gsap opacity)
       opts.width / opts.height  pixel size of the <svg> (default 100% / 100%)
     Coordinates: viewBox "-260 -1000 520 1040"; floor is y = 0, the figure stands ~990 units tall (hair tip), feet at x ≈ 0.
     Facing left = put the SVG in a wrapper with scaleX(-1).

   CHAFigure.init(sel)                       sets every joint's svgOrigin (pose/set/type/walk/wave/idle/hop call it lazily).
   CHAFigure.set(sel, pose)                  jump to a pose at build time (initial state, no tween).
   CHAFigure.pose(tl, sel, pose, at, dur, ease, o) → end time.
       pose: a name (below) or an object { joint: value }. Calls must be made in time order per figure
       (the rig remembers the last scheduled pose to compute anticipation and to resume cycles).
       Overlapping action is built in: proximal joints lead, distal joints lag (elbow +0.06 s, wrist +0.11 s) and
       settle a little longer; any shoulder/hip that moves > 50° first winds up ~10% the other way (anticipation).
       o = { lag: 1 (scale the lag), anticipate: true }
   CHAFigure.type(tl, sel, from, to, o)      typing: forearms/wrists press alternately in small fast strokes, the head
                                             nods slowly. o = { seed: 1, rate: 9 (strokes/s), amp: 1, nod: true }.
                                             Use after pose "sit-type". Returns `to`.
   CHAFigure.walk(tl, sel, at, o)            bouncy walk cycle in place (legs, counter-swinging arms, pelvis bob, head
                                             sway). o = { steps: 2, step: 0.42 (s per step) }. Returns { end, stride }:
                                             move the wrapper by `stride` units per step yourself. Side view only.
   CHAFigure.wave(tl, sel, at, o)            hand wave on the near arm (pose "wave" first). o = { count: 3, period: 0.34 }.
   CHAFigure.idle(tl, sel, from, to, o)      breathing (chest rises, head bobs) + slow head tilts. Uses its own joints
                                             (breath, tilt), so it can run under any pose, typing or wave.
                                             o = { period: 1.6, amp: 1, tilt: 3 (deg), seed: 1 }. Returns `to`.
   CHAFigure.hop(tl, sel, at, o)             squash → stretch → air → squash → settle (joint squash + pelvis y).
                                             o = { height: 44, air: 0.34 }. Returns end time. Use for cheers/landings.
   CHAFigure.reach(view, side, x, y, bend)   2-bone IK: shoulder/elbow angles so the wrist lands on (x, y). side "n"|"f".
   CHAFigure.props(kind, o)                  "desk" (chair + desk + generic laptop for sit-type) | "stool": an <svg> in the
                                             figure's own units, to stack behind the figure in a box of the same size.
   CHAFigure.POSES                           { side: {...}, front: {...} } named poses (editable).
   CHAFigure.JOINTS                          joint list with pivot depth.
   CHAFigure.SEAT                            { y, x0, x1 } seat-top height and span used by sit-type and the props.

   Named poses: stand · sit-type · wave · think · cheer · point · idea (arm shot up, finger raised) · stretch (seated).
   "sit-type" exists in the side view only (front falls back to stand).
   The head is always drawn above the arms (the glasses stay visible); raised arms open out in a V beside the head.
   Joints (data-j): squash (scaleY/scaleX about the feet) · pelvis (x, y, r) · spine · breath · neck · tilt ·
   shF elF wrF (far arm) · shN elN wrN (near arm) · hipF knF anF (far leg) · hipN knN anN (near leg) ·
   finger (0/1, near hand index finger for "point"). headTop is accepted and ignored (v1 compatibility).
   Angles are SVG degrees, positive = clockwise on screen. Side view (facing right): a limb hanging down swings
   FORWARD with negative values and back with positive; knees bend with positive values. Front view: "f" = the
   screen-left limbs (outward = positive), "n" = the screen-right limbs (outward = negative).
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */
(() => {
  const LIME = "#D4F527";
  const FIG = (window.CHAFigure = {});

  function rng(seed) {
    let a = seed >>> 0 || 1;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------------------------------------------------------------- the logo, in figure units
  // brand/logo/cha-logo-lime-tight.svg paths, mapped x' = (x - 1015)·0.385, y' = (y - 1353)·0.385 − 548 (logo px, y down):
  // the chin sits at y −548 on the figure's centre line. `body` is the logo's turtleneck + shoulders; only its collar
  // (y < −516) is drawn, the chibi torso continues below it.
  const LOGO = {
    hair: "M-3.6 -988.5L-5.4 -988.2L-2.5 -986.1C6.6 -979.7 13.5 -969.7 16.8 -958.4C18.2 -953.4 18.1 -953.3 14.1 -956.7C9.4 -960.6 1.8 -965.6 -2.9 -968.0C-21.0 -977.0 -43.2 -977.5 -63.7 -969.5L-68.7 -967.5L-66.8 -967.0C-55.1 -963.8 -46.2 -959.6 -40.5 -954.7L-39.2 -953.6L-47.2 -953.1C-64.3 -952.2 -77.5 -948.8 -90.7 -941.9C-97.0 -938.6 -101.9 -935.3 -112.2 -927.6C-127.2 -916.4 -136.5 -910.7 -148.4 -905.7C-153.0 -903.7 -162.2 -900.7 -166.4 -899.7C-168.1 -899.3 -169.4 -898.9 -169.4 -898.7C-169.4 -898.3 -164.7 -894.4 -162.2 -892.6C-157.0 -889.1 -149.6 -885.8 -143.6 -884.3C-137.5 -882.8 -137.8 -883.2 -141.2 -880.8C-166.6 -862.5 -181.5 -838.9 -184.5 -811.8L-184.7 -810.2L-182.8 -811.8C-174.6 -818.9 -170.3 -821.9 -163.9 -825.0C-161.5 -826.2 -159.6 -827.0 -159.5 -827.0C-159.5 -826.9 -160.2 -824.9 -161.1 -822.5C-166.0 -809.5 -166.8 -795.8 -163.3 -782.2C-161.0 -773.6 -156.7 -763.7 -152.0 -756.7C-147.1 -749.6 -146.8 -749.3 -141.0 -746.2C-133.9 -742.3 -132.4 -741.6 -132.2 -741.8C-132.1 -741.9 -131.5 -744.7 -130.9 -747.9C-129.2 -757.3 -127.0 -766.5 -125.3 -771.7L-124.4 -774.6L-120.0 -776.3C-87.6 -788.9 -68.8 -802.6 -54.3 -824.2C-53.2 -825.8 -52.3 -827.1 -52.2 -827.1C-52.1 -827.1 -52.7 -816.3 -53.6 -806.4C-54.0 -800.6 -54.3 -795.8 -54.2 -795.7C-53.9 -795.4 -50.7 -797.4 -47.0 -800.1C-42.8 -803.1 -35.2 -810.9 -32.3 -815.2C-28.8 -820.3 -25.6 -826.2 -22.1 -834.1C-13.2 -854.4 -10.6 -859.4 -6.0 -865.1C3.3 -876.7 17.3 -881.7 30.8 -878.3C39.9 -875.9 47.3 -869.6 52.5 -859.6L54.3 -856.1L56.7 -856.8C68.3 -860.3 79.2 -856.4 84.9 -846.6C86.9 -843.2 88.4 -838.6 90.3 -830.0C94.0 -813.2 103.3 -800.8 120.9 -789.3C126.0 -785.9 125.2 -787.6 127.7 -774.6C129.3 -765.5 130.7 -756.5 131.6 -748.3C131.9 -744.9 132.4 -742.1 132.6 -742.2C132.7 -742.2 134.4 -743.4 136.3 -744.7C139.3 -747.0 139.9 -747.7 142.3 -751.5C154.0 -770.1 157.6 -789.8 153.0 -809.2C152.5 -811.3 152.2 -813.1 152.3 -813.2C152.5 -813.4 157.2 -810.8 160.4 -808.7C163.2 -806.8 166.9 -803.8 169.9 -801.0L171.8 -799.2L171.6 -804.2C171.0 -817.4 166.7 -834.2 160.8 -845.8C155.2 -857.1 145.3 -869.3 135.9 -876.4C132.2 -879.3 132.3 -879.4 137.8 -878.8C143.5 -878.1 146.8 -877.3 153.4 -875.1C156.8 -873.9 159.6 -873.1 159.7 -873.1C159.7 -873.1 159.2 -874.4 158.5 -875.9C152.9 -887.5 141.9 -899.5 130.3 -906.7C122.6 -911.6 111.1 -916.1 102.6 -917.8C99.3 -918.5 99.3 -918.5 100.1 -919.2C103.6 -921.9 113.6 -925.8 120.2 -927.1C122.3 -927.6 124.1 -928.0 124.2 -928.1C124.5 -928.4 119.3 -931.9 115.8 -933.8C98.6 -942.8 81.9 -942.6 66.1 -933.2L62.1 -930.8L61.8 -935.5C60.3 -964.9 40.4 -985.4 10.4 -988.4C6.3 -988.8 -0.4 -988.9 -3.6 -988.5Z",
    forehead:
      "M19.4 -865.7C15.2 -865.2 10.6 -862.9 7.2 -859.8C3.9 -856.9 1.1 -852.3 -3.5 -842.6C-14.6 -819.0 -19.1 -811.7 -28.2 -803.0C-39.3 -792.4 -50.6 -786.7 -72.5 -780.8C-76.8 -779.6 -85.4 -777.3 -91.6 -775.6C-102.9 -772.5 -113.9 -769.2 -114.5 -768.6C-115.7 -767.5 -122.7 -738.0 -122.0 -737.2C-121.8 -737.0 -110.4 -735.1 -110.3 -735.3C-110.2 -735.3 -109.5 -736.6 -108.6 -738.2C-97.8 -756.9 -74.8 -767.9 -53.1 -764.6C-37.0 -762.1 -22.3 -751.9 -15.5 -738.4C-14.8 -736.9 -14.1 -735.6 -14.1 -735.6C-14.0 -735.5 -12.4 -736.0 -10.5 -736.6C-1.3 -739.7 8.5 -739.6 16.3 -736.3L18.1 -735.5L19.6 -738.5C25.3 -749.0 36.8 -758.5 48.9 -762.6C57.1 -765.3 68.4 -766.2 76.3 -764.6C92.2 -761.5 106.2 -751.0 111.8 -738.1C112.8 -735.9 113.1 -735.5 113.7 -735.6C114.2 -735.8 116.3 -736.1 118.5 -736.5C122.2 -737.1 122.4 -737.2 122.4 -738.1C122.4 -741.1 119.4 -760.2 116.9 -772.3L115.7 -778.4L111.8 -781.1C95.4 -792.4 85.7 -804.5 80.9 -819.7C80.1 -822.4 78.7 -827.0 77.8 -829.8C74.8 -839.3 71.8 -843.0 65.8 -844.9C61.3 -846.2 55.3 -845.5 49.2 -842.8C48.7 -842.5 48.3 -843.1 46.9 -846.1C40.3 -860.0 30.3 -867.2 19.4 -865.7Z",
    earL: "M-155.0 -740.0C-161.0 -738.0 -165.0 -733.6 -167.6 -726.4C-168.8 -723.1 -168.8 -722.8 -168.8 -716.4C-168.8 -711.2 -168.6 -709.1 -167.9 -706.0C-165.9 -696.7 -163.2 -689.1 -159.2 -680.9C-150.7 -663.7 -141.3 -656.0 -132.0 -658.7C-130.4 -659.2 -126.4 -661.1 -125.6 -661.7C-125.5 -661.8 -125.7 -662.8 -126.0 -663.9C-130.7 -681.9 -133.2 -701.5 -133.2 -720.4C-133.2 -726.5 -133.3 -727.3 -134.0 -728.9C-134.6 -730.0 -134.8 -731.0 -134.6 -732.0C-134.4 -733.5 -134.5 -733.5 -136.9 -735.3C-138.2 -736.2 -140.8 -737.8 -142.7 -738.7C-145.8 -740.2 -146.3 -740.3 -149.8 -740.4C-152.0 -740.5 -154.0 -740.3 -155.0 -740.0Z",
    earR: "M143.5 -739.6C141.1 -738.7 137.6 -736.8 135.5 -735.1C134.7 -734.5 134.6 -734.1 134.5 -732.1C134.5 -730.4 134.3 -729.6 133.5 -728.4C132.6 -726.9 132.5 -726.4 132.3 -721.4C131.6 -704.8 127.8 -679.2 124.0 -664.8C123.2 -661.5 123.0 -661.8 127.0 -659.9C133.7 -656.7 139.1 -657.9 145.3 -664.1C151.7 -670.4 158.0 -681.8 162.2 -694.9C167.2 -710.3 167.7 -721.5 163.6 -730.0C159.5 -738.5 151.3 -742.4 143.5 -739.6Z",
    face: "M-6.0 -725.3C-11.6 -723.6 -11.0 -724.4 -11.0 -718.7C-11.0 -713.0 -11.5 -710.3 -13.1 -705.1C-18.9 -687.3 -33.3 -674.2 -52.4 -669.4C-56.1 -668.4 -57.0 -668.3 -64.3 -668.4C-71.9 -668.4 -72.3 -668.4 -76.7 -669.5C-96.9 -674.9 -111.7 -690.4 -114.6 -709.1C-115.2 -712.8 -115.1 -719.2 -114.5 -722.1C-114.3 -723.1 -114.3 -723.1 -119.0 -723.9C-121.6 -724.3 -123.8 -724.6 -123.9 -724.5C-124.0 -724.4 -124.1 -720.9 -124.1 -716.7C-123.9 -691.8 -118.1 -660.8 -109.5 -638.7C-95.9 -603.9 -58.6 -564.7 -27.7 -552.8C-14.4 -547.6 2.4 -546.5 17.2 -549.8C35.6 -553.8 52.6 -564.4 72.0 -583.8C88.2 -599.9 96.7 -612.3 104.8 -631.4C112.9 -650.2 118.3 -671.0 121.3 -694.1C123.0 -707.6 124.2 -724.8 123.4 -724.7C123.2 -724.7 121.5 -724.4 119.7 -724.0L116.5 -723.3L116.2 -717.0C115.9 -709.6 115.1 -705.7 112.3 -699.1C104.5 -680.8 85.1 -668.1 64.8 -668.1C45.5 -668.1 26.4 -679.7 18.1 -696.4C14.4 -704.0 13.3 -709.1 13.6 -717.6L13.7 -723.4L11.6 -724.3C5.8 -726.6 -0.5 -726.9 -6.0 -725.3Z",
    neckL:
      "M-90.1 -575.8L-90.1 -563.3L-88.4 -561.7C-83.9 -557.3 -74.0 -552.5 -64.8 -550.2C-59.9 -549.0 -53.0 -547.9 -50.9 -548.1C-49.3 -548.2 -49.3 -548.2 -54.0 -552.0C-65.6 -561.6 -75.5 -571.3 -84.1 -581.3C-86.6 -584.3 -89.0 -587.0 -89.4 -587.5C-90.1 -588.2 -90.1 -587.9 -90.1 -575.8Z",
    neckR:
      "M85.6 -582.0C76.4 -571.6 65.9 -561.6 54.9 -552.8L48.7 -547.9L52.4 -548.2C66.8 -549.1 83.0 -555.4 89.8 -562.5C90.9 -563.6 90.9 -563.6 90.8 -575.7L90.7 -587.7L85.6 -582.0Z",
    body: "M-99.4 -564.1C-105.0 -562.3 -108.8 -559.0 -109.9 -555.2C-110.2 -554.1 -111.7 -545.8 -113.0 -536.6C-114.4 -527.6 -115.8 -519.5 -116.2 -518.9C-117.0 -517.0 -119.5 -514.3 -122.2 -512.3C-124.8 -510.6 -130.9 -507.6 -158.0 -495.0C-188.0 -481.0 -199.4 -475.0 -211.7 -466.2C-232.6 -451.4 -246.9 -431.2 -255.6 -403.9C-258.5 -395.0 -261.8 -379.4 -261.8 -375.3C-261.8 -373.5 -260.0 -371.7 -257.1 -370.6C-251.3 -368.4 -221.5 -363.2 -198.9 -360.4C-117.6 -350.2 19.8 -347.6 129.9 -354.2C182.5 -357.3 228.3 -363.0 255.7 -369.7C265.3 -372.1 268.2 -373.9 267.8 -377.2C265.5 -394.0 263.6 -401.9 259.0 -413.6C252.8 -429.3 244.9 -441.7 234.1 -452.6C220.3 -466.4 210.7 -472.0 165.7 -492.8C128.3 -510.0 122.5 -512.9 119.2 -516.3C116.5 -519.0 116.7 -518.4 113.0 -540.0C111.6 -548.1 110.1 -555.4 109.8 -556.3C108.3 -559.7 104.3 -562.8 99.8 -564.2C96.6 -565.2 96.6 -565.2 96.6 -563.5C96.6 -551.5 65.4 -539.0 25.0 -534.7C-13.2 -530.8 -58.9 -536.5 -82.2 -548.1C-91.5 -552.8 -95.2 -556.7 -95.8 -562.6L-96.1 -565.3L-99.4 -564.1Z",
    glasses:
      "M60.6 -765.1C43.0 -763.1 26.6 -752.2 19.2 -737.7L18.1 -735.5L15.8 -736.5C7.6 -739.7 -1.8 -739.6 -11.5 -736.3C-12.8 -735.8 -14.0 -735.5 -14.0 -735.5C-14.1 -735.6 -14.6 -736.6 -15.2 -737.8C-23.8 -755.0 -43.0 -765.9 -63.1 -765.0C-74.0 -764.5 -83.7 -761.3 -93.0 -755.0C-99.2 -750.8 -106.0 -743.3 -109.0 -737.3C-109.9 -735.6 -110.3 -735.1 -110.8 -735.2C-111.2 -735.3 -115.2 -736.0 -119.8 -736.6C-127.1 -737.8 -128.3 -737.9 -129.7 -737.5C-134.1 -736.1 -136.0 -731.6 -133.6 -728.2C-132.3 -726.3 -131.0 -725.9 -122.5 -724.5C-118.2 -723.8 -114.5 -723.1 -114.5 -723.0C-114.4 -722.9 -114.5 -721.1 -114.8 -718.9C-117.5 -695.4 -97.3 -672.2 -70.9 -668.5C-66.5 -667.9 -57.4 -668.2 -53.1 -669.2C-28.7 -674.8 -11.2 -695.5 -11.0 -718.9L-11.0 -723.7L-7.9 -724.8C-1.5 -727.0 4.3 -726.9 10.6 -724.7L13.8 -723.5L13.6 -717.7C13.3 -709.2 14.4 -703.9 18.2 -696.4C25.2 -682.5 39.0 -672.2 55.3 -669.0C60.0 -668.1 69.4 -668.1 74.1 -669.0C93.2 -672.8 107.8 -685.4 114.0 -703.5C115.3 -707.4 116.0 -711.4 116.2 -717.4C116.5 -724.3 115.5 -723.3 124.3 -724.9C127.7 -725.5 130.6 -726.3 131.4 -726.8C135.7 -729.1 135.5 -735.1 131.1 -737.2C129.6 -737.9 126.5 -737.9 122.6 -737.2C122.0 -737.1 119.6 -736.7 117.3 -736.3C115.0 -735.8 113.0 -735.5 113.0 -735.6C112.9 -735.6 112.3 -736.9 111.7 -738.3C103.6 -756.2 81.9 -767.6 60.6 -765.1ZM-70.3 -744.2C-69.6 -743.5 -69.3 -742.8 -69.3 -742.0C-69.3 -740.8 -70.4 -739.7 -80.6 -729.5C-92.2 -717.9 -92.5 -717.6 -94.5 -718.4C-95.4 -718.7 -96.2 -720.7 -96.0 -721.8C-95.9 -722.2 -90.8 -727.7 -84.8 -733.9C-74.7 -744.1 -73.6 -745.1 -72.5 -745.1C-71.6 -745.1 -70.9 -744.8 -70.3 -744.2ZM57.9 -744.2C58.6 -743.6 58.9 -742.8 58.9 -742.0C58.9 -740.9 57.8 -739.6 47.6 -729.5C37.5 -719.3 36.3 -718.2 35.1 -718.2C33.4 -718.2 32.3 -719.3 32.3 -721.2C32.3 -722.7 32.7 -723.1 43.4 -734.0C53.5 -744.2 54.6 -745.2 55.7 -745.1C56.6 -745.1 57.4 -744.8 57.9 -744.2Z",
    glintL:
      "M-84.8 -733.9C-90.8 -727.7 -95.9 -722.2 -96.0 -721.8C-96.2 -720.7 -95.4 -718.7 -94.5 -718.4C-92.5 -717.6 -92.2 -717.9 -80.6 -729.5C-70.4 -739.7 -69.3 -740.8 -69.3 -742.0C-69.3 -743.7 -70.8 -745.1 -72.5 -745.1C-73.6 -745.1 -74.7 -744.1 -84.8 -733.9Z",
    glintR:
      "M43.4 -734.0C32.7 -723.1 32.3 -722.7 32.3 -721.2C32.3 -719.3 33.4 -718.2 35.1 -718.2C36.3 -718.2 37.5 -719.3 47.6 -729.5C57.8 -739.6 58.9 -740.9 58.9 -742.0C58.9 -743.7 57.4 -745.1 55.7 -745.1C54.6 -745.2 53.5 -744.2 43.4 -734.0Z",
  };

  // ---------------------------------------------------------------- neutral geometry (v4, standing, arms down)
  // v4 (Alex 2026-10-03 picked draft B, figure-v4/figure-v4-B-editorial.png): real adult proportions, ~7.5 heads. The logo
  // head is 150 units of the 990 (hair tip to chin), a fitted turtleneck sweater with ribbed collar/cuffs/hem, slim
  // tailored trousers with a crease, loafers with a sole line and a shine, and hands with a thumb. Flat #0A0A0A with
  // restrained charcoal interior lines and one cool rim edge on the back contour (an SVG filter on the silhouette).
  const HS = 0.37;
  const CHIN = -830;
  const HEAD_T = `translate(0 ${CHIN}) scale(${HS}) translate(0 548)`;
  // Alex 2026-10-03 "키를 조금만 줄이자": the body below the neck is drawn 7% smaller (uniformly, about the floor) while
  // the head keeps its size, so the figure stands ~6% shorter (≈5.7 heads incl. hair). Joints keep their local coordinates.
  const BS = 0.93;
  const HAND_OFF = 56;
  const HEAD_SW = 3 / HS;
  const NECK = [0, -812];
  const HIP_Y = -500; // B-measured: crotch at 52% from the top, sweater hem at 46%
  function geo(view) {
    if (view === "front")
      return {
        pelvis: [0, HIP_Y],
        spine: [0, HIP_Y],
        neck: NECK,
        sh: { f: [-100, -750], n: [100, -750] },
        el: { f: [-106, -565], n: [106, -565] },
        wr: { f: [-102, -415], n: [102, -415] },
        hip: { f: [-44, HIP_Y], n: [44, HIP_Y] },
        kn: { f: [-44, -274], n: [44, -274] },
        an: { f: [-44, -48], n: [44, -48] },
      };
    return {
      pelvis: [0, HIP_Y],
      spine: [0, HIP_Y],
      neck: NECK,
      sh: { f: [-6, -772], n: [6, -768] },
      el: { f: [-6, -587], n: [6, -583] },
      wr: { f: [-6, -437], n: [6, -433] },
      hip: { f: [-10, HIP_Y], n: [10, HIP_Y] },
      kn: { f: [-10, -274], n: [10, -274] },
      an: { f: [-10, -48], n: [10, -48] },
    };
  }
  const LEN = { up: 185, fore: 150, thigh: 226, shin: 226 };
  // seated: thigh level, shin vertical, shoe on the floor → hip at −274 (pelvis +226), thigh underside at −240
  const SEAT = (FIG.SEAT = { y: -240, x0: -100, x1: 140 });

  const JOINTS = [
    // name, depth (lag order)
    ["pelvis", 0],
    ["spine", 0],
    ["neck", 1],
    ["shF", 0],
    ["elF", 1],
    ["wrF", 2],
    ["shN", 0],
    ["elN", 1],
    ["wrN", 2],
    ["hipF", 0],
    ["knF", 1],
    ["anF", 2],
    ["hipN", 0],
    ["knN", 1],
    ["anN", 2],
    ["finger", 3],
  ];
  FIG.JOINTS = JOINTS;

  const r1 = (v) => Math.round(v * 10) / 10;
  // a tapered limb segment a→b (width w1 at a, w2 at b) with round ends, so consecutive segments read as one limb
  function seg(a, b, w1, w2, col, grow) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L;
    const ny = dx / L;
    const h1 = w1 / 2 + grow;
    const h2 = w2 / 2 + grow;
    const P = [
      [a[0] + nx * h1, a[1] + ny * h1],
      [b[0] + nx * h2, b[1] + ny * h2],
      [b[0] - nx * h2, b[1] - ny * h2],
      [a[0] - nx * h1, a[1] - ny * h1],
    ];
    return (
      `<path d="M${P.map((q) => `${r1(q[0])} ${r1(q[1])}`).join(" L")} Z" fill="${col}"/>` +
      `<circle cx="${a[0]}" cy="${a[1]}" r="${r1(h1)}" fill="${col}"/><circle cx="${b[0]}" cy="${b[1]}" r="${r1(h2)}" fill="${col}"/>`
    );
  }
  function line(pts, col, w) {
    return `<path d="M${pts.map((q) => `${r1(q[0])} ${r1(q[1])}`).join(" L")}" stroke="${col}" stroke-width="${w || 2.5}" stroke-linecap="round" fill="none"/>`;
  }
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  function dot(p, show) {
    return show
      ? `<circle class="cf-pivot" cx="${p[0]}" cy="${p[1]}" r="10" fill="#FFFFFF" stroke="#0A0A0A" stroke-width="4" opacity="0"/>`
      : "";
  }

  // loafer: sole line, low vamp and a toe shine (profile) / a domed toe (front)
  function shoe(view, side, an, col, grow, ln, shine) {
    const [x, y] = an;
    const yb = y + 48 + grow;
    const g = grow;
    if (view === "front") {
      const s = side === "f" ? -1 : 1;
      const cx = x + 4 * s;
      const hw = 30 + g;
      const yt = y - 4 - g;
      return `<path d="M${cx - hw} ${yb} L${cx + hw} ${yb} C${cx + hw + 3} ${yb - 30} ${cx + 18} ${yt} ${cx} ${yt} C${cx - 18} ${yt} ${cx - hw - 3} ${yb - 30} ${cx - hw} ${yb} Z" fill="${col}"/>${
        g
          ? ""
          : `${line(
              [
                [cx - hw + 4, yb - 6],
                [cx + hw - 4, yb - 6],
              ],
              ln,
              2,
            )}<ellipse cx="${cx - 8 * s}" cy="${yb - 22}" rx="7" ry="3" fill="${shine}"/>`
      }`;
    }
    const d =
      `M${x - 34 - g} ${yb} L${x + 88 + g} ${yb} C${x + 104 + g} ${yb} ${x + 104 + g} ${yb - 16} ${x + 92} ${yb - 22 - g}` +
      ` C${x + 70} ${yb - 32 - g} ${x + 40} ${yb - 42 - g} ${x + 18} ${y - g} L${x - 26} ${y - 2 - g} C${x - 38 - g} ${y} ${x - 38 - g} ${yb - 10} ${x - 34 - g} ${yb} Z`;
    return `<path d="${d}" fill="${col}"/>${
      g
        ? ""
        : `${
            line(
              [
                [x - 30, yb - 7],
                [x + 92, yb - 7],
              ],
              ln,
              2,
            ) +
            line(
              [
                [x + 14, y + 4],
                [x + 40, y + 14],
              ],
              ln,
              2,
            )
          }<ellipse cx="${x + 70}" cy="${yb - 24}" rx="14" ry="4" transform="rotate(-14 ${x + 70} ${yb - 24})" fill="${shine}"/>`
    }`;
  }

  // hand from the wrist: palm and fingers as one tapered mass, a thumb towards the front (profile) or the body (front)
  function hand(view, W, col, grow, side) {
    const [x, y] = W;
    const g = grow;
    const s = view === "front" ? (side === "f" ? 1 : -1) : 1;
    const palm =
      `M${x - 17 * s - g * s} ${y - 4} L${x + 17 * s + g * s} ${y - 4} C${x + 21 * s + g * s} ${y + 22} ${x + 20 * s + g * s} ${y + 46} ${x + 13 * s} ${y + 66 + g}` +
      ` C${x + 8 * s} ${y + 78 + g} ${x - 7 * s} ${y + 80 + g} ${x - 12 * s - g * s} ${y + 68} C${x - 19 * s - g * s} ${y + 50} ${x - 21 * s - g * s} ${y + 22} ${x - 17 * s - g * s} ${y - 4} Z`;
    const thumb = `M${x + 12 * s} ${y + 10} C${x + 27 * s + g * s} ${y + 16} ${x + 32 * s + g * s} ${y + 32} ${x + 25 * s + g * s} ${y + 44 + g} C${x + 20 * s} ${y + 49 + g} ${x + 13 * s} ${y + 44} ${x + 11 * s} ${y + 32} Z`;
    return `<path d="${palm}" fill="${col}"/><path d="${thumb}" fill="${col}"/>`;
  }

  // a limb is drawn twice with the same joint names: the seam pass (a thin charcoal edge) under the fill pass, so
  // limbs separate from what is behind them while the joints of one limb stay one continuous soft shape
  function arm(view, g, side, fill, seam, ln, pivots, withFinger) {
    const S = g.sh[side];
    const E = g.el[side];
    const W = g.wr[side];
    const U = side.toUpperCase();
    const one = (pass) => {
      const col = pass ? seam : fill;
      const gr = pass ? 2.5 : 0;
      const finger = withFinger
        ? `<g data-j="finger">${seg([W[0] + 2, W[1] + 50], [W[0] + 2, W[1] + 108], 14 + 2 * gr, 12 + 2 * gr, col, 0)}</g>`
        : "";
      const cuff = pass
        ? ""
        : line(
            [
              lerp(E, W, 0.8).map((v, i) => v + (i ? 0 : -17)),
              lerp(E, W, 0.8).map((v, i) => v + (i ? 0 : 17)),
            ],
            ln,
            2,
          ) +
          line(
            [
              lerp(E, W, 0.88).map((v, i) => v + (i ? 0 : -16)),
              lerp(E, W, 0.88).map((v, i) => v + (i ? 0 : 16)),
            ],
            ln,
            2,
          ) +
          line([lerp(S, E, 0.25), lerp(S, E, 0.55)], ln, 2);
      return `<g data-j="sh${U}" data-o="${S[0]} ${S[1]}">${seg(S, E, 52, 44, col, gr)}<g data-j="el${U}" data-o="${E[0]} ${E[1]}">${seg(E, W, 44, 37, col, gr)}${cuff}<g data-j="wr${U}" data-o="${W[0]} ${W[1]}">${finger}${hand(view, W, col, gr, side)}</g>${pass ? "" : dot(W, pivots)}</g>${pass ? "" : dot(E, pivots)}</g>${pass ? "" : dot(S, pivots)}`;
    };
    return one(true) + one(false);
  }

  function leg(view, g, side, fill, seam, ln, shine, pivots) {
    const H = g.hip[side];
    const K = g.kn[side];
    const A = g.an[side];
    const U = side.toUpperCase();
    const one = (pass) => {
      const col = pass ? seam : fill;
      const gr = pass ? 2.5 : 0;
      // the crease runs down the front of the trouser; the hem breaks once over the loafer
      const cx = view === "front" ? 0 : 14;
      const crease = pass
        ? ""
        : line(
            [
              [H[0] + cx, H[1] + 40],
              [K[0] + cx, K[1]],
            ],
            ln,
            2,
          );
      const crease2 = pass
        ? ""
        : line(
            [
              [K[0] + cx, K[1]],
              [A[0] + cx * 0.8, A[1] - 6],
            ],
            ln,
            2,
          );
      return `<g data-j="hip${U}" data-o="${H[0]} ${H[1]}">${seg(H, K, 82, 58, col, gr)}${crease}<g data-j="kn${U}" data-o="${K[0]} ${K[1]}">${seg(K, [A[0], A[1] - 8], 58, 50, col, gr)}${crease2}<g data-j="an${U}" data-o="${A[0]} ${A[1]}">${shoe(view, side, A, col, gr, ln, shine)}</g>${pass ? "" : dot(A, pivots)}</g>${pass ? "" : dot(K, pivots)}</g>${pass ? "" : dot(H, pivots)}`;
    };
    return one(true) + one(false);
  }

  // the logo head: thin charcoal gaps (the logo's hairline/jaw lines) under the logo fills, then the lime glasses
  function head(fill, seam) {
    const parts = [LOGO.hair, LOGO.forehead, LOGO.earL, LOGO.earR, LOGO.face];
    // the body group is scaled by BS; scale the head back up about the neck so it keeps its size
    return `<g class="cf-head" transform="translate(0 ${NECK[1]}) scale(${r1((1 / BS) * 1000) / 1000}) translate(0 ${-NECK[1]}) ${HEAD_T}"><g fill="${seam}" stroke="${seam}" stroke-width="${HEAD_SW}" stroke-linejoin="round">${parts.map((d) => `<path d="${d}"/>`).join("")}</g><g fill="${fill}">${parts.map((d) => `<path d="${d}"/>`).join("")}</g><path class="cf-glasses" d="${LOGO.glasses}" fill="${LIME}"/><g fill="#FFFFFF"><path d="${LOGO.glintL}"/><path d="${LOGO.glintR}"/></g></g>`;
  }

  // fitted turtleneck sweater over the trouser seat: shoulders, a gentle chest, a straight waist, a ribbed hem
  function torso(view, fill, ln) {
    const front = view === "front";
    const body = front
      ? "M-42 -808 C-66 -802 -94 -792 -110 -778 C-124 -764 -126 -742 -122 -722 L-100 -640 C-94 -600 -92 -570 -94 -530 L94 -530 C92 -570 94 -600 100 -640 L122 -722 C126 -742 124 -764 110 -778 C94 -792 66 -802 42 -808 Z"
      : "M-26 -808 C-48 -802 -62 -786 -64 -760 C-66 -720 -58 -690 -52 -650 L-48 -590 C-50 -565 -52 -548 -54 -530 L56 -530 C54 -555 52 -580 52 -605 C54 -650 68 -690 66 -730 C64 -770 46 -800 26 -808 Z";
    const seat = front
      ? "M-90 -544 L90 -544 L88 -478 Q44 -466 0 -478 Q-44 -466 -88 -478 Z"
      : "M-52 -544 L56 -544 L54 -478 Q10 -462 -58 -482 Z";
    const hw = front ? 90 : 54;
    const hx = front ? 0 : 1;
    let rib = line(
      [
        [hx - hw, -552],
        [hx + hw, -552],
      ],
      ln,
      2,
    );
    for (let x = -hw + 10; x < hw - 4; x += 14)
      rib += line(
        [
          [hx + x, -548],
          [hx + x, -534],
        ],
        ln,
        1.5,
      );
    // collar: a soft tube under the chin with vertical ribs
    const cw = front ? 42 : 34;
    let collar = `<path d="M${-cw} -838 L${cw} -838 L${cw + 6} -796 L${-cw - 6} -796 Z" fill="${fill}"/>`;
    for (let x = -cw + 8; x < cw; x += 10)
      collar += line(
        [
          [x, -834],
          [x * 1.1, -800],
        ],
        ln,
        1.5,
      );
    collar += line(
      [
        [-cw - 4, -808],
        [cw + 4, -808],
      ],
      ln,
      2,
    );
    const chest = front
      ? line(
          [
            [-60, -640],
            [-30, -610],
          ],
          ln,
          2,
        ) +
        line(
          [
            [60, -640],
            [30, -610],
          ],
          ln,
          2,
        )
      : line(
          [
            [40, -700],
            [30, -620],
          ],
          ln,
          2,
        );
    return `<path d="${seat}" fill="${fill}"/><path d="${body}" fill="${fill}"/>${rib}${chest}${collar}`;
  }

  let uid = 0;
  FIG.svg = (opts) => {
    const o = Object.assign(
      {
        id: "",
        view: "side",
        ground: "paper",
        seam: null,
        pivots: false,
        width: "100%",
        height: "100%",
      },
      opts || {},
    );
    const ink = o.ground === "ink";
    const fill = ink ? "#1A1A1A" : "#0A0A0A";
    const farFill = ink ? "#141414" : "#1C1C1C"; // far limbs a step apart for depth
    const ln = ink ? "#2F2F2F" : "#2A2A2A"; // editorial interior lines (ribs, creases, cuffs)
    const seam = o.seam || ln;
    const shine = ink ? "#4A4A4A" : "#3C3C3C";
    const rim = ink ? "#B8C0C8" : "#8E959E";
    const g = geo(o.view);
    const n = ++uid;
    const fid = `cfo${n}`;
    // rim: the silhouette's back (screen-left) edge picks up a thin cool light; ink adds a faint outline to separate
    const defs = `<defs><filter id="${fid}" x="-20%" y="-10%" width="140%" height="120%"><feOffset in="SourceAlpha" dx="4" dy="1" result="off"/><feComposite in="SourceAlpha" in2="off" operator="out" result="edge"/><feFlood flood-color="${rim}" flood-opacity="${ink ? 0.8 : 0.65}"/><feComposite in2="edge" operator="in" result="rim"/>${
      ink
        ? `<feMorphology in="SourceAlpha" operator="dilate" radius="2.5" result="d"/><feFlood flood-color="#5A5A5A"/><feComposite in2="d" operator="in" result="o"/>` +
          `<feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/><feMergeNode in="rim"/></feMerge>`
        : `<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="rim"/></feMerge>`
    }</filter></defs>`;
    const side = o.view !== "front";
    const body = `<g transform="scale(${BS})"><g data-j="squash" data-o="0 0"><g data-j="pelvis" data-o="${g.pelvis[0]} ${g.pelvis[1]}">${leg(o.view, g, "f", side ? farFill : fill, seam, ln, shine, o.pivots)}${leg(o.view, g, "n", fill, seam, ln, shine, o.pivots)}<g data-j="spine" data-o="${g.spine[0]} ${g.spine[1]}"><g data-j="breath" data-o="${g.spine[0]} ${g.spine[1]}">${side ? arm(o.view, g, "f", farFill, seam, ln, o.pivots, false) : ""}${torso(o.view, fill, ln)}${side ? "" : arm(o.view, g, "f", fill, seam, ln, o.pivots, false)}${arm(o.view, g, "n", fill, seam, ln, o.pivots, true)}<g data-j="neck" data-o="${g.neck[0]} ${g.neck[1]}"><g data-j="tilt" data-o="${g.neck[0]} ${g.neck[1]}">${head(fill, seam)}</g></g>${dot(g.neck, o.pivots)}</g></g>${dot(g.spine, o.pivots)}</g></g>`;
    return (
      `<svg class="cf" ${o.id ? `id="${o.id}"` : ""} data-view="${o.view}" data-rig="v4" xmlns="http://www.w3.org/2000/svg" viewBox="-260 -1000 520 1040" ` +
      `width="${o.width}" height="${o.height}" overflow="visible" style="overflow:visible;display:block">${defs}` +
      `<g class="cf-root" filter="url(#${fid})">${body}</g></g></svg>`
    );
  };

  // ---------------------------------------------------------------- props (same viewBox as the figure)
  // CHAFigure.props(kind, o) → an <svg> string in figure units ("-260 -1000 520 1040"), to stack BEHIND the figure in a box
  // of the same size. kind "desk": chair + desk + generic laptop sized for pose "sit-type" (v4: hands land at ≈ x 230, y −400).
  //   o = { ground: "paper"|"ink", chair: true, laptop: true }
  // kind "stool": the seat only.
  FIG.props = (kind, opts) => {
    const o = Object.assign({ ground: "paper", chair: true, laptop: true }, opts || {});
    const ink = o.ground === "ink";
    const slab = ink ? "#2A2A2A" : "#D6D5CE";
    const leg = ink ? "#222222" : "#C4C3BC";
    const lapF = ink ? "#E9E9E9" : "#FFFFFF";
    const lapS = "#0A0A0A";
    const S = SEAT;
    const TOP = -376;
    let g = "";
    if (kind === "stool" || (kind === "desk" && o.chair)) {
      g += `<g class="cf-chair"><rect x="${S.x0}" y="${S.y}" width="${S.x1 - S.x0}" height="22" rx="11" fill="${slab}"/><rect x="${S.x0 + 18}" y="${S.y + 20}" width="18" height="${-S.y - 20}" rx="4" fill="${leg}"/><rect x="${S.x1 - 36}" y="${S.y + 20}" width="18" height="${-S.y - 20}" rx="4" fill="${leg}"/>${
        kind === "desk"
          ? `<rect x="${S.x0 - 8}" y="${S.y - 330}" width="22" height="342" rx="11" fill="${leg}"/>`
          : ""
      }</g>`;
    }
    if (kind === "desk") {
      g +=
        `<g class="cf-desk"><rect x="${500}" y="${TOP}" width="20" height="${-TOP}" fill="${leg}"/><rect x="${300}" y="${TOP}" width="20" height="${-TOP}" fill="${leg}"/>` +
        `<rect x="${196}" y="${TOP - 17}" width="340" height="18" rx="6" fill="${slab}"/></g>`;
      if (o.laptop) {
        g +=
          `<g class="cf-laptop"><rect x="${206}" y="${TOP - 31}" width="190" height="16" rx="6" fill="${lapF}" stroke="${lapS}" stroke-width="6"/>` +
          `<g class="cf-lid" transform="rotate(14 ${388} ${TOP - 27})"><rect x="${376}" y="${TOP - 197}" width="24" height="172" rx="8" fill="${lapF}" stroke="${lapS}" stroke-width="6"/></g></g>`;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-260 -1000 520 1040" width="100%" height="100%" overflow="visible" style="overflow:visible;display:block"><g transform="scale(${BS})">${g}</g></svg>`;
  };

  // ---------------------------------------------------------------- IK
  FIG.reach = (view, side, x, y, bend) => {
    const g = geo(view);
    const S = g.sh[side];
    const a = LEN.up;
    const b = LEN.fore;
    const dx = x - S[0];
    const dy = y - S[1];
    let d = Math.hypot(dx, dy);
    d = Math.min(Math.max(d, Math.abs(a - b) + 1), a + b - 1);
    const base = Math.atan2(-dx, dy); // angle that rotates "down" onto (dx,dy)
    const alpha = Math.acos((a * a + d * d - b * b) / (2 * a * d));
    const beta = Math.acos((a * a + b * b - d * d) / (2 * a * b));
    const s = bend >= 0 ? 1 : -1;
    const sh = base + s * alpha;
    const el = -s * (Math.PI - beta);
    const deg = 180 / Math.PI;
    return { sh: sh * deg, el: el * deg };
  };

  // ---------------------------------------------------------------- poses
  const think_f = FIG.reach("front", "n", 34, -812, -1); // v4: hand under the chin (chin at −830)
  const SIT = { pelvis: { y: 226, x: 0 }, hipF: -86, knF: 86, anF: 0, hipN: -90, knN: 90, anN: 0 };
  const POSES = (FIG.POSES = {
    side: {
      stand: { shF: 5, elF: 0, shN: -5, elN: 0, wrN: 0, wrF: 0 },
      "sit-type": Object.assign({}, SIT, {
        spine: 7,
        neck: 4,
        shF: -26,
        elF: -84,
        wrF: 6,
        shN: -30,
        elN: -80,
        wrN: 6,
      }),
      wave: { shF: 5, elF: -6, shN: -110, elN: -40, wrN: -8, neck: -4, spine: -2 },
      think: { shN: -20, elN: -150, wrN: -10, shF: 6, elF: -8, wrF: 0, neck: -9, spine: -2 },
      cheer: {
        pelvis: { y: -6 },
        shF: 150,
        elF: 10,
        shN: -150,
        elN: -10,
        wrN: 0,
        wrF: 0,
        neck: -6,
        spine: -3,
      }, // v4: long arms stay above the head
      point: { shN: -86, elN: -4, wrN: -8, finger: 1, shF: 8, elF: -10, neck: 4, spine: 2 },
      idea: {
        pelvis: { y: -10 },
        shN: -128,
        elN: -8,
        wrN: -6,
        finger: 1,
        shF: 10,
        elF: -16,
        neck: -6,
        spine: -3,
      },
      stretch: Object.assign({}, SIT, {
        spine: -6,
        neck: -8,
        shF: 166,
        elF: 8,
        wrF: -10,
        shN: -162,
        elN: -8,
        wrN: -10,
      }),
    },
    front: {
      stand: { shF: 6, elF: 0, shN: -6, elN: 0 },
      // v4: a natural "hi" — upper arm out 40°, forearm up beside the head (long real arms no longer swing wide)
      wave: { shF: 6, elF: 0, shN: -40, elN: -130, wrN: -6, neck: 6, spine: 2 },
      think: { shN: think_f.sh, elN: think_f.el, wrN: 10, shF: -22, elF: -86, neck: 8 },
      cheer: { pelvis: { y: -6 }, shF: 140, elF: 15, shN: -140, elN: -15, neck: 0 },
      point: { shN: -88, elN: -4, finger: 1, neck: 5, spine: 2 },
      idea: {
        pelvis: { y: -10 },
        shN: -155,
        elN: -8,
        wrN: 0,
        finger: 1,
        shF: 8,
        elF: -6,
        wrF: 0,
        neck: -4,
        spine: -2,
      },
    },
  });
  POSES.front["sit-type"] = POSES.front.stand;
  POSES.front.stretch = POSES.front.cheer;

  // ---------------------------------------------------------------- state
  const STATE = {};
  function rec(sel) {
    mergeMocapPoses();
    if (STATE[sel]) return STATE[sel];
    const root = document.querySelector(sel);
    if (!root) throw new Error(`CHAFigure: no element ${sel}`);
    const els = {};
    // a joint name maps to several elements (seam pass + fill pass); GSAP takes the array
    for (const e of root.querySelectorAll("[data-j]")) {
      const k = e.getAttribute("data-j");
      (els[k] = els[k] || []).push(e);
    }
    for (const k of Object.keys(els)) {
      for (const e of els[k]) {
        const o = e.getAttribute("data-o");
        if (o) gsap.set(e, { svgOrigin: o });
      }
    }
    if (els.finger) {
      const W = els.wrN[0].getAttribute("data-o").split(" ").map(Number);
      gsap.set(els.finger, { svgOrigin: `${W[0]} ${W[1] + HAND_OFF}`, scaleY: 0 });
    }
    const v = {};
    for (const j of JOINTS) {
      v[j[0]] = j[0] === "pelvis" ? { x: 0, y: 0, r: 0 } : 0;
    }
    return (STATE[sel] = {
      root: root,
      view: root.getAttribute("data-view") || "side",
      els: els,
      v: v,
    });
  }
  FIG.init = (sel) => rec(sel);

  function resolve(st, pose) {
    const p = typeof pose === "string" ? (POSES[st.view] || POSES.side)[pose] : pose;
    if (!p) throw new Error(`CHAFigure: unknown pose ${pose}`);
    // every joint not named returns to neutral, so a named pose is a complete pose
    const out = {};
    for (const j of JOINTS) {
      const k = j[0];
      if (k === "pelvis") {
        const pp = p.pelvis || {};
        out.pelvis = { x: pp.x || 0, y: pp.y || 0, r: pp.r || 0 };
      } else out[k] = p[k] != null ? p[k] : 0;
    }
    return out;
  }

  function apply(st, k, val, tl, at, dur, ease) {
    const el = st.els[k];
    if (!el) return;
    if (k === "pelvis") {
      const props = { x: val.x, y: val.y, rotation: val.r };
      if (tl) tl.to(el, Object.assign(props, { duration: dur, ease: ease }), at);
      else gsap.set(el, props);
    } else if (k === "finger") {
      if (tl) tl.to(el, { scaleY: val, duration: dur, ease: "back.out(2)" }, at);
      else gsap.set(el, { scaleY: val });
    } else {
      if (tl) tl.to(el, { rotation: val, duration: dur, ease: ease }, at);
      else gsap.set(el, { rotation: val });
    }
  }

  FIG.set = (sel, pose) => {
    const st = rec(sel);
    const p = resolve(st, pose);
    for (const j of JOINTS) {
      apply(st, j[0], p[j[0]]);
    }
    st.v = p;
  };

  FIG.pose = (tl, sel, pose, at, duration, easing, opts) => {
    const st = rec(sel);
    const o = Object.assign({ lag: 1, anticipate: true }, opts || {});
    const dur = duration || 0.6;
    const ease = easing || "power2.inOut";
    const p = resolve(st, pose);
    let end = at + dur;
    for (const j of JOINTS) {
      const k = j[0];
      const depth = j[1];
      const from = st.v[k];
      const to = p[k];
      const same =
        k === "pelvis" ? from.x === to.x && from.y === to.y && from.r === to.r : from === to;
      if (same) continue;
      const delay = [0, 0.06, 0.11, 0.16][depth] * o.lag;
      const d = dur * (1 + depth * 0.08);
      const t0 = at + delay;
      const delta = k === "pelvis" ? 0 : to - from;
      if (o.anticipate && k !== "finger" && depth === 0 && Math.abs(delta) > 50) {
        const wind = dur * 0.22;
        apply(st, k, from - delta * 0.1, tl, t0, wind, "power1.out");
        apply(st, k, to, tl, t0 + wind, d - wind, ease);
      } else {
        apply(st, k, to, tl, t0, d, ease);
      }
      end = Math.max(end, t0 + d);
    }
    st.v = p;
    return end;
  };

  // typing: alternate presses on the two forearms, wrists flick, head nods slowly
  FIG.type = (tl, sel, from, to, opts) => {
    const st = rec(sel);
    const o = Object.assign({ seed: 1, rate: 9, amp: 1, nod: true }, opts || {});
    const r = rng(o.seed);
    const b = st.v;
    let t = from;
    let n = 0;
    while (t < to - 0.08) {
      const side = (n % 2 === 0) !== r() < 0.22 ? "N" : "F"; // mostly alternating, sometimes a double tap
      const press = (2.6 + r() * 2.4) * o.amp;
      const flick = (6 + r() * 7) * o.amp;
      const dn = 0.045 + r() * 0.02;
      const up = 0.06 + r() * 0.03;
      tl.to(
        st.els[`el${side}`],
        { rotation: b[`el${side}`] + press, duration: dn, ease: "power2.in" },
        t,
      );
      tl.to(
        st.els[`wr${side}`],
        { rotation: b[`wr${side}`] + flick, duration: dn, ease: "power2.in" },
        t + 0.012,
      );
      tl.to(
        st.els[`el${side}`],
        { rotation: b[`el${side}`], duration: up, ease: "power2.out" },
        t + dn,
      );
      tl.to(
        st.els[`wr${side}`],
        { rotation: b[`wr${side}`], duration: up, ease: "power2.out" },
        t + dn + 0.012,
      );
      t += (1 / o.rate) * (0.75 + r() * 0.5) * (r() < 0.08 ? 2.2 : 1); // occasional pause between words
      n++;
    }
    if (o.nod) {
      for (let tt = from, k = 0; tt < to - 0.3; tt += 0.62, k++) {
        tl.to(
          st.els.neck,
          { rotation: b.neck + (k % 2 ? -2 : 3), duration: 0.31, ease: "sine.inOut" },
          tt,
        );
      }
      tl.to(
        st.els.neck,
        { rotation: b.neck, duration: 0.25, ease: "sine.inOut" },
        Math.max(from, to - 0.3),
      );
    }
    return to;
  };

  // walk cycle in place; caller moves the wrapper `stride` units per step. Bouncy: a deeper pelvis dip on contact,
  // a lift on passing, and the head sways a beat behind.
  FIG.walk = (tl, sel, at, opts) => {
    const st = rec(sel);
    const o = Object.assign({ steps: 2, step: 0.42 }, opts || {});
    const T = o.step;
    const E = st.els;
    const contact = (lead, t, dur, k) => {
      const L = lead;
      const B = lead === "N" ? "F" : "N";
      tl.to(E[`hip${L}`], { rotation: -26, duration: dur, ease: "sine.inOut" }, t);
      tl.to(E[`kn${L}`], { rotation: 6, duration: dur, ease: "sine.inOut" }, t + 0.03);
      tl.to(E[`an${L}`], { rotation: 12, duration: dur, ease: "sine.inOut" }, t + 0.05);
      tl.to(E[`hip${B}`], { rotation: 22, duration: dur, ease: "sine.inOut" }, t);
      tl.to(E[`kn${B}`], { rotation: 16, duration: dur, ease: "sine.inOut" }, t + 0.03);
      tl.to(E[`an${B}`], { rotation: -16, duration: dur, ease: "sine.inOut" }, t + 0.05);
      // arms counter-swing: the arm opposite the lead leg goes forward; forearms lag
      tl.to(E[`sh${B}`], { rotation: -30, duration: dur, ease: "sine.inOut" }, t);
      tl.to(E[`el${B}`], { rotation: -30, duration: dur, ease: "sine.inOut" }, t + 0.06);
      tl.to(E[`sh${L}`], { rotation: 26, duration: dur, ease: "sine.inOut" }, t);
      tl.to(E[`el${L}`], { rotation: -10, duration: dur, ease: "sine.inOut" }, t + 0.06);
      tl.to(E.pelvis, { y: 10, duration: dur, ease: "sine.inOut" }, t);
      tl.to(E.tilt, { rotation: k % 2 ? 3 : -3, duration: dur, ease: "sine.inOut" }, t + 0.06);
    };
    const passing = (swing, t, dur) => {
      const S = swing;
      const P = swing === "N" ? "F" : "N";
      tl.to(E[`hip${S}`], { rotation: -8, duration: dur, ease: "sine.inOut" }, t);
      tl.to(E[`kn${S}`], { rotation: 50, duration: dur, ease: "sine.inOut" }, t + 0.03);
      tl.to(E[`an${S}`], { rotation: -28, duration: dur, ease: "sine.inOut" }, t + 0.05);
      tl.to(E[`hip${P}`], { rotation: 2, duration: dur, ease: "sine.inOut" }, t);
      tl.to(E[`kn${P}`], { rotation: 0, duration: dur, ease: "sine.inOut" }, t + 0.03);
      tl.to(E[`an${P}`], { rotation: -2, duration: dur, ease: "sine.inOut" }, t + 0.05);
      tl.to(E.shF.concat(E.shN), { rotation: 0, duration: dur, ease: "sine.inOut" }, t);
      tl.to(E.elF.concat(E.elN), { rotation: -14, duration: dur, ease: "sine.inOut" }, t + 0.06);
      tl.to(E.pelvis, { y: -14, duration: dur, ease: "sine.inOut" }, t);
    };
    // first half-step from rest, then alternate
    let t = at;
    let lead = "N";
    let k = 0;
    tl.to(E.spine, { rotation: 5, duration: 0.3, ease: "power2.out" }, at);
    contact(lead, t, T * 0.5, k++);
    t += T * 0.5;
    for (let i = 0; i < o.steps; i++) {
      const next = lead === "N" ? "F" : "N";
      passing(next, t, T * 0.5);
      t += T * 0.5;
      if (i < o.steps - 1) {
        contact(next, t, T * 0.5, k++);
        t += T * 0.5;
      }
      lead = next;
    }
    tl.to(E.tilt, { rotation: 0, duration: 0.3, ease: "sine.out" }, t);
    st.v = resolve(st, "stand");
    st.v.spine = 5;
    return { end: t, stride: Math.round(368 * BS) }; // ≈ foot spread at contact (legs −26°/+22° on a 452-unit leg, drawn at BS), so the feet do not slide
  };

  FIG.wave = (tl, sel, at, opts) => {
    const st = rec(sel);
    const o = Object.assign({ count: 3, period: 0.34 }, opts || {});
    const b = st.v;
    const P = o.period;
    const front = st.view === "front";
    const amp = front ? 20 : 18;
    let t = at;
    for (let i = 0; i < o.count; i++) {
      tl.to(st.els.elN, { rotation: b.elN + amp, duration: P / 2, ease: "sine.inOut" }, t);
      tl.to(
        st.els.wrN,
        { rotation: b.wrN + amp * 0.6, duration: P / 2, ease: "sine.inOut" },
        t + 0.04,
      );
      tl.to(
        st.els.elN,
        { rotation: b.elN - amp * 0.5, duration: P / 2, ease: "sine.inOut" },
        t + P / 2,
      );
      tl.to(
        st.els.wrN,
        { rotation: b.wrN - amp * 0.5, duration: P / 2, ease: "sine.inOut" },
        t + P / 2 + 0.04,
      );
      // the head leans into the wave a little (own joint, so it never fights a neck tween)
      tl.to(
        st.els.tilt,
        { rotation: (front ? 1 : -1) * (i % 2 ? -2.5 : 4), duration: P, ease: "sine.inOut" },
        t,
      );
      t += P;
    }
    tl.to(st.els.elN, { rotation: b.elN, duration: P / 2, ease: "sine.out" }, t);
    tl.to(st.els.wrN, { rotation: b.wrN, duration: P / 2, ease: "sine.out" }, t + 0.04);
    tl.to(st.els.tilt, { rotation: 0, duration: P, ease: "sine.inOut" }, t);
    return t + P / 2 + 0.04;
  };

  // breathing + head tilts on their own joints (breath, tilt), layered under anything else
  FIG.idle = (tl, sel, from, to, opts) => {
    const st = rec(sel);
    const o = Object.assign({ period: 1.6, amp: 1, tilt: 3, seed: 1 }, opts || {});
    const r = rng(o.seed);
    const P = o.period;
    let t = from;
    let k = 0;
    while (t < to - 0.2) {
      const h = Math.min(P / 2, (to - t) / 2);
      tl.to(
        st.els.breath,
        { scaleY: 1 + 0.022 * o.amp, scaleX: 1 - 0.008 * o.amp, duration: h, ease: "sine.inOut" },
        t,
      );
      tl.to(st.els.breath, { scaleY: 1, scaleX: 1, duration: h, ease: "sine.inOut" }, t + h);
      if (o.tilt)
        tl.to(
          st.els.tilt,
          {
            rotation: (k % 2 ? -1 : 1) * o.tilt * (0.6 + r() * 0.4),
            duration: 2 * h,
            ease: "sine.inOut",
          },
          t,
        );
      t += 2 * h;
      k++;
    }
    if (o.tilt)
      tl.to(
        st.els.tilt,
        { rotation: 0, duration: 0.2, ease: "sine.out" },
        Math.max(from, to - 0.2),
      );
    return to;
  };

  // squash & stretch hop: crouch, launch (stretch), hang, land (squash), settle with a little overshoot
  FIG.hop = (tl, sel, at, opts) => {
    const st = rec(sel);
    const o = Object.assign({ height: 44, air: 0.34 }, opts || {});
    const E = st.els;
    const y0 = st.v.pelvis.y;
    const A = o.air;
    // squash/stretch scale from the feet, so they are kept small: 6% on a 990-unit figure moves the hair ~60 units
    tl.to(E.squash, { scaleY: 0.93, scaleX: 1.06, duration: 0.11, ease: "power2.out" }, at);
    tl.to(E.squash, { scaleY: 1.035, scaleX: 0.97, duration: 0.1, ease: "power2.out" }, at + 0.11);
    tl.to(E.pelvis, { y: y0 - o.height, duration: A / 2, ease: "power2.out" }, at + 0.11);
    tl.to(E.squash, { scaleY: 1, scaleX: 1, duration: A / 2, ease: "sine.inOut" }, at + 0.21);
    tl.to(E.pelvis, { y: y0, duration: A / 2, ease: "power2.in" }, at + 0.11 + A / 2);
    tl.to(
      E.squash,
      { scaleY: 0.93, scaleX: 1.06, duration: 0.07, ease: "power2.out" },
      at + 0.11 + A,
    );
    tl.to(E.squash, { scaleY: 1, scaleX: 1, duration: 0.34, ease: "back.out(2.4)" }, at + 0.18 + A);
    return at + 0.52 + A;
  };

  // ---------------------------------------------------------------- mocap (window.CHAMocap, brand/cha-mocap.js)
  // Real motion from the CF mocap takes (scripts/motion-kit/mocap/). When the data is loaded, walk/wave/type play
  // recorded joint curves and the named poses take the recorded arm/spine angles; without it the keyed versions run.
  // Playback is seek-safe: one linear tween per clip whose onUpdate samples the curve at the timeline's own time.
  const MOCAP = () => window.CHAMocap || null;
  let posesMerged = false;
  function mergeMocapPoses() {
    const M = MOCAP();
    if (posesMerged || !M) return;
    posesMerged = true;
    for (const view of Object.keys(M.poses || {})) {
      for (const name of Object.keys(M.poses[view])) {
        POSES[view][name] = Object.assign({}, POSES[view][name] || {}, M.poses[view][name]);
      }
    }
    const w = M.clips?.wave;
    if (w) {
      const first = {};
      for (const k of Object.keys(w.joints)) first[k] = w.joints[k][0];
      POSES.front.wave = Object.assign({}, POSES.front.wave, first);
    }
  }
  const lerpAngle = (a, b, w) => a + (((((b - a + 540) % 360) + 360) % 360) - 180) * w;
  function valueAt(arr, f, loop) {
    const n = arr.length;
    let i = Math.floor(f);
    const w = f - i;
    if (loop) {
      i = ((i % n) + n) % n;
      return lerpAngle(arr[i], arr[(i + 1) % n], w);
    }
    if (i >= n - 1) return arr[n - 1];
    if (i < 0) return arr[0];
    return lerpAngle(arr[i], arr[i + 1], w);
  }

  // CHAFigure.clip(tl, sel, name, at, o) → end time. Plays a recorded clip on the joints it carries.
  //   o = { speed: 1, duration: natural / speed, loop: false, blend: 0.18 (s to ease in from the held pose),
  //         joints: null (all), pelvis: true (walk bounce) }
  FIG.clip = (tl, sel, name, at, opts) => {
    const st = rec(sel);
    const M = MOCAP();
    const C = M?.clips?.[name];
    if (!C) return at;
    const o = Object.assign(
      { speed: 1, duration: null, loop: false, blend: 0.18, joints: null, pelvis: true },
      opts || {},
    );
    const dur = o.duration || C.n / M.fps / o.speed;
    const keys = (o.joints || Object.keys(C.joints)).filter((k) => st.els[k] && C.joints[k]);
    const base = Object.assign({}, st.v, { pelvis: Object.assign({}, st.v.pelvis) });
    const at$ = (t, k) => {
      const v = valueAt(C.joints[k], t * M.fps * o.speed, o.loop);
      return C.how === "delta" ? base[k] + v : v;
    };
    const proxy = { t: 0 };
    tl.to(
      proxy,
      {
        t: dur,
        duration: dur,
        ease: "none",
        onUpdate: () => {
          if (tl.time() < at - 1e-6) return; // never clobber earlier tweens when seeking backwards
          const t = proxy.t;
          const w = o.blend > 0 ? Math.min(1, t / o.blend) : 1;
          for (const k of keys) gsap.set(st.els[k], { rotation: lerpAngle(base[k], at$(t, k), w) });
          if (o.pelvis && C.pelvis_y && st.els.pelvis) {
            const y = valueAt(C.pelvis_y, t * M.fps * o.speed, true);
            gsap.set(st.els.pelvis, { y: base.pelvis.y + y * w });
          }
        },
      },
      at,
    );
    for (const k of keys) st.v[k] = at$(dur, k);
    return at + dur;
  };

  const walkKeyed = FIG.walk;
  FIG.walk = (tl, sel, at, opts) => {
    const M = MOCAP();
    const st = rec(sel);
    if (!M?.clips?.walk || st.view === "front") return walkKeyed(tl, sel, at, opts);
    const o = Object.assign({ steps: 2, step: 0.42 }, opts || {});
    const C = M.clips.walk;
    const speed = C.n / M.fps / (2 * o.step); // the recorded cycle is two steps
    const end = FIG.clip(tl, sel, "walk", at, {
      speed,
      duration: o.steps * o.step,
      loop: true,
      blend: 0.12,
    });
    // recorded hip travel per step, drawn at the body scale, so the planted foot does not slide
    return { end, stride: Math.round((C.stride_per_cycle / 2) * BS) };
  };

  const waveKeyed = FIG.wave;
  FIG.wave = (tl, sel, at, opts) => {
    const M = MOCAP();
    const st = rec(sel);
    if (!M?.clips?.wave || st.view !== "front") return waveKeyed(tl, sel, at, opts);
    const o = Object.assign({ count: 3, period: 0.34 }, opts || {});
    const C = M.clips.wave; // three recorded waves
    const dur = o.count * o.period + o.period / 2;
    const speed = ((C.n / M.fps) * (o.count / 3)) / dur;
    return FIG.clip(tl, sel, "wave", at, { speed, duration: dur, blend: 0.08 }) + 0.04;
  };

  const typeKeyed = FIG.type;
  FIG.type = (tl, sel, from, to, opts) => {
    const M = MOCAP();
    if (!M?.clips?.type) return typeKeyed(tl, sel, from, to, opts);
    // keyed keystrokes on the forearms/wrists, the recorded head and shoulder rhythm on top (it replaces the keyed nod)
    typeKeyed(tl, sel, from, to, Object.assign({}, opts || {}, { nod: false }));
    FIG.clip(tl, sel, "type", from, {
      loop: true,
      duration: to - from,
      joints: ["neck", "shF", "shN"],
      speed: 1.5,
      blend: 0.25,
    });
    return to;
  };
})();
