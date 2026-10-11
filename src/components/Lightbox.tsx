import { useCallback, useEffect, useRef, useState } from 'react'
import type { Media } from '../data/projects'

interface Props {
  items: Media[]
  index: number
  title: string
  onClose: () => void
  onIndex: (i: number) => void
}

const MIN_ZOOM = 1
const MAX_ZOOM = 8

// Full-screen viewer. Drawings can be zoomed (wheel / buttons / double-click)
// and panned by dragging, like inspecting a sheet in a CAD viewer.
export default function Lightbox({ items, index, title, onClose, onIndex }: Props) {
  const item = items[index]
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 })
  const { zoom } = view
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  const reset = useCallback(() => setView({ zoom: 1, x: 0, y: 0 }), [])

  // Zoom toward a point (stage coordinates relative to its centre),
  // keeping that point fixed on screen.
  const zoomAt = useCallback((factor: number, cx = 0, cy = 0) => {
    setView((v) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * factor))
      if (next === 1) return { zoom: 1, x: 0, y: 0 }
      const ratio = next / v.zoom
      return { zoom: next, x: cx - (cx - v.x) * ratio, y: cy - (cy - v.y) * ratio }
    })
  }, [])

  const go = useCallback(
    (delta: number) => {
      onIndex((index + delta + items.length) % items.length)
      reset()
    },
    [index, items.length, onIndex, reset],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === '+' || e.key === '=') zoomAt(1.5)
      else if (e.key === '-') zoomAt(1 / 1.5)
      else if (e.key === '0') reset()
    }
    window.addEventListener('keydown', onKey)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [go, onClose, reset, zoomAt])

  // Non-passive wheel listener so the page doesn't scroll behind the viewer.
  useEffect(() => {
    const stage = stageRef.current!
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = stage.getBoundingClientRect()
      zoomAt(
        Math.exp(-e.deltaY * 0.0015),
        e.clientX - rect.left - rect.width / 2,
        e.clientY - rect.top - rect.height / 2,
      )
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom === 1) return
    drag.current = { x: e.clientX, y: e.clientY, px: view.x, py: view.y }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    setView((v) => ({ ...v, x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y }))
  }
  const onPointerUp = () => {
    drag.current = null
  }
  const onDoubleClick = (e: React.MouseEvent) => {
    const rect = stageRef.current!.getBoundingClientRect()
    if (zoom > 1) reset()
    else zoomAt(3, e.clientX - rect.left - rect.width / 2, e.clientY - rect.top - rect.height / 2)
  }

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${title}: ${item.caption}`}>
      <header className="lightbox__bar">
        <span className={`lightbox__kind lightbox__kind--${item.kind}`}>{item.kind}</span>
        <span className="lightbox__title">
          {title} <span>· {item.caption}</span>
        </span>
        <span className="lightbox__count">
          {String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
        </span>
        <button className="lightbox__close" onClick={onClose} aria-label="Close viewer">
          ✕
        </button>
      </header>

      <div
        ref={stageRef}
        className={`lightbox__stage lightbox__stage--${item.kind}${zoom > 1 ? ' is-zoomed' : ''}`}
        data-cursor="lens"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        <img
          key={item.src}
          src={item.src}
          alt={item.caption}
          draggable={false}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${zoom})` }}
        />
      </div>

      <footer className="lightbox__tools">
        <button onClick={() => go(-1)} aria-label="Previous">
          ← Prev
        </button>
        <div className="lightbox__zoom">
          <button onClick={() => zoomAt(1 / 1.5)} aria-label="Zoom out">
            −
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => zoomAt(1.5)} aria-label="Zoom in">
            +
          </button>
          <button onClick={reset}>Fit</button>
        </div>
        <span className="lightbox__hint">Scroll to zoom · drag to pan · double-click to inspect</span>
        <button onClick={() => go(1)} aria-label="Next">
          Next →
        </button>
      </footer>
    </div>
  )
}
