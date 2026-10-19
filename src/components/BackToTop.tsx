import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import { useState } from 'react'

// A floating "back to top" button. It appears once the page has scrolled about
// a screen, and its ring fills with the reading progress down the page.

const R = 22 // ring radius in the 48×48 button

export default function BackToTop() {
  const reduce = useReducedMotion()
  const { scrollY, scrollYProgress } = useScroll()
  const [shown, setShown] = useState(false)

  useMotionValueEvent(scrollY, 'change', (y) => setShown(y > window.innerHeight * 0.9))

  const toTop = () => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })

  return (
    <AnimatePresence>
      {shown && (
        <motion.button
          type="button"
          className="to-top"
          onClick={toTop}
          aria-label="Back to top"
          title="Back to top"
          initial={{ opacity: 0, scale: 0.6, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 12 }}
          transition={reduce ? { duration: 0 } : { type: 'spring', bounce: 0.3, visualDuration: 0.35 }}
          whileHover={reduce ? undefined : { y: -3 }}
          whileTap={reduce ? undefined : { scale: 0.92 }}
        >
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <circle className="to-top__track" cx="24" cy="24" r={R} />
            <motion.circle
              className="to-top__progress"
              cx="24"
              cy="24"
              r={R}
              style={{ pathLength: scrollYProgress }}
            />
            <path className="to-top__arrow" d="M24 31V17M18 23l6-6 6 6" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
