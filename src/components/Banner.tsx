import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
  type MotionValue,
} from 'motion/react'
import { memo, useEffect, useRef, useState } from 'react'
import { PROJECTS, galleryCards, highlight, type GalleryCard } from '../data/banner'
import BannerDetail from './BannerDetail'
import { EASE } from './ui'
import './Banner.css'

// ─── Layouts ─────────────────────────────────────────────────────────────
// Every card has one pose per layout. Switching layout only changes the
// targets; each card eases from wherever it is, so shapes morph into each other.

const MODES = ['coverflow', 'ring', 'helix', 'sphere', 'grid'] as const
type Mode = (typeof MODES)[number]

type Pose = { x: number; y: number; z: number; rx: number; ry: number; rz: number; s: number; o: number }
type Stage = { w: number; h: number; cw: number; ch: number }

// Auto-advance: continuous spin (cards per second), or one card every few seconds.
const SPIN: Partial<Record<Mode, number>> = { ring: 0.32, helix: 0.45, sphere: 0.35 }
const STEP_MS: Partial<Record<Mode, number>> = { coverflow: 2600 }

const N = galleryCards.length
const DEG = 180 / Math.PI
const GOLDEN = Math.PI * (3 - Math.sqrt(5))
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
/** Offset of slot j from the front among n cards, wrapped into [-n/2, n/2). */
const around = (j: number, spin: number, n: number) => ((((j - spin) % n) + n + n / 2) % n) - n / 2
/** Fades a card out as it nears the wrap point, so with few cards it never visibly jumps ends. */
const edge = (ad: number, n: number) => clamp((n / 2 - ad) / 0.6, 0, 1)

// Ring radius to the card centers, in card widths. Each card leans with the
// curve, and the step between neighbours is set so their inner bottom corners
// just meet: the bottom edges trace a polygon around the center (~24° apart
// at 3 card widths; a smaller radius gives a steeper angle).
const RING_RADIUS = 3
const ringRadius = (st: Stage) => st.cw * RING_RADIUS
const ringStep = (st: Stage) => 2 * Math.atan(st.cw / (2 * (ringRadius(st) - st.ch / 2)))
/** The ring's fixed center; every card orbits it at the same radius. */
const ringCenterY = (st: Stage) => -st.h * 0.06 + ringRadius(st)
const wrapAngle = (a: number) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2))
const helixRadius = (st: Stage) => Math.min(st.w * 0.3, 420)

/**
 * Eases a point toward a target around a fixed center, by angle and radius
 * separately. (u, v) is the offset from the center, with u = r·sin(a) and
 * v = r·cos(a); returns the new (u, v).
 */
function orbitEase(u: number, v: number, tu: number, tv: number, k: number): [number, number] {
  const ca = Math.atan2(u, v)
  const cr = Math.hypot(u, v)
  const a = ca + wrapAngle(Math.atan2(tu, tv) - ca) * k
  const r = cr + (Math.hypot(tu, tv) - cr) * k
  return [r * Math.sin(a), r * Math.cos(a)]
}

// The filter (all / architect / engineer) decides which cards take part:
// j is a card's slot among the n visible cards.
function pose(mode: Mode, j: number, n: number, spin: number, st: Stage, active: boolean): Pose {
  const { w, h, cw, ch } = st
  const d = around(j, spin, n)
  const ad = Math.abs(d)
  switch (mode) {
    case 'coverflow': {
      const side = Math.sign(d)
      const near = Math.min(ad, 1)
      const far = Math.max(ad - 1, 0)
      return {
        x: side * (near * cw * 0.95 + far * cw * 0.42),
        y: 0,
        z: -near * cw * 0.9 - far * cw * 0.3,
        rx: 0,
        ry: -side * near * 55,
        rz: 0,
        s: 1,
        o: clamp(5.5 - ad, 0, 1) * edge(ad, n),
      }
    }
    case 'ring': {
      // A wide arc facing the viewer, front card at the top. Neighbours fan out
      // from the center with their inner corners touching (see RING_RADIUS);
      // cards past ~118° fade out, so the ring never has to close. The frame loop eases ring cards around the center by angle,
      // so they stay on the circle while it turns. A tiny z step keeps the card
      // nearest the front on top where they overlap.
      const r = ringRadius(st)
      const t = d * ringStep(st)
      return {
        x: r * Math.sin(t),
        y: ringCenterY(st) - r * Math.cos(t),
        z: -ad * 2,
        rx: 0,
        ry: 0,
        rz: t * DEG,
        s: 1,
        o: clamp((118 - Math.abs(t) * DEG) / 18, 0, 1) * edge(ad, n),
      }
    }
    case 'helix': {
      const r = helixRadius(st)
      const turns = n > 8 ? 2 : 1
      const t = (d / n) * Math.PI * 2 * turns
      // Spread the coil over the stage height (minus a card) so it never leaves it.
      const rise = Math.min(ch * 0.17, Math.max(h - ch * 0.8, 0) / Math.max(n, 6))
      return {
        x: r * Math.sin(t),
        y: d * rise,
        z: r * (Math.cos(t) - 1),
        rx: 0,
        ry: t * DEG,
        rz: 0,
        s: 0.78,
        o: (0.3 + 0.7 * (Math.cos(t) + 1) * 0.5) * edge(ad, n),
      }
    }
    case 'sphere': {
      const r = Math.min(w * 0.34, h * 0.42, 380) * (n < 10 ? 0.75 : 1)
      const yk = 1 - (2 * (j + 0.5)) / n
      const ring = Math.sqrt(1 - yk * yk)
      const a = j * GOLDEN + (spin / n) * Math.PI * 2
      const facing = ring * Math.cos(a)
      return {
        x: r * ring * Math.sin(a),
        y: -r * yk,
        z: r * (facing - 1),
        rx: Math.asin(yk) * DEG,
        ry: a * DEG,
        rz: 0,
        s: 0.58,
        o: 0.25 + 0.75 * (facing + 1) * 0.5,
      }
    }
    case 'grid': {
      const cols = Math.min(n, w > 1000 ? 8 : w > 700 ? 6 : 4)
      const rows = Math.ceil(n / cols)
      const s = clamp((w * 0.9) / cols / cw, 0.36, n <= 6 ? 0.85 : 0.6)
      const col = j % cols
      const row = Math.floor(j / cols)
      return {
        x: (col - (cols - 1) / 2) * (cw * s + 12),
        y: (row - (rows - 1) / 2) * (ch * s + 12),
        z: active ? 60 : 0,
        rx: 0,
        ry: 0,
        rz: 0,
        s: active ? s * 1.08 : s,
        o: 1,
      }
    }
  }
}

/** Which slot is "in front" for the caption and the role word. */
function frontSlot(mode: Mode, spin: number, n: number, hoveredSlot: number | null) {
  if (mode === 'grid') return hoveredSlot ?? 0
  if (mode === 'sphere') {
    let best = 0
    let bestFacing = -Infinity
    for (let j = 0; j < n; j++) {
      const yk = 1 - (2 * (j + 0.5)) / n
      const facing = Math.sqrt(1 - yk * yk) * Math.cos(j * GOLDEN + (spin / n) * Math.PI * 2)
      if (facing > bestFacing) {
        bestFacing = facing
        best = j
      }
    }
    return best
  }
  return ((Math.round(spin) % n) + n) % n
}

/** The spin that brings slot j to the front, nearest to the current spin. */
function spinFor(mode: Mode, j: number, spin: number, n: number) {
  if (mode === 'sphere') {
    const want = (-(j * GOLDEN) / (Math.PI * 2)) * n
    return want + Math.round((spin - want) / n) * n // n spin units = one full turn
  }
  return spin + around(j, spin, n)
}

// ─── Cards ───────────────────────────────────────────────────────────────

type CardValues = Record<keyof Pose, MotionValue<number>>

const Card = memo(function Card({
  card,
  index,
  register,
  onSelect,
  onHover,
  focusable,
  filteredOut,
}: {
  card: GalleryCard
  index: number
  register: (i: number, v: CardValues) => void
  onSelect: (i: number) => void
  onHover: (i: number | null) => void
  focusable: boolean
  filteredOut: boolean
}) {
  const v: CardValues = {
    x: useMotionValue(0),
    y: useMotionValue(0),
    z: useMotionValue(-600),
    rx: useMotionValue(0),
    ry: useMotionValue(0),
    rz: useMotionValue(0),
    s: useMotionValue(0.4),
    o: useMotionValue(0),
  }
  useEffect(() => register(index, v)) // values are stable; re-registering is cheap

  const project = PROJECTS[card.project]
  return (
    <motion.button
      type="button"
      className={`gcard gcard--${card.kind}${filteredOut ? ' is-out' : ''}`}
      style={{ x: v.x, y: v.y, z: v.z, rotateX: v.rx, rotateY: v.ry, rotate: v.rz, scale: v.s, opacity: v.o }}
      onClick={() => onSelect(index)}
      onPointerEnter={() => onHover(index)}
      onPointerLeave={() => onHover(null)}
      tabIndex={focusable && !filteredOut ? 0 : -1}
      aria-hidden={filteredOut || undefined}
      aria-label={
        card.kind === 'code'
          ? `${card.file}, code`
          : `${project.name}, ${card.kind === 'video' ? 'AI-generated video' : 'photo'}`
      }
    >
      {card.kind !== 'code' ? (
        <>
          <img src={card.src} alt="" draggable={false} loading="eager" decoding="async" />
          {card.kind === 'video' && (
            <span className="gcard__video" aria-hidden="true">
              ▶ AI video
            </span>
          )}
        </>
      ) : (
        <span className="gcard__code">
          <span className="gcard__bar">
            <i />
            <i />
            <i />
            <span>{card.file}</span>
          </span>
          <span className="gcard__lines">
            {card.code.map((line, n) => (
              <span key={n} className="gcard__line">
                {highlight(line, card.lang).map((t, j) => (
                  <span key={j} className={`tok tok--${t.kind}`}>
                    {t.text}
                  </span>
                ))}
              </span>
            ))}
          </span>
        </span>
      )}
    </motion.button>
  )
})

// ─── Banner ──────────────────────────────────────────────────────────────

// Clicking "Architect" or "Engineer" above the title narrows the gallery to
// that side of the work; clicking it again shows everything.
type Filter = 'all' | 'architect' | 'engineer'
const inFilter = (c: GalleryCard, f: Filter) => f === 'all' || (f === 'engineer') === (c.kind === 'code')

export default function Banner({ onOpenProject }: { onOpenProject: (sheet: string) => void }) {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion() ?? false
  const inView = useInView(sectionRef, { amount: 0.15 })

  const [mode, setMode] = useState<Mode>('coverflow')
  const [front, setFront] = useState(0)
  const [userPaused, setUserPaused] = useState(reduce)
  const [hoveringStage, setHoveringStage] = useState(false)
  const [tabHidden, setTabHidden] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  // Animation state lives in refs: the frame loop reads and writes it 60×/s.
  const values = useRef<CardValues[]>([])
  const current = useRef<Pose[]>(galleryCards.map(() => ({ x: 0, y: 0, z: -600, rx: 0, ry: 0, rz: 0, s: 0.4, o: 0 })))
  const spin = useRef(0)
  const speed = useRef(0) // eased toward the mode's spin speed, so starts and stops are smooth
  const selectedRef = useRef<number | null>(null)
  selectedRef.current = selected
  const stepClock = useRef(0)
  const modeChangedAt = useRef(0)
  const hovered = useRef<number | null>(null)
  const drag = useRef<{ x: number; moved: boolean } | null>(null)
  const stage = useRef<Stage>({ w: 1200, h: 600, cw: 180, ch: 240 })
  const frontRef = useRef(0)
  // Cards taking part: their indexes in order, and each card's slot (-1 = filtered out).
  const visible = useRef<number[]>(galleryCards.map((_, i) => i))
  const slotOf = useRef<number[]>(galleryCards.map((_, i) => i))
  const modeRef = useRef(mode)
  modeRef.current = mode

  // Reduced motion: start paused (the play button still works).
  useEffect(() => {
    if (reduce) setUserPaused(true)
  }, [reduce])

  const paused = userPaused || hoveringStage || !inView || tabHidden
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  // Stable callbacks, so the memoised cards don't re-render when the caption changes.
  const register = useRef((i: number, v: CardValues) => {
    values.current[i] = v
  }).current
  const onHoverCard = useRef((n: number | null) => {
    hovered.current = n
  }).current

  // Card size follows the stage; CSS reads the same numbers via custom properties.
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      const h = entry.contentRect.height
      const cw = clamp(w * 0.14, 112, 200)
      stage.current = { w, h, cw, ch: cw * (4 / 3) }
      el.style.setProperty('--cw', `${cw}px`)
      el.style.setProperty('--ch', `${cw * (4 / 3)}px`)
      el.style.setProperty('--stage-h', `${h}px`)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const onVis = () => setTabHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  useAnimationFrame((time, delta) => {
    if (!inView || tabHidden) return
    const dt = Math.min(delta, 64)
    const m = modeRef.current

    const running = !pausedRef.current && !drag.current && selectedRef.current === null
    const wantSpeed = running ? (SPIN[m] ?? 0) : 0
    speed.current += (wantSpeed - speed.current) * (reduce ? 1 : 1 - Math.exp(-dt / 400))
    spin.current += (speed.current * dt) / 1000
    if (running) {
      if (STEP_MS[m]) {
        stepClock.current += dt
        if (stepClock.current > STEP_MS[m]!) {
          stepClock.current = 0
          spin.current = Math.round(spin.current) + 1
        }
      }
    }

    // Glide slower right after a layout switch so the morph reads clearly.
    const open = selectedRef.current !== null
    const tau = open || time - modeChangedAt.current < 1200 ? 260 : 120
    const k = reduce ? 1 : 1 - Math.exp(-dt / tau)
    const st = stage.current
    const n = visible.current.length
    for (let i = 0; i < N; i++) {
      const v = values.current[i]
      if (!v) continue
      const c = current.current[i]
      const slot = slotOf.current[i]
      // Filtered-out cards fall back and fade where they are.
      const t =
        slot < 0
          ? { x: c.x, y: c.y, z: -500, rx: c.rx, ry: c.ry, rz: c.rz, s: 0.6, o: 0 }
          : pose(m, slot, n, spin.current, st, hovered.current === i)
      if (open) {
        // The gallery steps back while one card is shown large.
        t.o = 0
        t.s *= 0.9
        t.z -= 260
      }
      // Ring and helix cards orbit a fixed center, so they ease in polar terms:
      // the angle turns and the radius settles separately, and a fast drag
      // swings cards along the circle instead of cutting across it (which
      // would pull them inward).
      if (m === 'ring' && slot >= 0) {
        const cy = ringCenterY(st) // the ring turns in the screen plane
        ;[c.x, c.y] = orbitEase(c.x, cy - c.y, t.x, cy - t.y, k)
        c.y = cy - c.y
        c.z += (t.z - c.z) * k
      } else if (m === 'helix' && slot >= 0) {
        const r = helixRadius(st) // the helix turns about a vertical axis behind the front card
        ;[c.x, c.z] = orbitEase(c.x, c.z + r, t.x, t.z + r, k)
        c.z -= r
        c.y += (t.y - c.y) * k
      } else {
        c.x += (t.x - c.x) * k
        c.y += (t.y - c.y) * k
        c.z += (t.z - c.z) * k
      }
      c.rx += (t.rx - c.rx) * k
      c.ry += (t.ry - c.ry) * k
      c.rz += (t.rz - c.rz) * k
      c.s += (t.s - c.s) * k
      c.o += (t.o - c.o) * k
      v.x.set(c.x)
      v.y.set(c.y)
      v.z.set(c.z)
      v.rx.set(c.rx)
      v.ry.set(c.ry)
      v.rz.set(c.rz)
      v.s.set(c.s)
      v.o.set(c.o)
    }

    const hoveredSlot = hovered.current === null ? null : slotOf.current[hovered.current]
    const f = open
      ? selectedRef.current!
      : visible.current[frontSlot(m, spin.current, n, hoveredSlot !== null && hoveredSlot >= 0 ? hoveredSlot : null)]
    if (f !== frontRef.current) {
      frontRef.current = f
      setFront(f)
    }
  })

  const switchMode = (m: Mode) => {
    if (m === mode) return
    modeChangedAt.current = performance.now()
    stepClock.current = 0
    if (STEP_MS[m]) {
      speed.current = 0
      spin.current = Math.round(spin.current)
    }
    setMode(m)
  }

  // A click opens the card large; it is also turned to the front so closing
  // the view lands on it. (Ignored when the click ends a drag.)
  const openCard = (i: number) => {
    if (drag.current?.moved) return
    stepClock.current = 0
    const slot = slotOf.current[i]
    if (slot < 0) return
    if (mode !== 'grid') spin.current = spinFor(mode, slot, spin.current, visible.current.length)
    setSelected(i)
  }
  const openCardRef = useRef(openCard)
  openCardRef.current = openCard
  const onSelectCard = useRef((i: number) => openCardRef.current(i)).current
  const closeCard = () => setSelected(null)

  const changeFilter = (next: Filter) => {
    const f = next === filter ? 'all' : next // clicking the active side again shows everything
    const ids = galleryCards.flatMap((c, i) => (inFilter(c, f) ? [i] : []))
    visible.current = ids
    slotOf.current = galleryCards.map((_, i) => ids.indexOf(i))
    spin.current = 0
    speed.current = 0
    stepClock.current = 0
    modeChangedAt.current = performance.now() // the slow glide, as for a layout switch
    setSelected(null)
    setFilter(f)
  }

  // Drag (or swipe) sideways to spin.
  const onPointerDown = (e: React.PointerEvent) => {
    if (mode === 'grid' || e.button !== 0) return
    drag.current = { x: e.clientX, moved: false }
  }
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current
      if (!d) return
      const dx = e.clientX - d.x
      if (Math.abs(dx) > 4) d.moved = true
      d.x = e.clientX
      const st = stage.current
      const perCard = modeRef.current === 'ring' ? ringRadius(st) * ringStep(st) : st.cw * 0.55
      spin.current -= dx / perCard
    }
    const up = () => {
      const d = drag.current
      if (!d) return
      if (STEP_MS[modeRef.current]) spin.current = Math.round(spin.current)
      stepClock.current = 0
      // Let the click that ends a drag through as "not a click".
      setTimeout(() => (drag.current = null), 0)
    }
    addEventListener('pointermove', move)
    addEventListener('pointerup', up)
    addEventListener('pointercancel', up)
    return () => {
      removeEventListener('pointermove', move)
      removeEventListener('pointerup', up)
      removeEventListener('pointercancel', up)
    }
  }, [])

  useEffect(() => {
    if (selected === null) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelected(null)
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [selected])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (mode === 'grid' || selected !== null) return
    if (e.key === 'ArrowRight') spin.current = Math.round(spin.current) + 1
    else if (e.key === 'ArrowLeft') spin.current = Math.round(spin.current) - 1
    else return
    stepClock.current = 0
    e.preventDefault()
  }

  const card = galleryCards[selected ?? front]
  const project = PROJECTS[card.project]
  const engineer = card.kind === 'code'

  const openProject = () => {
    if (engineer) return document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })
    const link = project.link
    if ('section' in link) document.getElementById(link.section)?.scrollIntoView({ behavior: 'smooth' })
    else onOpenProject(link.sheet)
  }

  return (
    <section id="gallery" ref={sectionRef} className="gallery" aria-label="Architecture and software gallery">
      <header className="gallery__head">
        <LayoutGroup id="gallery-filter">
          <div className="gallery__live" role="group" aria-label="Show work">
            <span className="gallery__dot" aria-hidden="true" />
            <span>Live ·</span>
            {(['engineer', 'architect'] as const).map((f, idx) => (
              <span key={f} className="gallery__filter-wrap">
                {idx === 1 && <span aria-hidden="true">⇄</span>}
                <button
                  type="button"
                  className={`gallery__filter${filter === f ? ' is-on' : ''}`}
                  aria-pressed={filter === f}
                  title={filter === f ? 'Show all work' : `Show only ${f === 'architect' ? 'architecture' : 'engineering'} work`}
                  onClick={() => changeFilter(f)}
                >
                  {filter === f && (
                    <motion.span
                      className="gallery__filter-pill"
                      layoutId="gallery-filter-pill"
                      transition={{ type: 'spring', bounce: 0.15, visualDuration: 0.35 }}
                    />
                  )}
                  <span className="gallery__filter-text">{f === 'architect' ? 'Architect' : 'Engineer'}</span>
                </button>
              </span>
            ))}
            {filter !== 'all' && (
              <button type="button" className="gallery__filter-all" onClick={() => changeFilter(filter)}>
                Show all
              </button>
            )}
          </div>
        </LayoutGroup>
        {/* The engineer is the headline; the buildings are the proof of a first career. */}
        <h2 className="gallery__title">
          <span className="gallery__name"></span> Senior Software Engineer
        </h2>
        <p className="gallery__lede">
          I build backend platforms at JPMorgan Chase, and I designed and built this site. The buildings are from my
          first career, as an architect.
        </p>
        <LayoutGroup id="gallery-modes">
          <div className="gallery__modes" role="tablist" aria-label="Gallery layout">
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                className={mode === m ? 'is-on' : undefined}
                onClick={() => switchMode(m)}
              >
                {mode === m && (
                  <motion.span
                    className="gallery__mode-pill"
                    layoutId="gallery-mode-pill"
                    transition={{ type: 'spring', bounce: 0.15, visualDuration: 0.35 }}
                  />
                )}
                <span className="gallery__mode-text">{m}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>
      </header>

      <div
        ref={stageRef}
        className={`gallery__stage gallery__stage--${mode}`}
        onPointerDown={onPointerDown}
        onPointerEnter={() => setHoveringStage(true)}
        onPointerLeave={() => {
          setHoveringStage(false)
          hovered.current = null
        }}
        onKeyDown={onKeyDown}
      >
        <div className="gallery__world">
          {galleryCards.map((c, i) => (
            <Card
              key={c.id}
              card={c}
              index={i}
              register={register}
              onSelect={onSelectCard}
              onHover={onHoverCard}
              focusable={selected === null && i === front}
              filteredOut={!inFilter(c, filter)}
            />
          ))}
        </div>
        <AnimatePresence>
          {selected !== null && (
            <BannerDetail
              key="detail"
              card={galleryCards[selected]}
              onClose={closeCard}
              onOpenProject={() => {
                closeCard()
                openProject()
              }}
            />
          )}
        </AnimatePresence>
      </div>

      <footer className="gallery__foot">
        <AnimatePresence mode="wait" initial={false}>
          {/* The open card has its own description, so the caption steps aside. */}
          {selected === null && <motion.div
            key={card.id}
            className="gallery__caption"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            <span className={`gallery__tag${engineer ? ' is-code' : ''}`}>{engineer ? 'Engineer' : 'Architect'}</span>
            {engineer ? (
              <span>
                <b>{card.file}</b> · {card.bridge}
              </span>
            ) : (
              <span>
                <b>{project.name}</b> ·{' '}
                {card.kind === 'video' ? 'AI-generated flythrough' : `${project.place} · ${project.year}`}
              </span>
            )}
            <button type="button" className="gallery__open" onClick={openProject}>
              {engineer ? 'See software work →' : 'View project →'}
            </button>
          </motion.div>}
        </AnimatePresence>
        <button
          type="button"
          className="gallery__pause"
          onClick={() => setUserPaused((p) => !p)}
          aria-label={userPaused ? 'Play gallery' : 'Pause gallery'}
        >
          {userPaused ? '▶' : '❚❚'}
        </button>
      </footer>
    </section>
  )
}
