import type { CSSProperties } from 'react'
import { records, SQ_FT_PER_M2, totals, type ProjectRecord } from '../data/metrics'
import CountUp from './CountUp'
import { Rail, Reveal } from './ui'
import './ByTheNumbers.css'

// "By the numbers": the architecture projects as a small dashboard. Everything
// here is drawn from the structured records in data/metrics.ts.

const fmt = (n: number) => n.toLocaleString('en-US')
const isBuilt = (r: ProjectRecord) => r.status === 'Completed'

// ─── Construction budgets ────────────────────────────────────────────────
// Bars on one linear scale. Shanghai ($2B) is 13× the next project, so the scale
// stops just past the ballpark and Shanghai's bar runs off it, marked and labelled.

const money = (usd: number) =>
  usd >= 1e9 ? `$${Number((usd / 1e9).toFixed(1))}B` : usd >= 1e6 ? `$${Number((usd / 1e6).toFixed(1))}M` : `$${fmt(Math.round(usd / 1e3))}K`
const costed = records.filter((r) => r.costUsd).sort((a, b) => b.costUsd! - a.costUsd!)
const COST_MAX = 160e6
const COST_TICKS = [0, 50e6, 100e6, 150e6]
// Gridlines at the ticks, drawn behind every bar track.
const COST_GRID = COST_TICKS.map((t) => {
  const p = (t / COST_MAX) * 100
  return `linear-gradient(to right, transparent calc(${p}% - 0.5px), var(--line-1) calc(${p}% - 0.5px) calc(${p}% + 0.5px), transparent calc(${p}% + 0.5px))`
}).join(', ')

function Budgets({ onOpen }: { onOpen: (sheet: string) => void }) {
  const second = costed[1]?.costUsd ?? 1
  return (
    <figure className="nums__figure">
      <figcaption className="nums__caption">
        <h3>Construction budgets</h3>
        <ul className="nums__legend">
          <li>
            <i className="swatch swatch--built" /> Completed
          </li>
          <li>
            <i className="swatch swatch--unbuilt" /> Design
          </li>
        </ul>
      </figcaption>
      <p className="nums__lede">
        {money(totals.costUsd)} in construction across {totals.costed} projects, from a $700K house to a $2B headquarters
        complex. Without Shanghai, {money(totals.costUsd - costed[0].costUsd!)}.
      </p>
      <div className="cost" role="list">
        <div className="cost__row cost__row--axis" aria-hidden="true">
          <span />
          <div className="cost__axis">
            {COST_TICKS.map((t) => (
              <span key={t} style={{ left: `${(t / COST_MAX) * 100}%` }}>
                {t === 0 ? '$0' : money(t)}
              </span>
            ))}
          </div>
          <span />
        </div>
        {costed.map((r) => {
          const over = r.costUsd! > COST_MAX
          return (
            <div key={r.sheet} className="cost__row" role="listitem">
              <span className="cost__name">{r.name}</span>
              <div
                className={`cost__track${over ? ' is-over' : ''}`}
                style={{ '--w': `${Math.min(r.costUsd! / COST_MAX, 1) * 100}%`, backgroundImage: COST_GRID } as CSSProperties}
              >
                <button
                  type="button"
                  className={`cost__bar${isBuilt(r) ? '' : ' is-unbuilt'}`}
                  onClick={() => onOpen(r.sheet)}
                  aria-label={`${r.name}: ${money(r.costUsd!)} construction cost. Open project sheet.`}
                >
                  <span className="tip" role="presentation">
                    <b>{r.name}</b>
                    <span>{money(r.costUsd!)} construction</span>
                    {r.teamNote && <span>Team: {r.teamNote}</span>}
                    {r.schedule && <span>{r.schedule}</span>}
                    <span>
                      {r.status} · {r.year ?? 'n.d.'} · {r.firm}
                    </span>
                  </span>
                </button>
                <span className="cost__value">
                  {money(r.costUsd!)}
                  {over && <em> · off scale, {Math.round(r.costUsd! / second)}× the next project</em>}
                </span>
              </div>
              <span className="cost__team">{r.team ? `team ${r.team}` : ''}</span>
            </div>
          )
        })}
      </div>
      <p className="nums__note">
        Team is the architecture team on each project, where the sheet gives a size. Not shown, as there is no budget on
        record: {records.filter((r) => !r.costUsd).map((r) => r.name).join(', ')}.
      </p>
    </figure>
  )
}

// ─── Skyline ─────────────────────────────────────────────────────────────
// Each building is a stack of its floors, so heights are to scale by floor count.

const SKY_MAX = 42 // floors at the top of the frame (the tallest is 41)
const tall = records.filter((r) => r.floors).sort((a, b) => (a.year ?? 0) - (b.year ?? 0) || b.floors! - a.floors!)
const notDrawn = records.filter((r) => !r.floors)

function Skyline({ onOpen }: { onOpen: (sheet: string) => void }) {
  return (
    <figure className="nums__figure">
      <figcaption className="nums__caption">
        <h3>Skyline, to scale by floor count</h3>
        <ul className="nums__legend">
          <li>
            <i className="swatch swatch--built" /> Completed
          </li>
          <li>
            <i className="swatch swatch--unbuilt" /> Design or competition
          </li>
        </ul>
      </figcaption>
      <div className="sky-scroll">
        <div className="sky" style={{ '--sky-max': SKY_MAX } as CSSProperties}>
          <div className="sky__grid" aria-hidden="true">
            {[10, 20, 30, 40].map((f) => (
              <span key={f} style={{ bottom: `${(f / SKY_MAX) * 100}%` }}>
                {f} fl
              </span>
            ))}
          </div>
          {tall.map((r, i) => (
            <div key={r.sheet} className="sky__col">
              <button
                type="button"
                className={`sky__bldg${isBuilt(r) ? '' : ' is-unbuilt'}`}
                style={{ '--floors': r.floors } as CSSProperties}
                onClick={() => onOpen(r.sheet)}
                aria-label={`${r.name}: ${r.floors} floors, ${r.status.toLowerCase()}. Open project sheet.`}
              >
                {r.buildings > 1 && <span className="sky__count">×{r.buildings}</span>}
                <span className="tip" role="presentation">
                  <b>{r.name}</b>
                  <span>
                    {r.floors} floor{r.floors === 1 ? '' : 's'}
                    {r.buildings > 1 ? ` · ${r.buildings} towers` : ''}
                    {r.units ? ` · ${fmt(r.units)} homes` : ''}
                  </span>
                  {r.areaM2 && <span>{fmt(r.areaM2)} m²</span>}
                  <span>
                    {r.status} · {r.year ?? 'n.d.'} · {r.city}
                  </span>
                </span>
              </button>
              <span className="sky__name">{r.name}</span>
              <span className="sky__year">{r.year ?? '—'}</span>
              <span className="sky__num" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>
          ))}
        </div>
      </div>
      {/* On phones the columns are too narrow for names: they carry numbers, keyed here. */}
      <ol className="sky__key" aria-hidden="true">
        {tall.map((r, i) => (
          <li key={r.sheet}>
            <span>{String(i + 1).padStart(2, '0')}</span>
            {r.name}
            <em>
              {r.floors} fl · {r.year ?? '—'}
            </em>
          </li>
        ))}
      </ol>
      <p className="nums__note">
        Not drawn, as there is no floor count to scale by: {notDrawn.map((r) => r.name).join(', ')}. Click a building
        to open its sheet.
      </p>
    </figure>
  )
}

// ─── Section ─────────────────────────────────────────────────────────────

const roundK = (n: number) => fmt(Math.round(n / 1000) * 1000)

export default function ByTheNumbers({ onOpenProject }: { onOpenProject: (sheet: string) => void }) {
  const kpis = [
    { label: 'Floor area built', value: roundK(totals.builtAreaM2), unit: 'm²' },
    { label: 'Homes delivered', value: fmt(totals.homes) },
    { label: 'Ballpark seats', value: fmt(totals.seats) },
    { label: 'Countries', value: String(totals.countries) },
  ]
  return (
    <section id="numbers" className="section nums">
      <div className="section__head">
        <Rail label="Architecture · By the numbers" />
        <Reveal>
          <h2 className="display">The buildings, as data.</h2>
          <p className="section__lede">
            {totals.projects} projects, read from their sheets into structured records. Headline totals count completed
            work only: {totals.completed} of {totals.projects} projects, in {totals.cities} cities.
          </p>
        </Reveal>
      </div>

      <dl className="stats">
        {kpis.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08} className="stat">
            <dt>{s.label}</dt>
            <dd>
              <CountUp value={s.value} />
              {s.unit && <small>{s.unit}</small>}
            </dd>
          </Reveal>
        ))}
      </dl>
      <p className="nums__note">
        {fmt(Math.round((totals.builtAreaM2 * SQ_FT_PER_M2) / 100_000) / 10)} million sq ft · {fmt(totals.homes)} homes
        across {totals.homeBuildings} residential buildings · the 20,000-seat Diablos Rojos ballpark
      </p>

      <Budgets onOpen={onOpenProject} />
      <Skyline onOpen={onOpenProject} />
    </section>
  )
}
