import { useInView, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'

// A muted, looping clip that plays only while it is on screen. Nothing is
// downloaded until it is needed (preload="none" + the poster frame). With
// reduced motion it never autoplays and shows controls instead.
export default function AutoVideo({
  src,
  poster,
  label,
  className,
  onClick,
}: {
  src: string
  poster: string
  label: string
  className?: string
  onClick?: () => void
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const reduce = useReducedMotion()
  const inView = useInView(ref, { amount: 0.5 })

  useEffect(() => {
    const v = ref.current
    if (!v || reduce) return
    if (inView) v.play().catch(() => {}) // autoplay can be refused; the poster stays
    else v.pause()
  }, [inView, reduce])

  return (
    <video
      ref={ref}
      className={className}
      src={src}
      poster={poster}
      aria-label={label}
      muted
      loop
      playsInline
      preload="none"
      controls={!!reduce}
      onClick={onClick}
    />
  )
}
