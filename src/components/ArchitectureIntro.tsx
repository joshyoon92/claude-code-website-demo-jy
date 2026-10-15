import { motion, useReducedMotion, useScroll, useSpring } from 'motion/react'
import { useRef } from 'react'
import { projects } from '../data/projects'
import { Rail, Reveal } from './ui'
import { numberWord } from './words'

const FIRMS = new Set(projects.map((p) => p.firm)).size

// Divider inside Projects that opens the architecture archive.
export default function ArchitectureIntro() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  // A drafting dimension line that draws itself as the section scrolls in.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'center 45%'] })
  const draw = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })

  return (
    <section id="architecture" ref={ref} className="section arch-intro">
      <Reveal>
        <Rail label="Projects · Architecture archive · 2015–2025" />
        <h2 className="display">Before the code: buildings.</h2>
        <p className="section__lede">
          {numberWord(projects.length, true)} projects across JAHN, Brininstool + Lynch, Gensler and Tom Lee
          Studio: towers, a stadium, competitions and retail in four countries. The same discipline (requirements,
          systems, documentation, delivery) now goes into software.
        </p>
      </Reveal>
      <div className="dimension" aria-hidden="true">
        <span className="dimension__end">2015</span>
        <span className="dimension__track">
          <motion.span className="dimension__line" style={{ scaleX: reduce ? 1 : draw }} />
          <span className="dimension__label">
            {projects.length} projects · {FIRMS} practices
          </span>
        </span>
        <span className="dimension__end">2025</span>
      </div>
    </section>
  )
}
