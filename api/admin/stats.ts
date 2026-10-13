import { isAuthed, json, withErrors } from '../_lib/auth.js'
import { ensureSchema, sql } from '../_lib/db.js'

const RANGES = new Set([7, 30, 90, 365, 0]) // 0 = all time
const UNITS = { day: 90, week: 26, month: 24 } as const
const BREAKDOWNS = ['country', 'referrer', 'path', 'browser', 'os', 'device'] as const

function validTz(tz: string | null) {
  if (!tz || !/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/.test(tz)) return 'UTC'
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz })
    return tz
  } catch {
    return 'UTC'
  }
}

// Weeks start Monday (Postgres date_trunc); all buckets are in the admin's local time.
async function totals(tz: string) {
  const [row] = await sql`
    WITH b AS (
      SELECT date_trunc('week',  now() AT TIME ZONE ${tz}::text) AT TIME ZONE ${tz}::text AS week,
             date_trunc('month', now() AT TIME ZONE ${tz}::text) AT TIME ZONE ${tz}::text AS month
    )
    SELECT
      count(*) FILTER (WHERE ts >= b.week)::int                                   AS week_visits,
      count(DISTINCT visitor_id) FILTER (WHERE ts >= b.week)::int                 AS week_visitors,
      count(*) FILTER (WHERE ts >= b.week - interval '1 week' AND ts < b.week)::int AS prev_week_visits,
      count(*) FILTER (WHERE ts >= b.month)::int                                  AS month_visits,
      count(DISTINCT visitor_id) FILTER (WHERE ts >= b.month)::int                AS month_visitors,
      count(*) FILTER (WHERE ts >= b.month - interval '1 month' AND ts < b.month)::int AS prev_month_visits,
      count(*)::int                                                               AS all_visits,
      count(DISTINCT visitor_id)::int                                             AS all_visitors,
      min(ts)                                                                     AS first_visit
    FROM visits, b`
  return row
}

async function series(tz: string, unit: keyof typeof UNITS) {
  return sql.query(
    `SELECT to_char(g.bucket, 'YYYY-MM-DD') AS bucket,
            count(v.id)::int                AS visits,
            count(DISTINCT v.visitor_id)::int AS visitors
       FROM generate_series(
              date_trunc($2::text, now() AT TIME ZONE $1::text) - ($3::int * ('1 ' || $2::text)::interval),
              date_trunc($2::text, now() AT TIME ZONE $1::text),
              ('1 ' || $2::text)::interval) AS g(bucket)
       LEFT JOIN visits v ON date_trunc($2::text, v.ts AT TIME ZONE $1::text) = g.bucket
      GROUP BY g.bucket
      ORDER BY g.bucket`,
    [tz, unit, UNITS[unit] - 1],
  )
}

async function breakdown(column: (typeof BREAKDOWNS)[number], days: number) {
  // Referrers are grouped by host so every Google search counts as one source.
  const expr =
    column === 'referrer'
      ? `COALESCE(NULLIF(substring(referrer from '^https?://(?:www\\.)?([^/:]+)'), ''), '(direct)')`
      : `COALESCE(NULLIF(${column}, ''), '(unknown)')`
  return sql.query(
    `SELECT ${expr} AS label, count(*)::int AS visits
       FROM visits
      WHERE ($1::int = 0 OR ts >= now() - make_interval(days => $1::int))
      GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
    [days],
  )
}

async function visitors(days: number) {
  return sql`
    SELECT visitor_id,
           min(ts) AS first_seen,
           max(ts) AS last_seen,
           count(*)::int AS visits,
           (array_agg(city     ORDER BY ts DESC))[1] AS city,
           (array_agg(region   ORDER BY ts DESC))[1] AS region,
           (array_agg(country  ORDER BY ts DESC))[1] AS country,
           (array_agg(browser  ORDER BY ts DESC))[1] AS browser,
           (array_agg(os       ORDER BY ts DESC))[1] AS os,
           (array_agg(device   ORDER BY ts DESC))[1] AS device,
           (array_agg(referrer ORDER BY ts ASC))[1]  AS first_referrer,
           count(DISTINCT ip_hash)::int AS networks
      FROM visits
     WHERE (${days}::int = 0 OR ts >= now() - make_interval(days => ${days}::int))
     GROUP BY visitor_id
     ORDER BY last_seen DESC
     LIMIT 1000`
}

async function log(days: number) {
  return sql`
    SELECT id, ts, visitor_id, path, referrer, city, region, country, browser, os, device, language, screen
      FROM visits
     WHERE (${days}::int = 0 OR ts >= now() - make_interval(days => ${days}::int))
     ORDER BY ts DESC
     LIMIT 1000`
}

export const GET = withErrors(async (request: Request) => {
  if (!isAuthed(request)) return json({ error: 'Unauthorized' }, { status: 401 })

  const params = new URL(request.url).searchParams
  const tz = validTz(params.get('tz'))
  const range = Number(params.get('range') ?? 30)
  const days = RANGES.has(range) ? range : 30

  await ensureSchema()
  const [summary, day, week, month, visitorRows, logRows, ...breakdowns] = await Promise.all([
    totals(tz),
    series(tz, 'day'),
    series(tz, 'week'),
    series(tz, 'month'),
    visitors(days),
    log(days),
    ...BREAKDOWNS.map((c) => breakdown(c, days)),
  ])

  return json({
    tz,
    range: days,
    summary,
    series: { day, week, month },
    breakdowns: Object.fromEntries(BREAKDOWNS.map((c, i) => [c, breakdowns[i]])),
    visitors: visitorRows,
    log: logRows,
  })
})
