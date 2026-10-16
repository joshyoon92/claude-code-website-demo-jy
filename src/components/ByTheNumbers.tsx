import { useState, type CSSProperties } from 'react'
import { project, records, SQ_FT_PER_M2, totals, type ProjectRecord } from '../data/metrics'
import { LAND } from '../data/worldLand'
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
          {tall.map((r) => (
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
            </div>
          ))}
        </div>
      </div>
      <p className="nums__note">
        Not drawn, as there is no floor count to scale by: {notDrawn.map((r) => r.name).join(', ')}. Click a building
        to open its sheet.
      </p>
    </figure>
  )
}

// ─── Map ─────────────────────────────────────────────────────────────────
// One dot per place (cities closer than a few pixels merge), sized by floor area.

interface Place {
  x: number
  y: number
  cities: string[]
  items: ProjectRecord[]
  area: number
  built: boolean
}
const places: Place[] = []
for (const r of records) {
  const [x, y] = project(r.lng, r.lat)
  const near = places.find((p) => Math.hypot(p.x - x, p.y - y) < 10)
  if (near) {
    near.items.push(r)
    if (!near.cities.includes(r.city)) near.cities.push(r.city)
  } else places.push({ x, y, cities: [r.city], items: [r], area: 0, built: false })
}
for (const p of places) {
  // The busiest city names the place: "Chicago · Woodridge".
  const count = (c: string) => p.items.filter((i) => i.city === c).length
  p.cities.sort((a, b) => count(b) - count(a))
  p.area = p.items.reduce((a, r) => a + (r.areaM2 ?? 0), 0)
  p.built = p.items.some(isBuilt)
}
const maxArea = Math.max(...places.map((p) => p.area))
// Cropped to the band the work sits in (latitude 75°N to 40°S), not the whole globe.
const MAP_TOP = project(0, 75)[1]
const MAP_H = project(0, -40)[1] - MAP_TOP
const radius = (area: number) => 5 + 17 * Math.sqrt(area / maxArea)

function WorkMap() {
  return (
    <figure className="nums__figure">
      <figcaption className="nums__caption">
        <h3>Where the work is</h3>
        <ul className="nums__legend">
          <li>
            <i className="dot-key" style={{ width: 10, height: 10 }} />
            <i className="dot-key" style={{ width: 22, height: 22 }} /> Floor area
          </li>
          <li>
            <i className="dot-key dot-key--unbuilt" style={{ width: 12, height: 12 }} /> Competition only
          </li>
        </ul>
      </figcaption>
      <div className="map-scroll">
      <div className="map" style={{ aspectRatio: `${LAND.width} / ${MAP_H}` }}>
        <svg viewBox={`0 ${MAP_TOP} ${LAND.width} ${MAP_H}`} aria-hidden="true" preserveAspectRatio="none">
          <path d={LAND.d} />
        </svg>
        {places.map((p) => {
          const r = radius(p.area)
          const left = p.items[0].lng < -85 // label away from the neighbouring cluster
          return (
            <div
              key={p.cities.join()}
              className={`map__place${p.built ? '' : ' is-unbuilt'}${left ? ' is-left' : ''}`}
              style={
                {
                  left: `${(p.x / LAND.width) * 100}%`,
                  top: `${((p.y - MAP_TOP) / MAP_H) * 100}%`,
                  '--r': `${r}px`, // keeps the label clear of the dot
                } as CSSProperties
              }
            >
              <button
                type="button"
                className="map__dot"
                style={{ width: r * 2, height: r * 2 }}
                aria-label={`${p.cities.join(' and ')}: ${p.items.map((i) => i.name).join(', ')}`}
              >
                <span className="tip" role="presentation">
                  <b>{p.cities.join(' · ')}</b>
                  {p.items.map((i) => (
                    <span key={i.sheet}>
                      {i.name}
                      {i.status === 'Completed' ? '' : ` (${i.status.toLowerCase()})`}
                    </span>
                  ))}
                  {p.area > 0 && <span className="tip__sum">{fmt(p.area)} m² in total</span>}
                </span>
              </button>
              <span className="map__label">{p.cities.join(' · ')}</span>
            </div>
          )
        })}
      </div>
      </div>
    </figure>
  )
}

// ─── How it's read ───────────────────────────────────────────────────────
// The engineering side: one project's source line, and the record read from it.

const FROM = { program: 'program line', summary: 'summary', stats: 'project stats', facts: 'sheet facts' } as const

function Pipeline() {
  const [sheet, setSheet] = useState('A-302')
  const r = records.find((x) => x.sheet === sheet)!
  const rows: [string, string, string | undefined][] = [
    ['type', r.type, r.sources.type && FROM[r.sources.type]],
    ['floors', r.floors?.toString() ?? '—', r.sources.floors && FROM[r.sources.floors]],
    ['buildings', r.buildings.toString(), r.sources.buildings && FROM[r.sources.buildings]],
    ['units', r.units ? fmt(r.units) : '—', r.sources.units && FROM[r.sources.units]],
    ['seats', r.seats ? fmt(r.seats) : '—', r.sources.seats && FROM[r.sources.seats]],
    [
      'areaM2',
      r.areaM2 ? fmt(r.areaM2) : '—',
      r.areaUnit === 'SF' ? `converted from ${fmt(r.areaGiven!)} SF` : r.areaUnit ? FROM.program : undefined,
    ],
    ['costUsd', r.costUsd ? fmt(r.costUsd) : '—', r.sources.cost && 'fact: Construction cost'],
    ['team', r.team?.toString() ?? '—', r.sources.team && 'fact: Team'],
    ['lat, lng', `${r.lat}, ${r.lng}`, `${r.city}, ${r.country}`],
  ]
  return (
    <figure className="nums__figure">
      <figcaption className="nums__caption">
        <h3>How it’s read</h3>
      </figcaption>
      <p className="nums__lede">
        The project sheets describe each building in a line written for people. A small parser in{' '}
        <code>metrics.ts</code> reads that line into typed fields, falls back to the summary or the project’s stats where
        the line is silent, and converts every area to square metres. Pick a project:
      </p>
      <div className="pipe__picker" role="tablist" aria-label="Project">
        {records.map((x) => (
          <button
            key={x.sheet}
            type="button"
            role="tab"
            aria-selected={x.sheet === sheet}
            className={x.sheet === sheet ? 'is-on' : undefined}
            onClick={() => setSheet(x.sheet)}
          >
            {x.name}
          </button>
        ))}
      </div>
      <div className="pipe">
        <div className="pipe__in">
          <span className="pipe__label">Source · {r.sheet}</span>
          <q>{r.raw}</q>
        </div>
        <span className="pipe__arrow" aria-hidden="true">
          →
        </span>
        <dl className="pipe__out">
          <span className="pipe__label">Record</span>
          {rows.map(([k, v, from]) => (
            <div key={k} className={v === '—' ? 'is-empty' : undefined}>
              <dt>{k}</dt>
              <dd>{v}</dd>
              <dd className="pipe__from">{from ? `← ${from}` : ''}</dd>
            </div>
          ))}
        </dl>
      </div>
      <details className="pipe__table">
        <summary>All {records.length} records as a table</summary>
        <div className="pipe__scroll">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Status</th>
                <th>Year</th>
                <th>Type</th>
                <th className="num">Floors</th>
                <th className="num">Homes</th>
                <th className="num">Area (m²)</th>
                <th className="num">Cost</th>
                <th className="num">Team</th>
                <th>Place</th>
              </tr>
            </thead>
            <tbody>
              {records.map((x) => (
                <tr key={x.sheet}>
                  <td>{x.name}</td>
                  <td>{x.status}</td>
                  <td>{x.year ?? '—'}</td>
                  <td>{x.type}</td>
                  <td className="num">{x.floors ?? '—'}</td>
                  <td className="num">{x.units ? fmt(x.units) : '—'}</td>
                  <td className="num">{x.areaM2 ? fmt(x.areaM2) : '—'}</td>
                  <td className="num">{x.costUsd ? money(x.costUsd) : '—'}</td>
                  <td className="num">{x.team ?? '—'}</td>
                  <td>
                    {x.city}, {x.country}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
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
      <WorkMap />
      <Pipeline />
    </section>
  )
}
