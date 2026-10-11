import { useEffect, useRef, useState } from 'react'

// Counts from 0 to a formatted number ("80,000") when scrolled into view.
export default function CountUp({ value, duration = 1400 }: { value: string; duration?: number }) {
  const target = Number(value.replace(/,/g, ''))
  const ref = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState(Number.isFinite(target) ? 0 : target)

  useEffect(() => {
    if (!Number.isFinite(target)) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(target)
      return
    }
    let frame = 0
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      const start = performance.now()
      const tick = (now: number) => {
        // rAF timestamps can predate `start`, so clamp at both ends.
        const t = Math.min(1, Math.max(0, (now - start) / duration))
        const eased = 1 - Math.pow(1 - t, 4)
        setShown(Math.round(target * eased))
        if (t < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }, { threshold: 0.6 })
    observer.observe(ref.current!)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [target, duration])

  if (!Number.isFinite(target)) return <span ref={ref}>{value}</span>
  return <span ref={ref}>{shown.toLocaleString('en-US')}</span>
}
