import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import portrait from '../assets/portrait.jpg'
import { skills } from '../data/career'
import { EASE, Mark } from './ui'

const STACK = [...skills.Languages, ...skills.Frameworks, 'Claude Code', 'Kubernetes']

export default function Hero() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  // Slow camera push on the portrait as the hero scrolls away.
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.12])
  const y = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '8%'])

  const rise = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 32 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, delay, ease: EASE },
  })

  return (
    <section id="top" ref={ref} className="hero">
      <div className="hero__copy">
        <motion.p className="rail" {...rise(0.1)}>
          Senior Software Engineer · JPMorgan Chase · Chicago
        </motion.p>
        <motion.h1 className="hero__name" {...rise(0.2)}>
          Joshua
          <br />
          Yoon
        </motion.h1>
        <motion.p className="hero__tagline" {...rise(0.35)}>
          I spent nearly seven years designing buildings, from Chicago high-rises to a ballpark in Mexico City.{' '}
          <Mark delay={1}>Now I build software</Mark>: backend platforms, data pipelines and AI-assisted
          workflows at JPMorgan Chase.
        </motion.p>
        <motion.div className="hero__ctas" {...rise(0.5)}>
          <a href="#projects" className="btn btn--lime">
            See engineering work
          </a>
          <a href="#architecture" className="btn btn--ghost">
            Architecture archive →
          </a>
        </motion.div>
        <motion.dl className="hero__stats" {...rise(0.65)}>
          <div>
            <dt>Engineering</dt>
            <dd>2022–</dd>
          </div>
          <div>
            <dt>Architecture</dt>
            <dd>2015–22</dd>
          </div>
          <div>
            <dt>AI dev speed-up</dt>
            <dd>−50%</dd>
          </div>
        </motion.dl>
      </div>

      <motion.figure
        className="hero__portrait"
        initial={reduce ? false : { clipPath: 'inset(100% 0 0 0)' }}
        animate={{ clipPath: 'inset(0% 0 0 0)' }}
        transition={{ duration: 1.2, delay: 0.15, ease: EASE }}
      >
        <motion.img src={portrait} alt="Portrait of Joshua Yoon" style={{ scale, y }} />
        <figcaption>
          <span className="live-dot" aria-hidden="true" /> Now: Senior Software Engineer, JPMorgan Chase
        </figcaption>
      </motion.figure>

      <div className="hero__ticker" aria-label="Stack">
        <span className="rail">Stack</span>
        <ul>
          {STACK.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
