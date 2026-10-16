import { useEffect, useRef, useState } from 'react'

type Vec3 = [number, number, number]
type Edge = [Vec3, Vec3]

// Axis-aligned box: 12 edges, plus optional floor plates every `floorStep`.
function box(x: number, z: number, w: number, d: number, y0: number, y1: number, floorStep = 0): Edge[] {
  const [x0, x1, z0, z1] = [x - w / 2, x + w / 2, z - d / 2, z + d / 2]
  const ring = (y: number): Edge[] => [
    [[x0, y, z0], [x1, y, z0]],
    [[x1, y, z0], [x1, y, z1]],
    [[x1, y, z1], [x0, y, z1]],
    [[x0, y, z1], [x0, y, z0]],
  ]
  const edges: Edge[] = [
    ...ring(y0),
    ...ring(y1),
    [[x0, y0, z0], [x0, y1, z0]],
    [[x1, y0, z0], [x1, y1, z0]],
    [[x1, y0, z1], [x1, y1, z1]],
    [[x0, y0, z1], [x0, y1, z1]],
  ]
  if (floorStep > 0) {
    for (let y = y0 + floorStep; y < y1 - 0.01; y += floorStep) edges.push(...ring(y))
  }
  return edges
}

// Vertical mullions on the two faces parallel to the x axis.
function mullions(x: number, z: number, w: number, d: number, y0: number, y1: number, count: number): Edge[] {
  const edges: Edge[] = []
  for (let i = 1; i < count; i++) {
    const mx = x - w / 2 + (w * i) / count
    edges.push([[mx, y0, z - d / 2], [mx, y1, z - d / 2]])
    edges.push([[mx, y0, z + d / 2], [mx, y1, z + d / 2]])
  }
  return edges
}

// A loose study of the Shanghai three-tower scheme: two flanking towers,
// a centre tower set back, and the sky bridge tying them together.
const STRUCTURE: Edge[] = [
  ...box(-3.2, 0.4, 2.2, 2.2, 0, 9, 0.5),
  ...box(0, -1.6, 2, 1.8, 0, 7, 0.5),
  ...box(3.2, 0.4, 2, 2, 0, 8, 0.5),
  ...box(0, 0.4, 8.4, 1.6, 2.5, 3.6, 0),
  ...mullions(0, 0.4, 8.4, 1.6, 2.5, 3.6, 28),
]
// Reflecting pool: a circle on the plaza.
const POOL: Edge[] = Array.from({ length: 40 }, (_, i) => {
  const a0 = (i / 40) * Math.PI * 2
  const a1 = ((i + 1) / 40) * Math.PI * 2
  return [
    [Math.cos(a0) * 1.1, 0, 1.8 + Math.sin(a0) * 1.1],
    [Math.cos(a1) * 1.1, 0, 1.8 + Math.sin(a1) * 1.1],
  ] as Edge
})
const GRID: Edge[] = []
for (let i = -8; i <= 8; i++) {
  GRID.push([[i, 0, -8], [i, 0, 8]])
  GRID.push([[-8, 0, i], [8, 0, i]])
}

export default function WireframeModel() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [yawDeg, setYawDeg] = useState(0)
  const state = useRef({ yaw: -0.6, pitch: 0.42, dragging: false, lastX: 0, lastY: 0, idle: 0 })

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = 0
    let height = 0
    let frame = 0
    let lastReport = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    const styles = getComputedStyle(document.documentElement)
    const lineColor = styles.getPropertyValue('--line').trim() || '#8fd3ff'
    const gridColor = styles.getPropertyValue('--line-faint').trim() || 'rgba(143,211,255,.15)'
    const accent = styles.getPropertyValue('--accent').trim() || '#ff4b3a'

    const draw = (t: number) => {
      const s = state.current
      if (!s.dragging && !reduceMotion) {
        s.idle += 1
        if (s.idle > 90) s.yaw += 0.0025
      }
      const cy = Math.cos(s.yaw)
      const sy = Math.sin(s.yaw)
      const cp = Math.cos(s.pitch)
      const sp = Math.sin(s.pitch)
      const scale = Math.min(width, height) * 0.075
      const camDist = 26

      const project = ([x, y, z]: Vec3): [number, number] => {
        const yC = y - 4
        const x1 = x * cy - z * sy
        const z1 = x * sy + z * cy
        const y2 = yC * cp - z1 * sp
        const z2 = yC * sp + z1 * cp
        const f = camDist / (camDist + z2)
        return [width / 2 + x1 * scale * f, height * 0.52 - y2 * scale * f]
      }
      const stroke = (edges: Edge[], color: string, lineWidth: number) => {
        ctx.strokeStyle = color
        ctx.lineWidth = lineWidth
        ctx.beginPath()
        for (const [a, b] of edges) {
          const [ax, ay] = project(a)
          const [bx, by] = project(b)
          ctx.moveTo(ax, ay)
          ctx.lineTo(bx, by)
        }
        ctx.stroke()
      }

      ctx.clearRect(0, 0, width, height)
      stroke(GRID, gridColor, 1)
      stroke(POOL, accent, 1.25)
      stroke(STRUCTURE, lineColor, 1)

      if (t - lastReport > 100) {
        lastReport = t
        const deg = ((((s.yaw * 180) / Math.PI) % 360) + 360) % 360
        setYawDeg(Math.round(deg))
      }
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    const s = state.current
    s.dragging = true
    s.lastX = e.clientX
    s.lastY = e.clientY
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const s = state.current
    if (!s.dragging) return
    s.yaw += (e.clientX - s.lastX) * 0.008
    s.pitch = Math.max(0.05, Math.min(1.2, s.pitch + (e.clientY - s.lastY) * 0.005))
    s.lastX = e.clientX
    s.lastY = e.clientY
  }
  const onPointerUp = () => {
    state.current.dragging = false
    state.current.idle = 0
  }

  return (
    <div className="wireframe">
      <canvas
        ref={canvasRef}
        className="wireframe__canvas"
        data-cursor="Drag"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label="Interactive wireframe model of three towers joined by a sky bridge. Drag to orbit."
        role="img"
      />
      <div className="wireframe__hud">
        <span>VIEW · PERSPECTIVE</span>
        <span>ROT {String(yawDeg).padStart(3, '0')}°</span>
        <span className="wireframe__hint">⟲ drag to orbit</span>
      </div>
    </div>
  )
}
