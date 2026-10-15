import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { sideProjects, software, type SoftwareTag } from '../data/career'
import CountUp from './CountUp'
import { EASE, Rail, Reveal } from './ui'

const FILTERS: ('All' | SoftwareTag)[] = ['All', 'Backend', 'Frontend', 'Data', 'AI']

export default function SoftwareWork() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All')
  const shown = useMemo(
    () => (filter === 'All' ? software : software.filter((p) => p.tags.includes(filter))),
    [filter],
  )

  return (
    <section id="projects" className="section software">
      <div className="section__head" data-ghost="Code">
        <Rail index={2} label="Projects · Software engineering" />
        <Reveal>
          <h2 className="display">Software I’ve shipped.</h2>
          <p className="section__lede">
            Production systems at JPMorgan Chase: platforms, pipelines and products used by executives,
            supplier managers and hundreds of thousands of records.
          </p>
        </Reveal>
      </div>

      <div className="software__filters" role="toolbar" aria-label="Filter by area">
        <LayoutGroup id="software-filter">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`chip chip--dark${filter === f ? ' is-active' : ''}`}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
            >
              {filter === f && (
                <motion.span className="chip__bg" layoutId="software-filter-bg" transition={{ duration: 0.35, ease: EASE }} />
              )}
              <span className="chip__text">{f}</span>
            </button>
          ))}
        </LayoutGroup>
      </div>

      <motion.div layout className="software__grid">
        <AnimatePresence mode="popLayout">
          {shown.map((p) => (
            <motion.article
              key={p.id}
              layout
              className={`work-card${p.lead ? ' work-card--lead band' : ''}`}
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              <header className="work-card__head">
                <span className="rail">{p.org}</span>
                <span className="work-card__tags">{p.tags.join(' · ')}</span>
              </header>
              <div className="work-card__metric">
                <span className="work-card__value">
                  {p.metric.prefix}
                  <CountUp value={p.metric.value} />
                  {p.metric.suffix}
                </span>
                <span className="work-card__metric-label">{p.metric.label}</span>
              </div>
              <h3>{p.title}</h3>
              <p>{p.summary}</p>
              <ul className="work-card__stack">
                {p.stack.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </motion.article>
          ))}
        </AnimatePresence>
      </motion.div>

      <div className="side">
        <Reveal className="side__head">
          <Rail label="Side projects · Built while retraining" />
          <h3>Where the switch started.</h3>
        </Reveal>
        <ol className="side__list">
          {sideProjects.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.05} className={`side__item${i === 0 ? ' side__item--bridge' : ''}`}>
              <span className="side__year">{s.year}</span>
              <span className="side__title">{s.title}</span>
              <span className="side__detail">{s.detail}</span>
              <span className="side__stack">{s.stack}</span>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
