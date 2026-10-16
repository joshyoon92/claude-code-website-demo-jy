import type { CSSProperties } from 'react'
import { project, records, type ProjectRecord } from '../data/metrics'
import { LAND } from '../data/worldLand'
import './ByTheNumbers.css'

// "Where the work is": every architecture project on a world map, one dot per
// place, sized by floor area. Shown under the project index heading; it loads
// in its own chunk because it carries the world outline.

const fmt = (n: number) => n.toLocaleString('en-US')
const isBuilt = (r: ProjectRecord) => r.status === 'Completed'

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
places.sort((a, b) => a.x - b.x) // numbered west to east on phones
const maxArea = Math.max(...places.map((p) => p.area))
// Cropped to the band the work sits in (latitude 75°N to 40°S), not the whole globe.
const MAP_TOP = project(0, 75)[1]
const MAP_H = project(0, -40)[1] - MAP_TOP
const radius = (area: number) => 5 + 17 * Math.sqrt(area / maxArea)

export default function WorkMap() {
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
        {places.map((p, n) => {
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
                style={{ '--d': `${r * 2}px` } as CSSProperties}
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
              <span className="map__label">
                <span className="map__label-full">{p.cities.join(' · ')}</span>
                <span className="map__label-num">{n + 1}</span>
              </span>
            </div>
          )
        })}
      </div>
      </div>
      {/* On phones the city names would collide on the map: dots carry numbers, keyed here. */}
      <ol className="map__key">
        {places.map((p, n) => (
          <li key={p.cities.join()}>
            <span>{n + 1}</span>
            <b>{p.cities.join(' · ')}</b>
            <em>
              {p.items.length} project{p.items.length === 1 ? '' : 's'}
              {p.area > 0 ? ` · ${fmt(p.area)} m²` : ''}
            </em>
          </li>
        ))}
      </ol>
    </figure>
  )
}

