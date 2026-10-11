import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import type { FeaturedProject } from '../data/projects'
import CountUp from './CountUp'
import Lightbox from './Lightbox'
import { EASE, Mark, Rail, Reveal } from './ui'
import WireframeModel from './WireframeModel'

interface Props {
  project: FeaturedProject
  // Shanghai gets the interactive massing model alongside its photos.
  withModel?: boolean
}

// Letter shutter (from the motion kit's create-letter-media-shutter): the
// project's name is printed across vertical panels that split open,
// alternating up and down, to reveal the photograph behind them.
function Shutter({ word }: { word: string }) {
  const reduce = useReducedMotion()
  if (reduce) return null
  const letters = word.toUpperCase().replace(/\s+/g, '').slice(0, 8).split('')
  return (
    <div className="shutter" aria-hidden="true">
      {letters.map((ch, i) => (
        <motion.span
          key={i}
          className="shutter__panel"
          initial={{ y: '0%' }}
          whileInView={{ y: i % 2 ? '101%' : '-101%' }}
          viewport={{ once: true, amount: 0.45 }}
          transition={{ duration: 0.9, delay: 0.25 + i * 0.07, ease: [0.7, 0, 0.2, 1] }}
        >
          {ch}
        </motion.span>
      ))}
    </div>
  )
}

export default function Featured({ project, withModel }: Props) {
  const [current, setCurrent] = useState(0)
  const [viewer, setViewer] = useState<number | null>(null)
  const reduce = useReducedMotion()
  const image = project.images[current]

  return (
    <section id={project.id} className="section featured">
      <div className="section__head">
        <Rail label={`Architecture · Featured · ${project.location} · ${project.year}`} />
        <Reveal>
          <h2 className="display">{project.name}</h2>
          <p className="featured__subtitle">{project.subtitle}</p>
        </Reveal>
      </div>

      <div className="featured__stage-wrap">
        <button
          className={`featured__stage featured__stage--${image.kind}`}
          onClick={() => setViewer(current)}
          aria-label={`Open ${project.name} image ${current + 1} full screen`}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.img
              key={image.src}
              src={image.src}
              alt={`${project.name}: ${image.caption}`}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: reduce ? 1 : [1.04, 1, 1.06] }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: 0.5 },
                scale: { duration: 14, times: [0, 0.08, 1], ease: 'linear' },
              }}
            />
          </AnimatePresence>
          <span className="featured__stage-meta">
            <span>{String(current + 1).padStart(2, '0')}</span>
            {image.caption}
            <span className="featured__expand">Expand ↗</span>
          </span>
        </button>
        <Shutter word={project.id} />
      </div>

      {/* Contact sheet (create-contact-sheet-select): numbered frames; the
          selected one gets the lime frame and takes over the stage. */}
      <div className="contact-sheet" role="tablist" aria-label={`${project.name} images`}>
        {project.images.map((m, i) => (
          <button
            key={m.src}
            role="tab"
            aria-selected={i === current}
            className={`contact-sheet__frame contact-sheet__frame--${m.kind}${i === current ? ' is-active' : ''}`}
            onClick={() => setCurrent(i)}
          >
            <img src={m.src} alt="" loading="lazy" />
            <span>{String(i + 1).padStart(2, '0')}</span>
            {i === current && (
              <motion.i className="contact-sheet__select" layoutId={`select-${project.id}`} transition={{ duration: 0.4, ease: EASE }} />
            )}
          </button>
        ))}
      </div>

      <dl className="stats">
        {project.stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08} className="stat">
            <dt>{s.label}</dt>
            <dd>
              <CountUp value={s.value} />
              {s.unit && <small>{s.unit}</small>}
            </dd>
          </Reveal>
        ))}
      </dl>

      <div className="featured__body">
        <Reveal className="featured__text">
          {project.quote && (
            <blockquote>
              <p>“{project.quote.text}”</p>
              <cite>{project.quote.by}</cite>
            </blockquote>
          )}
          {project.body.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </Reveal>
        <Reveal className="featured__aside" delay={0.1}>
          <p className="rail">My scope</p>
          <p className="featured__scope">
            <Mark>{project.contribution.split(':')[0]}</Mark>
            {project.contribution.includes(':') && `:${project.contribution.split(':').slice(1).join(':')}`}
          </p>
          <dl className="facts">
            {project.facts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
          <ul className="awards">
            {project.awards.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Reveal>
      </div>

      {withModel && (
        <Reveal className="featured__model">
          <div className="featured__model-copy">
            <p className="rail">Massing study · interactive</p>
            <h3>Three towers, one bridge.</h3>
            <p>
              A simplified massing of the scheme: two flanking towers, a set-back centre tower, the 130 m
              sky bridge and the reflecting pool over the Financial Theatre. Drag to orbit.
            </p>
          </div>
          <WireframeModel />
        </Reveal>
      )}

      {viewer !== null && (
        <Lightbox
          items={project.images}
          index={viewer}
          title={project.name}
          onClose={() => setViewer(null)}
          onIndex={(i) => {
            setViewer(i)
            setCurrent(i)
          }}
        />
      )}
    </section>
  )
}
