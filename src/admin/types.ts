export type Bucket = { bucket: string; visits: number; visitors: number }
export type Count = { label: string; count: number }

export type Place = {
  city: string | null
  region: string | null
  postal_code: string | null
  country: string | null
}

export type Visitor = Place & {
  visitor_id: string
  first_seen: string
  last_seen: string
  visits: number
  total_time: number
  max_scroll: number | null
  timezone: string | null
  language: string | null
  browser: string | null
  os: string | null
  device: string | null
  first_referrer: string | null
  landing: string | null
  ref: string | null
  networks: number
  sections: string[] | null
  actions: number
  clicks: string[] | null
}

export type VisitEvent = {
  ts: string
  type: 'click' | 'project' | 'photo'
  target: string | null
  label: string | null
}

export type Visit = Place & {
  id: string
  ts: string
  visitor_id: string
  path: string | null
  referrer: string | null
  ref: string | null
  timezone: string | null
  browser: string | null
  os: string | null
  device: string | null
  language: string | null
  duration_s: number | null
  max_scroll: number | null
  sections: string[] | null
  events: VisitEvent[] | null
}

export type BreakdownKey =
  | 'referrer'
  | 'ref'
  | 'country'
  | 'path'
  | 'language'
  | 'browser'
  | 'os'
  | 'device'
  | 'sections'
  | 'actions'
  | 'projects'
  | 'photos'

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
    month_avg_time: number | null
    month_avg_scroll: number | null
    month_contact_clicks: number
    month_actions: number
  }
  series: { day: Bucket[]; week: Bucket[]; month: Bucket[] }
  breakdowns: Record<BreakdownKey, Count[]>
  visitors: Visitor[]
  log: Visit[]
}
