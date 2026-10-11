import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from 'motion/react'
import { useRef, useState } from 'react'
import { career, type Track } from '../data/career'
import { Mark, Rail, Reveal } from './ui'

const TRACK_LABEL: Record<Track, string> = {
  architecture: 'Architecture',
  software: 'Software',
  education: 'Education',
}

// The stop where the route turns from architecture to software.
const PIVOT = career.findIndex((s) => s.title === 'Boston University')

// Career as a route map (from the motion kit's explain-steps-route-map):
// a lime packet travels down the route as you scroll, lighting each stop.
export default function PathMap() {
  const ref = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 70%', 'end 55%'] })
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })
  const top = useTransform(progress, (p) => `${p * 100}%`)
  const [reached, setReached] = useState(0)

  useMotionValueEvent(progress, 'change', (p) => {
    setReached(Math.round(p * (career.length - 1)))
  })

  return (
    <section id="path" className="section path">
      <div className="section__head">
        <Rail index={3} label="Career Path" />
        <Reveal>
          <h2 className="display">
            Architect, <Mark>then engineer.</Mark>
          </h2>
          <p className="section__lede">
            A B.Arch and nearly seven years in practice, a master’s in software development, then
            engineering at JPMorgan Chase.
          </p>
        </Reveal>
      </div>

      <ol ref={ref} className="route">
        <span className="route__line" aria-hidden="true">
          <motion.span className="route__fill" style={{ scaleY: progress }} />
          <motion.span className="route__packet" style={{ top }} />
        </span>
        {career.map((stop, i) => (
          <li
            key={`${stop.title}-${stop.role}`}
            className={`route__stop route__stop--${stop.track}${i <= reached ? ' is-reached' : ''}${stop.current ? ' is-current' : ''}`}
          >
            {i === PIVOT && (
              <span className="route__pivot" aria-hidden="true">
                Career switch · architecture → software
              </span>
            )}
            <span className="route__node" aria-hidden="true" />
            <div className="route__body">
              <span className="rail">
                <span className={`route__track route__track--${stop.track}`}>{TRACK_LABEL[stop.track]}</span>·{' '}
                {stop.years}
                {stop.current && (
                  <span className="route__now">
                    <span className="live-dot" aria-hidden="true" /> Now
                  </span>
                )}
              </span>
              <h3>{stop.role}</h3>
              <p className="route__org">{stop.title}</p>
              <p>{stop.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
