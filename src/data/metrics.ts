// The architecture projects as structured records, for the "By the numbers"
// dashboard. Each project's size lives in a line written for people
// ("8-story multifamily · 300 units · 440,450 SF"); this file reads that line
// (and the summary, and a featured project's stats) into typed fields, converts
// every area to square metres, sorts each project into a building type, and
// places it on the map. The dashboard draws only from these records.
import { featured, projects, type Project, type Status } from './projects'
import { LAND } from './worldLand'

export type BuildingType = 'Residential' | 'Office' | 'Sports' | 'Mixed-use' | 'Restaurant' | 'Industrial'

export interface ProjectRecord {
  sheet: string
  name: string
  firm: string
  status: Status
  /** First year of the project, as a number. */
  year: number | null
  city: string
  country: string
  lat: number
  lng: number
  type: BuildingType
  floors: number | null
  units: number | null
  seats: number | null
  /** Gross floor area in m², whatever unit the source used. */
  areaM2: number | null
  /** The area as given, and its unit, before conversion. */
  areaGiven: number | null
  areaUnit: 'SF' | 'm²' | null
  /** Separate buildings, e.g. "3 office towers". */
  buildings: number
  /** Construction cost in US dollars. */
  costUsd: number | null
  /** People on the architecture team, where the sheet gives a number. */
  team: number | null
  teamNote: string | null
  schedule: string | null
  /** Where each field came from, for the pipeline view. */
  sources: Partial<
    Record<'floors' | 'units' | 'seats' | 'area' | 'type' | 'buildings' | 'cost' | 'team', 'program' | 'summary' | 'stats' | 'facts'>
  >
  /** The original line the record was read from. */
  raw: string
}

const SQ_FT_TO_M2 = 0.09290304

// City centres (public coordinates), and the country each region is in.
const PLACES: Record<string, { lat: number; lng: number }> = {
  'Woodridge, Illinois': { lat: 41.747, lng: -88.05 },
  'Chicago, Illinois': { lat: 41.878, lng: -87.63 },
  'Houston, Texas': { lat: 29.76, lng: -95.37 },
  'Cambridge, Ontario': { lat: 43.36, lng: -80.312 },
  'Burlington, Ontario': { lat: 43.325, lng: -79.799 },
  'Shanghai, China': { lat: 31.23, lng: 121.474 },
  'Mexico City, Mexico': { lat: 19.433, lng: -99.133 },
  'Shenzhen, China': { lat: 22.543, lng: 114.058 },
}
const COUNTRY_OF: Record<string, string> = {
  Illinois: 'United States',
  Texas: 'United States',
  Ontario: 'Canada',
  China: 'China',
  Mexico: 'Mexico',
}

// First match wins, so the more specific words come first.
const TYPES: [RegExp, BuildingType][] = [
  [/convention|masterplan/i, 'Mixed-use'],
  [/manufactur|industrial/i, 'Industrial'], // before office: "office / manufacturing" is a plant
  [/office tower|office\b/i, 'Office'],
  [/ballpark|stadium/i, 'Sports'],
  [/restaurant/i, 'Restaurant'],
  [/residen|multifamily|units|house/i, 'Residential'],
]

const num = (s: string) => Number(s.replace(/,/g, ''))

/** Reads one project into a record. Exported so it can be shown and tested. */
export function toRecord(p: Project): ProjectRecord {
  const text = p.program
  const sources: ProjectRecord['sources'] = {}

  let floors: number | null = null
  const story = text.match(/(\d+)[- ]stor(?:y|ies)/i)
  if (story) {
    floors = num(story[1])
    sources.floors = 'program'
  } else if (/single[- ]stor(?:e)?y/i.test(p.summary)) {
    floors = 1
    sources.floors = 'summary'
  } else {
    const stat = featured.find((f) => f.sheet === p.sheet)?.stats.find((s) => s.label === 'Floors')
    if (stat) {
      floors = num(stat.value)
      sources.floors = 'stats'
    }
  }

  const unitsMatch = text.match(/([\d,]+) units/i)
  const units = unitsMatch ? num(unitsMatch[1]) : null
  if (units) sources.units = 'program'

  const seatsMatch = text.match(/([\d,]+)[- ]seats?/i)
  const seats = seatsMatch ? num(seatsMatch[1]) : null
  if (seats) sources.seats = 'program'

  let areaM2: number | null = null
  let areaGiven: number | null = null
  let areaUnit: ProjectRecord['areaUnit'] = null
  const area = text.match(/([\d,]+)\s*(GSF|SF|m²)/)
  if (area) {
    areaUnit = area[2] === 'm²' ? 'm²' : 'SF'
    areaGiven = num(area[1])
    areaM2 = Math.round(areaUnit === 'SF' ? areaGiven * SQ_FT_TO_M2 : areaGiven)
    sources.area = 'program'
  }

  const towers = text.match(/(\d+) (?:office towers|high-rises|towers)/i)
  const buildings = towers ? num(towers[1]) : 1
  if (towers) sources.buildings = 'program'

  // The type comes from the program line, or the summary if the line doesn't say.
  let type = TYPES.find(([re]) => re.test(text))?.[1]
  if (type) sources.type = 'program'
  else {
    type = TYPES.find(([re]) => re.test(p.summary))?.[1] ?? 'Mixed-use'
    sources.type = 'summary'
  }

  // Cost and team come from the sheet's facts: "$10.6 million", "Managed a team of 9".
  const fact = (label: string) => p.facts?.find((f) => f.label === label)?.value ?? null
  const costText = fact('Construction cost')
  const money = costText?.match(/\$([\d.,]+)\s*(million|billion)?/i)
  const costUsd = money
    ? Math.round(num(money[1]) * (/billion/i.test(money[2] ?? '') ? 1e9 : /million/i.test(money[2] ?? '') ? 1e6 : 1))
    : null
  if (costUsd) sources.cost = 'facts'
  const teamNote = fact('Team')
  const teamSize = teamNote?.match(/(\d+)/)
  const team = teamSize ? num(teamSize[1]) : null
  if (team) sources.team = 'facts'

  const place = PLACES[p.location]
  if (!place) throw new Error(`No coordinates for ${p.location}`)
  const region = p.location.split(', ').at(-1)!

  return {
    sheet: p.sheet,
    name: p.name,
    firm: p.firm,
    status: p.status,
    year: p.year ? num(p.year.slice(0, 4)) : null,
    city: p.location.split(', ')[0],
    country: COUNTRY_OF[region] ?? region,
    ...place,
    type,
    floors,
    units,
    seats,
    areaM2,
    areaGiven,
    areaUnit,
    buildings,
    costUsd,
    team,
    teamNote,
    schedule: fact('Schedule'),
    sources,
    raw: text,
  }
}

export const records: ProjectRecord[] = projects.map(toRecord)

// Headline totals count completed work only.
const built = records.filter((r) => r.status === 'Completed')
const sum = (xs: (number | null)[]) => xs.reduce<number>((a, x) => a + (x ?? 0), 0)
export const totals = {
  projects: records.length,
  completed: built.length,
  builtAreaM2: sum(built.map((r) => r.areaM2)),
  homes: sum(built.map((r) => r.units)),
  homeBuildings: built.filter((r) => r.units).length,
  seats: Math.max(...built.map((r) => r.seats ?? 0)), // the ballpark; restaurant seats aren't comparable
  countries: new Set(built.map((r) => r.country)).size,
  costUsd: sum(records.map((r) => r.costUsd)),
  costed: records.filter((r) => r.costUsd).length,
  largestTeam: Math.max(...records.map((r) => r.team ?? 0)),
  cities: new Set(built.map((r) => r.city)).size,
  byStatus: Object.fromEntries(
    [...new Set(records.map((r) => r.status))].map((s) => [s, records.filter((r) => r.status === s).length]),
  ) as Partial<Record<Status, number>>,
}
export const SQ_FT_PER_M2 = 1 / SQ_FT_TO_M2

/**
 * Equal Earth projection, matching the generated land outline in worldLand.ts:
 * (lng, lat) in degrees → (x, y) in the map's 960-wide frame.
 */
export function project(lng: number, lat: number): [number, number] {
  const A1 = 1.340264
  const A2 = -0.081106
  const A3 = 0.000893
  const A4 = 0.003796
  const M = Math.sqrt(3) / 2
  const lambda = (lng * Math.PI) / 180
  const l = Math.asin(M * Math.sin((lat * Math.PI) / 180))
  const l2 = l * l
  const l6 = l2 * l2 * l2
  const x = (lambda * Math.cos(l)) / (M * (A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2)))
  const y = l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2))
  return [x * LAND.k + LAND.tx, -y * LAND.k + LAND.ty]
}
