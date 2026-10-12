export type Bucket = { bucket: string; visits: number; visitors: number }
export type Count = { label: string; visits: number }

export type Visitor = {
  visitor_id: string
  first_seen: string
  last_seen: string
  visits: number
  city: string | null
  region: string | null
  country: string | null
  browser: string | null
  os: string | null
  device: string | null
  first_referrer: string | null
  networks: number
}

export type Visit = {
  id: string
  ts: string
  visitor_id: string
  path: string | null
  referrer: string | null
  city: string | null
  region: string | null
  country: string | null
  browser: string | null
  os: string | null
  device: string | null
  language: string | null
  screen: string | null
}

export type Stats = {
  tz: string
  range: number
  summary: {
    week_visits: number
    week_visitors: number
    prev_week_visits: number
    month_visits: number
    month_visitors: number
    prev_month_visits: number
    all_visits: number
    all_visitors: number
    first_visit: string | null
  }
  series: { day: Bucket[]; week: Bucket[]; month: Bucket[] }
  breakdowns: Record<'country' | 'referrer' | 'path' | 'browser' | 'os' | 'device', Count[]>
  visitors: Visitor[]
  log: Visit[]
}
