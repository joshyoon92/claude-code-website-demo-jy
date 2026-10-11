# CHA Motion Kit

This is the brand motion system for CareerHacker Alex. Each piece is a reusable HyperFrames composition built on the careerhackeralex **Volt Lime** design system, approved 2026-10-01 (careerhackeralex `DESIGN.md` and `docs/design/creative-direction.md`):

- Charcoal ink `#0A0A0A`, with **one** Volt Lime `#D4F527` signal per frame.
- Paper `#F4F3EE`.
- Geist and Pretendard type at weights 400–600, plus mono uppercase rails.
- The silhouette logo with lime glasses.

Alex asked for it on 2026-10-02 ("모션 그래픽을 진짜 시도해봣으면 … 컴포넌트화 시켜서 … 숏츠 만들때 항상 활용"). Every new Short uses it (rule R-shorts-motionkit-001; guide: `.claude/skills/shorts-generator/references/motion-kit.md`).

## Layout

| Path | What |
|---|---|
| `brand/cha.css` | Tokens, the video type scale, and the highlighter `.mark`. Also device classes: `.cha-phone`, `.cha-laptop` (3D lid and deck), `.cha-win`, cursor and caret |
| `brand/cha-motion.js` | Runtime helpers (summarised below) |
| `brand/fonts`, `brand/logo`, `brand/gsap.min.js` | Assets copied into every build. The logos come from careerhackeralex `public/brand/logo/` at 33385c0d |
| `pieces/<slug>/` | `index.html` (one composition) and `meta.json` (category, size, duration, vars, what, how_to_use) |
| `mk.py` | `list`, `build`, `lint`, `snap`, `render`, `check-all`, `clip` |
| `catalog.py` and `catalog-template.html` | Build the catalog page from the metas and local renders |

`brand/cha-motion.js` provides:

- `CHA.vars`: HyperFrames variables merged over defaults.
- `CHA.rng`: a seeded random generator.
- The eases `cha.spring`, `cha.pop` and `cha.settle`.
- The device builders `CHA.phone`, `CHA.laptop`, `CHA.win` and `CHA.cursor`.
- `CHA.type`: keystroke typing with **Hangul IME composition** (ㅎ→하→한).
- `CHA.blink`, `CHA.words`, `CHA.count`, `CHA.cursorTo`, `CHA.click`, `CHA.guides` and `CHA.logo`.

Outputs are local and untracked, in `content/projects/cha-motion-kit/{build,snaps,renders,stills,catalog}/`.

The additive [Immersive Shorts pack](IMMERSIVE.md) adds screen-native workflows, creative transformations and real-recording adapters. Use `python3 scripts/motion-kit/immersive.py list` to find only that pack, and `immersive.py catalog` to build its searchable preview gallery in `content/projects/immersive-motion-kit/`.

## Use

```bash
python3 scripts/motion-kit/mk.py list
python3 scripts/motion-kit/mk.py snap laptop-type-zoom --at 1,3,5        # PNGs + contact sheet (no Gemini call)
python3 scripts/motion-kit/mk.py render laptop-type-zoom --vars v.json   # mp4 with your words
python3 scripts/motion-kit/mk.py clip laptop-type-zoom --rev <shorts rev> --id demo_prompt --vars v.json   # Shorts footage clip
python3 scripts/motion-kit/catalog.py                                      # catalog page
```

## Glow pack (opt-in light-field backdrops)

Alex asked on 2026-10-03 for pieces in the style of a chat-UI demo on a soft gradient ("배경도 이렇게 멋지게"). This is an opt-in exception to the flat substrate above: `brand/cha-glow.css` and `brand/cha-glow.js` give three backdrops (`dawn`: sky to a lime/amber sunrise; `ink`: charcoal with a lime aurora; `paper`: paper with lime haze), a sticker cursor, a floating composer, chat bubbles and a logo-tile end card. The glow is the frame's one lime signal, so the UI on top stays neutral. Pieces: `glow-chat-ask`, `glow-agent-run`, and `motion-term` (21 motion terms demonstrated live, plus `combo:title|card|stat|bounce` recipes that layer four terms and light each chip as it happens).

## Figure mocap

The v4 figure moves with recorded human motion. Four Seedance 2.5 takes (480p, text only, 126 credits, 2026-10-03;
prompts, ledger and footage in `content/projects/cha-motion-kit/mocap/`) were tracked with MediaPipe pose and retargeted
onto the rig: `CF1` side walk, `CF2` front wave · think · idea · cheer, `CF3` desk typing and stretch, `CF4` side point and cheer.

```bash
PY=content/projects/claude-pop-ko/tools/.venv/bin/python           # has mediapipe + the pose model
$PY scripts/motion-kit/mocap/extract.py  content/projects/cha-motion-kit/mocap/takes/CF1_walk_side.mp4
$PY scripts/motion-kit/mocap/retarget.py content/projects/cha-motion-kit/mocap/takes/CF1_walk_side.pose.npz --view side
$PY scripts/motion-kit/mocap/build.py    # → brand/cha-mocap.js (clips + key poses)
```

Pieces load `brand/cha-mocap.js` before `brand/cha-figure.js`. With it, `CHAFigure.walk` plays the recorded gait (and
returns the recorded stride, so planted feet do not slide), `wave` plays the recorded wave, `type` adds the recorded head
and shoulder rhythm to the keyed keystrokes, and the named poses think · idea · cheer · point · sit-type · stretch take
the recorded arm and spine angles. `CHAFigure.clip(tl, sel, name, at, o)` plays any clip. Without the data file the keyed
versions run unchanged. Front takes are mirrored so the performer's right hand drives the rig's pointing arm.

## Frame rate

`mk.py render <slug> --fps 60` renders standalone deliverables (catalog, ads, web) at 60 fps. The default stays at 30 fps because `scripts/shorts/render-short.py` accepts 30 fps only, and `mk.py clip` feeds that lane. 60 fps renders go to `content/projects/cha-motion-kit/renders-60fps/`.

## Adding a piece

Follow `content/projects/cha-motion-kit/BRIEF-builders.md`:

- **Brand rules:** one lime signal per frame, weights 400–600, generic devices with no maker logos.
- **Motion bar:** connected, Apple-ad smooth, real 3D via `.cha-view` and `.cha-world`.
- **Determinism:**
  - One paused timeline, registered literally on `window.__timelines["<slug>"]`.
  - No randomness or clocks.
  - `data-composition-variables` written as a JSON array.
- **Recreate prompt:** every new piece ships a `prompt.md` — one plain Korean prompt (no kit references) a viewer can paste into an AI coding assistant to rebuild it; the catalog shows it with a copy button.
- **Checks before rendering:** `mk.py lint` reports 0 errors, then look at a snapshot contact sheet.

## Blender lane (real 3D devices)

Alex allowed Blender for motion graphics on 2026-10-02 ("모션그래픽 만들때 블렌더를 사용해야한다면 사용해도 좋아"). Use it for what CSS 3D cannot do: real device geometry, studio light, reflections, soft shadows, depth of field and physically smooth camera paths. The screen content is still our HyperFrames UI.

**How it works.**

1. A Blender piece is `pieces/<slug>/` with `meta.json` (`"engine": "blender"`) and `shot.json`. It has no `index.html`.
2. Each device's screen is a flat HyperFrames *screen piece* (`role: "screen"` in its meta), sized to the device's display:
   - `screen-app-feed`: 590×1280, a phone at ≈1170×2532.
   - `screen-prompt`: 1232×800, aspect 1.54 for the MacBook Pro 14 display at 3024×1964.
3. `mk.py render <slug>` renders every screen piece as a PNG sequence at the shot's fps into `build/<slug>/screens/<device>/`. This step is cached by a hash of the piece, the brand layer, the vars and the fps.
4. It then runs Blender headless with `blender/shot.py`. The script builds the stage and devices procedurally and maps each screen sequence onto the screen mesh as an emissive texture. It bakes every animated value per frame, renders PNG frames with EEVEE and encodes `renders/<slug>.mp4`. The `.blend` is saved next to the mp4 for inspection.
5. An optional `endcard` piece is rendered by HyperFrames and appended, for example `logo-sting-vertical`.

`mk.py lint` validates `shot.json` and lints the screen pieces. `mk.py snap --at …` renders Blender stills and a contact sheet; add `--quality draft` while iterating. `mk.py clip` works for 1080×830 Blender pieces too. Blender comes from `/Applications/Blender.app` (override with `CHA_BLENDER`).

| File | What |
|---|---|
| `blender/devices.py` | Procedural generic devices with no logos. **Phone:** 71.5×147×7.8 mm rounded slab with bevelled rim, black glass front, frosted back, camera island and side buttons. **Laptop:** MacBook Pro 14-class (Alex's correction, 2026-10-02). The base is 312.6×221.2 mm and the lid is the same footprint; closed thickness is 10.5 + 5 = 15.5 mm. The 14.2″ display has a 1.54 aspect, ~5 mm bezels and a camera notch. The keyboard is full width with real key widths and a half-height function row, between speaker-grille dot strips. It also has a 141 mm trackpad, a front scoop and a rear hinge whose chin drops behind the base. Finishes: `spaceblack` (default), `graphite`, `charcoal`, `silver` |
| `blender/stage.py` | Brand studio. **Grounds:** an emissive `#0A0A0A` ink sweep, or a `#F4F3EE` paper sweep calibrated to read at its brand value with soft contact shadows. **Lights:** a soft key, two high rims for edge highlights and a top fill, plus a procedural reflection world (strip boxes and an overhead panel, visible only in reflections). **Accent:** optionally ONE lime accent (`"accent": "light"` or `"object"`), only when the screens carry no lime |
| `blender/shot.py` | The renderer that runs inside Blender. Its spec format is documented in its docstring |
| `blender/lane.py` | The mk.py driver: screens → Blender → mp4, plus the end card, stills and lint |

**shot.json** (times in seconds; a key's `ease` shapes the segment that ends at that key, default `power3.inOut`; missing values hold):

```json
{"size": [1080, 830], "fps": 30, "duration": 6, "motion_blur": 0.5,
 "stage": {"kind": "ink", "accent": null},
 "devices": [{"id": "laptop", "type": "laptop", "color": "spaceblack",
   "screen": {"piece": "screen-prompt", "offset": 1.4, "vars": {}},
   "keys": [{"t": 0, "lid": 0, "screen": 0}, {"t": 2.3, "lid": 108}, {"t": 2.05, "screen": 1, "ease": "power2.out"}]}],
 "stage_keys": [{"t": 8.4, "light": 1}, {"t": 9.3, "light": 0}],
 "camera": {"keys": [{"t": 0, "target": [0, 0, 0.03], "dist": 0.78, "az": -42, "el": 7, "lens": 40, "fstop": 2.4, "focus": [0, -0.09, 0.01]},
                     {"t": 5, "target": [0, 0.12, 0.1], "dist": 0.66, "az": 0, "el": 11, "lens": 50, "focus": "laptop"}]},
 "endcard": {"piece": "logo-sting-vertical", "vars": {}}}
```

**Spec fields.**

- **Units:** metres at real scale. `rot` is in degrees. `lid` runs from 0 (closed) to about 110.
- **`screen`:** a brightness from 0 to 1, used for the wake.
- **`offset`:** the shot time at which the screen piece's t=0 plays. Before it, the first frame holds.
- **Camera:** interpolated in orbit space (`target`, `dist`, `az`, `el`), so moves arc around the subject. `az` 0 is in front (−Y) and 90 is from +X. A `loc` is converted to orbit values.
- **`focus`:** a device id (its screen centre), a point, or a distance in metres. Focus pulls are interpolated between keys.
- **Variables (`--vars`):** a plain key goes to every screen piece that declares it. `<device>.key` targets one device and `endcard.key` targets the end card.

**Gotchas (measured 2026-10-02).**

- **Colour view:** use the Standard view transform. Khronos PBR Neutral's toe crushes `#0A0A0A` to `#000` and every dark UI grey. AgX and Filmic shift lime and the UI greys.
- **Ground material:** grounds are emissive so they never depend on the key. A glossy ink floor mirrored the key as a grey gradient.
- **Albedo:** keep "black" plastic albedo ≤ 0.004, because the stage irradiance is about 3–4.
- **Boolean cuts:** a boolean on the bevelled laptop base (with any solver) turned the deck white. The front scoop is therefore a shading inset.
- **Variable names:** never name a HyperFrames variable after a brand CSS token. HyperFrames exposes variables as CSS custom properties, so a variable called `lime` replaced `--lime` with "on" and every lime fill vanished. The screen pieces use `signal` (`lime|white`).
- **Render time:** on the M5, a 1080×830 frame takes ~1.5–4 s at `looks` (32 samples, depending on GPU load from other renders); `draft` is half resolution with 16 samples.
