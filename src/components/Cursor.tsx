import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

// A custom cursor for mouse users: a small dot that grows into a labelled
// circle ("View") over clickable images, and a larger dot over other links.
// The dot inverts against whatever is under it; the labelled circle turns
// white on dark images and dark sections, black everywhere else.
// Any element can ask for its own label with data-cursor="Drag", or opt out
// with data-cursor="none".

const FINE_POINTER = '(hover: hover) and (pointer: fine)'
const CLICKABLE = 'a, button, [role="button"], [role="tab"], summary, label'
const NATIVE = 'input, textarea, select, [contenteditable="true"]'
const SIZE = 88 // the labelled circle; the dot states are this, scaled down
const SCALE = { dot: 12 / SIZE, link: 34 / SIZE, label: 1, none: 0, scroll: 52 / SIZE } as const
type Mode = keyof typeof SCALE
const PRESS = 1.2 // how much bigger the cursor gets while the button is held

/** sRGB colour → relative luminance, 0 (black) to 1 (white). */
const luminance = (r: number, g: number, b: number) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

// Average brightness of each image, measured once from a tiny copy of it.
const imageLight = new Map<string, number | null>()
function imageLuminance(img: HTMLImageElement): number | null {
  const src = img.currentSrc || img.src
  if (imageLight.has(src)) return imageLight.get(src)!
  if (!img.complete || !img.naturalWidth) return null
  let value: number | null = null
  try {
    const c = document.createElement('canvas')
    c.width = c.height = 16
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(img, 0, 0, 16, 16)
    const d = ctx.getImageData(0, 0, 16, 16).data
    let sum = 0
    for (let i = 0; i < d.length; i += 4) sum += luminance(d[i], d[i + 1], d[i + 2])
    value = sum / (d.length / 4)
  } catch {
    value = null // a cross-origin image can't be read; fall back to the background
  }
  imageLight.set(src, value)
  return value
}

/** Brightness of the first solid background behind an element. */
function backgroundLuminance(el: Element | null): number {
  for (; el; el = el.parentElement) {
    const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g)
    if (m && (m[3] === undefined || Number(m[3]) > 0.5)) return luminance(+m[0], +m[1], +m[2])
  }
  return 1
}

function classify(target: Element): { mode: Mode; label: string; dark: boolean } {
  if (target.closest(NATIVE)) return { mode: 'none', label: '', dark: false }
  const tagged = target.closest<HTMLElement>('[data-cursor]')
  const hit = target.closest<HTMLElement>(CLICKABLE)
  // The nearer of the two wins, so a card inside a "Drag" stage still says "View".
  if (hit && (!tagged || tagged.contains(hit))) {
    const img = hit.querySelector('img')
    const own = hit.dataset.cursor // a clickable can name its own label
    if (own || (img && hit.getBoundingClientRect().width >= 160)) {
      const lum = (img && imageLuminance(img)) ?? backgroundLuminance(hit)
      return { mode: 'label', label: own || 'View', dark: lum < 0.42 }
    }
    return { mode: 'link', label: '', dark: false }
  }
  if (tagged) {
    const value = tagged.dataset.cursor!
    if (value === 'none') return { mode: 'none', label: '', dark: false }
    return { mode: 'label', label: value, dark: backgroundLuminance(tagged) < 0.42 }
  }
  return { mode: 'dot', label: '', dark: false }
}

export default function Cursor() {
  const reduce = useReducedMotion() ?? false
  const [enabled, setEnabled] = useState(false)
  const [state, setState] = useState<{ mode: Mode; label: string; dark: boolean }>({ mode: 'dot', label: '', dark: false })
  const [visible, setVisible] = useState(false)
  const [pressed, setPressed] = useState(false)
  // Wheel-click autoscroll: where it started, and which way the page is moving.
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null)
  const [dir, setDir] = useState<-1 | 0 | 1>(0)
  const lastTarget = useRef<Element | null>(null)

  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const spring = { stiffness: 900, damping: 60, mass: 0.5 }
  const sx = useSpring(x, spring)
  const sy = useSpring(y, spring)

  useEffect(() => {
    const mq = matchMedia(FINE_POINTER)
    const update = () => setEnabled(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!enabled) return
    const root = document.documentElement
    root.classList.add('has-cursor')

    const read = (target: Element) => {
      lastTarget.current = target
      const next = classify(target)
      setState((s) => (s.mode === next.mode && s.label === next.label && s.dark === next.dark ? s : next))
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      x.set(e.clientX)
      y.set(e.clientY)
      setVisible(true)
      if (e.target instanceof Element && e.target !== lastTarget.current) read(e.target)
    }
    // Content can change under a still pointer (scrolling, a card opening).
    const onScroll = () => {
      const el = document.elementFromPoint(x.get(), y.get())
      if (el && el !== lastTarget.current) read(el)
    }
    const onLeave = () => setVisible(false)
    // Pressing swells the cursor a little; letting go springs it back.
    const onDown = (e: PointerEvent) => e.pointerType === 'mouse' && e.button === 0 && setPressed(true)
    const onUp = () => setPressed(false)

    addEventListener('pointermove', onMove, { passive: true })
    addEventListener('scroll', onScroll, { passive: true, capture: true })
    root.addEventListener('pointerleave', onLeave)
    addEventListener('pointerdown', onDown)
    addEventListener('pointerup', onUp)
    addEventListener('pointercancel', onUp)
    return () => {
      root.classList.remove('has-cursor')
      removeEventListener('pointermove', onMove)
      removeEventListener('scroll', onScroll, { capture: true })
      root.removeEventListener('pointerleave', onLeave)
      removeEventListener('pointerdown', onDown)
      removeEventListener('pointerup', onUp)
      removeEventListener('pointercancel', onUp)
    }
  }, [enabled, x, y])

  // Our own wheel-click autoscroll, in place of the browser's: its arrow icon
  // is drawn by the browser and can't be styled. Click the wheel to start;
  // the page scrolls faster the further the pointer is from where it started.
  // Click again, press Esc or turn the wheel to stop; or hold the wheel, drag,
  // and let go. Wheel-clicking a link still opens it in a new tab.
  useEffect(() => {
    if (!enabled) return
    const DEAD = 14 // px around the anchor where nothing moves
    let active: { x: number; y: number } | null = null
    let swallowClick = false
    let raf = 0
    let last = 0

    const stop = () => {
      if (!active) return
      active = null
      cancelAnimationFrame(raf)
      setAnchor(null)
      setDir(0)
    }
    const tick = (t: number) => {
      if (!active) return
      const dt = last ? Math.min(t - last, 50) : 16
      last = t
      const dy = y.get() - active.y
      const past = Math.abs(dy) - DEAD
      setDir(past > 0 ? (Math.sign(dy) as -1 | 1) : 0)
      if (past > 0) {
        const speed = Math.min((past / 10) ** 1.5, 60) // px per 16 ms
        window.scrollBy({ top: Math.sign(dy) * speed * (dt / 16), behavior: 'instant' })
      }
      raf = requestAnimationFrame(tick)
    }
    const onMouseDown = (e: MouseEvent) => {
      if (active) {
        // Any click ends autoscroll and does nothing else.
        e.preventDefault()
        swallowClick = true
        stop()
        return
      }
      if (e.button !== 1) return
      if ((e.target as Element).closest('a, ' + NATIVE)) return
      e.preventDefault() // keeps the browser's own autoscroll from starting
      active = { x: e.clientX, y: e.clientY }
      last = 0
      setAnchor(active)
      raf = requestAnimationFrame(tick)
    }
    const onMouseUp = (e: MouseEvent) => {
      // Held and dragged: letting go ends it. A plain click leaves it running.
      if (active && e.button === 1 && Math.abs(e.clientY - active.y) > DEAD * 2) stop()
    }
    const onClick = (e: MouseEvent) => {
      if (!swallowClick) return
      swallowClick = false
      e.preventDefault()
      e.stopPropagation()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && stop()

    addEventListener('mousedown', onMouseDown, { capture: true })
    addEventListener('mouseup', onMouseUp, { capture: true })
    addEventListener('click', onClick, { capture: true })
    addEventListener('auxclick', onClick, { capture: true })
    addEventListener('keydown', onKey)
    addEventListener('wheel', stop, { passive: true })
    addEventListener('blur', stop)
    return () => {
      stop()
      removeEventListener('mousedown', onMouseDown, { capture: true })
      removeEventListener('mouseup', onMouseUp, { capture: true })
      removeEventListener('click', onClick, { capture: true })
      removeEventListener('auxclick', onClick, { capture: true })
      removeEventListener('keydown', onKey)
      removeEventListener('wheel', stop)
      removeEventListener('blur', stop)
    }
  }, [enabled, y])

  if (!enabled) return null
  const { label, dark } = state
  const mode: Mode = anchor ? 'scroll' : state.mode
  return (
    <>
    <AnimatePresence>
      {anchor && (
        <motion.div
          className="cursor-anchor"
          style={{ left: anchor.x, top: anchor.y }}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ type: 'spring', bounce: 0.3, visualDuration: 0.25 }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 36 36" width="36" height="36">
            <circle cx="18" cy="18" r="16" fill="none" stroke="#fff" strokeWidth="1.5" />
            <path d="M13 13.5 18 8.5 23 13.5M13 22.5 18 27.5 23 22.5" fill="none" stroke="#fff" strokeWidth="1.75" />
            <circle cx="18" cy="18" r="1.75" fill="#fff" />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
    <motion.div
      className={`cursor cursor--${mode}${dark ? ' is-dark' : ''}`}
      style={{ x: reduce ? x : sx, y: reduce ? y : sy }}
      aria-hidden="true"
    >
      <motion.span
        className="cursor__blob"
        initial={false}
        animate={{ scale: visible ? SCALE[mode] * (pressed ? PRESS : 1) : 0 }}
        transition={
          reduce
            ? { duration: 0 }
            : pressed
              ? { type: 'spring', bounce: 0.3, visualDuration: 0.18 } // a quick swell on press
              : { type: 'spring', bounce: 0.45, visualDuration: 0.4 } // a springy settle on release
        }
      >
        <AnimatePresence>
          {mode === 'label' && (
            <motion.span
              key={label}
              className="cursor__label"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {label}
            </motion.span>
          )}
          {mode === 'scroll' && (
            // One chevron pointing the way the page moves; both while it rests.
            <motion.svg
              key="scroll"
              className="cursor__arrow"
              viewBox="0 0 88 88"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <motion.path
                d="M30 40 44 26 58 40"
                animate={{ opacity: dir === 1 ? 0 : 1, y: dir === -1 ? 11 : 0 }}
                transition={{ duration: 0.2 }}
              />
              <motion.path
                d="M30 48 44 62 58 48"
                animate={{ opacity: dir === -1 ? 0 : 1, y: dir === 1 ? -11 : 0 }}
                transition={{ duration: 0.2 }}
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.span>
    </motion.div>
    </>
  )
}
