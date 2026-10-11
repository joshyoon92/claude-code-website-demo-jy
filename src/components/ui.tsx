import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

const EASE = [0.2, 0.7, 0.2, 1] as const

// The one lime signal: a highlighter that sweeps in from the left behind
// the text when it scrolls into view (the motion kit's `.mark`).
export function Mark({ children, delay = 0.2 }: { children: ReactNode; delay?: number }) {
  const reduce = useReducedMotion()
  return (
    <span className="mark">
      <motion.i
        className="mark__fill"
        initial={{ scaleX: reduce ? 1 : 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 0.7, delay, ease: EASE }}
      />
      <span>{children}</span>
    </span>
  )
}

// "Fades become entrances": a short rise and settle.
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

// Mono rail above each section: "01 / 04 · ABOUT ME". Sub-sections omit the count.
export function Rail({ index, total = SECTION_TOTAL, label }: { index?: number; total?: number; label: string }) {
  return (
    <p className="rail">
      {index !== undefined && (
        <>
          <span className="rail__count">
            {String(index).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
          <span className="rail__dot" aria-hidden="true">
            ·
          </span>
        </>
      )}
      {label}
    </p>
  )
}

export const SECTION_TOTAL = 4
export { EASE }
