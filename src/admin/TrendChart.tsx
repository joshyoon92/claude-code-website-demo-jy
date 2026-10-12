import { useEffect, useRef, useState } from 'react'
import { bucketLabel, fmtNum } from './format'
import type { Bucket } from './types'

type Unit = 'day' | 'week' | 'month'

const H = 240
const PAD = { top: 12, right: 8, bottom: 28, left: 40 }

function niceMax(n: number) {
  if (n <= 4) return 4
  const pow = 10 ** Math.floor(Math.log10(n))
  const step = [1, 2, 2.5, 5, 10].map((s) => s * pow).find((s) => s * 4 >= n)!
  return step * 4
}

// Single-series bar chart of visits per bucket, with a per-bar hover tooltip.
export default function TrendChart({ data, unit }: { data: Bucket[]; unit: Unit }) {
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(800)
  const [hover, setHover] = useState<number>()

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const max = niceMax(Math.max(0, ...data.map((d) => d.visits)))
  const plotW = Math.max(0, width - PAD.left - PAD.right)
  const plotH = H - PAD.top - PAD.bottom
  const slot = plotW / Math.max(1, data.length)
  const gap = Math.min(4, slot * 0.25)
  const barW = Math.max(1, slot - gap)
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH
  const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i)
  const labelEvery = Math.ceil(data.length / Math.max(1, Math.floor(plotW / 64)))
  const active = hover === undefined ? undefined : data[hover]

  return (
    <div className="chart" ref={wrap} onPointerLeave={() => setHover(undefined)}>
      <svg width={width} height={H} role="img" aria-label={`Visits per ${unit}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="chart__grid" x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="chart__tick" x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
              {fmtNum(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = PAD.left + i * slot + gap / 2
          const h = Math.max(0, y(0) - y(d.visits))
          const r = Math.min(4, barW / 2, h)
          return (
            <g key={d.bucket}>
              {h > 0 && (
                <path
                  className={`chart__bar${hover === i ? ' is-hover' : ''}`}
                  d={`M${x},${y(0)} V${y(d.visits) + r} Q${x},${y(d.visits)} ${x + r},${y(d.visits)} H${x + barW - r} Q${x + barW},${y(d.visits)} ${x + barW},${y(d.visits) + r} V${y(0)} Z`}
                />
              )}
              {/* hit target covers the whole column, not just the bar */}
              <rect
                x={PAD.left + i * slot}
                y={PAD.top}
                width={slot}
                height={plotH}
                fill="transparent"
                onPointerEnter={() => setHover(i)}
              />
              {i % labelEvery === 0 && (
                <text className="chart__tick" x={x + barW / 2} y={H - 8} textAnchor="middle">
                  {bucketLabel(d.bucket, unit)}
                </text>
              )}
            </g>
          )
        })}
        <line className="chart__axis" x1={PAD.left} x2={width - PAD.right} y1={y(0)} y2={y(0)} />
      </svg>
      {active && hover !== undefined && (
        <div
          className="chart__tip"
          style={{
            left: Math.min(Math.max(PAD.left + hover * slot + slot / 2, 80), width - 80),
            top: Math.max(0, y(active.visits) - 8),
          }}
        >
          <div className="chart__tip-title">{bucketLabel(active.bucket, unit, true)}</div>
          <div>
            <b>{fmtNum(active.visits)}</b> visits
          </div>
          <div>
            <b>{fmtNum(active.visitors)}</b> unique visitors
          </div>
        </div>
      )}
    </div>
  )
}
