import { isAuthed, json, withErrors } from '../_lib/auth.js'
import { ensureSchema, sql } from '../_lib/db.js'

const RANGES = new Set([7, 30, 90, 365, 0]) // 0 = all time
const UNITS = { day: 90, week: 26, month: 24 } as const

// The campaign tag a visit arrived with: ?ref=, else utm_campaign / utm_source.
const REF = `COALESCE(NULLIF(ref, ''), NULLIF(utm_campaign, ''), NULLIF(utm_source, ''))`

// Each breakdown is "top 8 labels by count" over the selected range ($1 = days).
// Visit breakdowns count page loads; event breakdowns count actions.
const RANGE = `($1::int = 0 OR ts >= now() - make_interval(days => $1::int))`
const visitColumn = (column: string) =>
  `SELECT COALESCE(NULLIF(${column}, ''), '(unknown)') AS label, count(*)::int AS count
     FROM counted_visits WHERE ${RANGE} GROUP BY 1`
const BREAKDOWNS = {
  // Referrers are grouped by host so every Google search counts as one source.
  referrer: `SELECT COALESCE(NULLIF(substring(referrer from '^https?://(?:www\\.)?([^/:]+)'), ''), '(direct)') AS label,
                    count(*)::int AS count
               FROM counted_visits WHERE ${RANGE} GROUP BY 1`,
  ref: `SELECT ${REF} AS label, count(*)::int AS count FROM counted_visits WHERE ${RANGE} AND ${REF} IS NOT NULL GROUP BY 1`,
  country: visitColumn('country'),
  path: visitColumn('path'),
  language: visitColumn('language'),
  browser: visitColumn('browser'),
  os: visitColumn('os'),
  device: visitColumn('device'),
  sections: `SELECT s AS label, count(*)::int AS count FROM counted_visits, unnest(sections) AS s WHERE ${RANGE} GROUP BY 1`,
  actions: `SELECT target AS label, count(*)::int AS count FROM counted_events WHERE ${RANGE} AND type = 'click' GROUP BY 1`,
  projects: `SELECT label, count(*)::int AS count FROM counted_events WHERE ${RANGE} AND type = 'project' GROUP BY 1`,
  photos: `SELECT target AS label, count(*)::int AS count FROM counted_events WHERE ${RANGE} AND type = 'photo' GROUP BY 1`,
}
const BREAKDOWN_KEYS = Object.keys(BREAKDOWNS) as (keyof typeof BREAKDOWNS)[]

// The admin's own visitor IDs (first 8 characters, as shown on the dashboard),
// excluded once. After that the dashboard's "Excluded visitors" panel owns the
// list, so a visitor released there stays released.
const SEED_OWN_VISITORS = ['7fda5b6a', 'b89d494e', 'd628a49a', '237fcda4', '405d9ef2']

// Clicks that mean someone wants to get in touch.
const CONTACT_TARGETS = ['email', 'linkedin', 'resume', 'phone']

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
    ), t AS (
    SELECT
      count(*) FILTER (WHERE ts >= b.week)::int                                   AS week_visits,
      count(DISTINCT visitor_id) FILTER (WHERE ts >= b.week)::int                 AS week_visitors,
      count(*) FILTER (WHERE ts >= b.week - interval '1 week' AND ts < b.week)::int AS prev_week_visits,
      count(*) FILTER (WHERE ts >= b.month)::int                                  AS month_visits,
      count(DISTINCT visitor_id) FILTER (WHERE ts >= b.month)::int                AS month_visitors,
      count(*) FILTER (WHERE ts >= b.month - interval '1 month' AND ts < b.month)::int AS prev_month_visits,
      count(*)::int                                                               AS all_visits,
      count(DISTINCT visitor_id)::int                                             AS all_visitors,
      min(ts)                                                                     AS first_visit,
      round(avg(duration_s) FILTER (WHERE ts >= b.month AND duration_s > 0))::int AS month_avg_time,
      round(avg(max_scroll) FILTER (WHERE ts >= b.month AND max_scroll > 0))::int AS month_avg_scroll
    FROM counted_visits, b
    ), ev AS (
    SELECT
      count(*) FILTER (WHERE type = 'click' AND target = ANY(${CONTACT_TARGETS}::text[]))::int AS month_contact_clicks,
      count(*)::int                                                               AS month_actions
    FROM counted_events, b
    WHERE ts >= b.month
    )
    SELECT * FROM t, ev`
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
       LEFT JOIN counted_visits v ON date_trunc($2::text, v.ts AT TIME ZONE $1::text) = g.bucket
      GROUP BY g.bucket
      ORDER BY g.bucket`,
    [tz, unit, UNITS[unit] - 1],
  )
}

async function breakdown(query: string, days: number) {
  return sql.query(`${query} ORDER BY 2 DESC, 1 LIMIT 8`, [days])
}

async function visitors(days: number) {
  return sql.query(
    `SELECT v.visitor_id,
            min(v.ts) AS first_seen,
            max(v.ts) AS last_seen,
            count(*)::int AS visits,
            COALESCE(sum(v.duration_s), 0)::int AS total_time,
            max(v.max_scroll)::int AS max_scroll,
            (array_agg(v.city        ORDER BY v.ts DESC))[1] AS city,
            (array_agg(v.region      ORDER BY v.ts DESC))[1] AS region,
            (array_agg(v.postal_code ORDER BY v.ts DESC))[1] AS postal_code,
            (array_agg(v.country     ORDER BY v.ts DESC))[1] AS country,
            (array_agg(v.timezone    ORDER BY v.ts DESC))[1] AS timezone,
            (array_agg(v.language    ORDER BY v.ts DESC))[1] AS language,
            (array_agg(v.browser     ORDER BY v.ts DESC))[1] AS browser,
            (array_agg(v.os          ORDER BY v.ts DESC))[1] AS os,
            (array_agg(v.device      ORDER BY v.ts DESC))[1] AS device,
            (array_agg(v.referrer    ORDER BY v.ts ASC))[1]  AS first_referrer,
            (array_agg(v.path        ORDER BY v.ts ASC))[1]  AS landing,
            (array_agg(${REF} ORDER BY v.ts ASC) FILTER (WHERE ${REF} IS NOT NULL))[1] AS ref,
            count(DISTINCT v.ip_hash)::int AS networks,
            (SELECT array_agg(DISTINCT s) FROM counted_visits v2, unnest(v2.sections) AS s
              WHERE v2.visitor_id = v.visitor_id AND ($1::int = 0 OR v2.ts >= now() - make_interval(days => $1::int))) AS sections,
            (SELECT count(*)::int FROM counted_events e
              WHERE e.visitor_id = v.visitor_id AND ($1::int = 0 OR e.ts >= now() - make_interval(days => $1::int))) AS actions,
            (SELECT array_agg(DISTINCT e.target) FROM counted_events e
              WHERE e.visitor_id = v.visitor_id AND e.type = 'click'
                AND ($1::int = 0 OR e.ts >= now() - make_interval(days => $1::int))) AS clicks
       FROM counted_visits v
      WHERE ($1::int = 0 OR v.ts >= now() - make_interval(days => $1::int))
      GROUP BY v.visitor_id
      ORDER BY last_seen DESC
      LIMIT 1000`,
    [days],
  )
}

// Every page load, with what happened during it.
async function log(days: number) {
  return sql.query(
    `SELECT v.id, v.ts, v.visitor_id, v.path, v.referrer, ${REF} AS ref,
            v.city, v.region, v.postal_code, v.country, v.timezone,
            v.browser, v.os, v.device, v.language,
            v.duration_s, v.max_scroll, v.sections,
            (SELECT json_agg(json_build_object('ts', e.ts, 'type', e.type, 'target', e.target, 'label', e.label) ORDER BY e.ts)
               FROM counted_events e WHERE e.visit_key = v.visit_key) AS events
       FROM counted_visits v
      WHERE ($1::int = 0 OR v.ts >= now() - make_interval(days => $1::int))
      ORDER BY v.ts DESC
      LIMIT 1000`,
    [days],
  )
}

// Everyone currently excluded, with enough about each to tell whether it's the admin.
async function excluded() {
  return sql`
    SELECT e.visitor_id, e.source, e.added,
           count(v.id)::int AS visits,
           max(v.ts) AS last_seen,
           (array_agg(v.city    ORDER BY v.ts DESC))[1] AS city,
           (array_agg(v.region  ORDER BY v.ts DESC))[1] AS region,
           (array_agg(v.country ORDER BY v.ts DESC))[1] AS country,
           (array_agg(v.browser ORDER BY v.ts DESC))[1] AS browser,
           (array_agg(v.os      ORDER BY v.ts DESC))[1] AS os,
           (array_agg(v.device  ORDER BY v.ts DESC))[1] AS device
      FROM excluded_visitors e
      LEFT JOIN visits v ON v.visitor_id = e.visitor_id
     GROUP BY e.visitor_id, e.source, e.added
     ORDER BY max(v.ts) DESC NULLS LAST`
}

export const GET = withErrors(async (request: Request) => {
  if (!isAuthed(request)) return json({ error: 'Unauthorized' }, { status: 401 })

  const params = new URL(request.url).searchParams
  const tz = validTz(params.get('tz'))
  const range = Number(params.get('range') ?? 30)
  const days = RANGES.has(range) ? range : 30

  await ensureSchema()

  // The admin's own browser: exclude it (past and future) before counting.
  const self = request.headers.get('x-visitor-id')?.slice(0, 64)
  if (self) await sql`INSERT INTO excluded_visitors (visitor_id, source) VALUES (${self}, 'admin') ON CONFLICT DO NOTHING`
  const [seeded] = await sql`INSERT INTO admin_flags (key) VALUES ('seed-own-visitors') ON CONFLICT DO NOTHING RETURNING key`
  if (seeded) {
    await sql`
      INSERT INTO excluded_visitors (visitor_id, source)
      SELECT DISTINCT visitor_id, 'manual' FROM visits WHERE left(visitor_id, 8) = ANY(${SEED_OWN_VISITORS}::text[])
      ON CONFLICT DO NOTHING`
  }

  const [summary, day, week, month, visitorRows, logRows, excludedRows, ...breakdowns] = await Promise.all([
    totals(tz),
    series(tz, 'day'),
    series(tz, 'week'),
    series(tz, 'month'),
    visitors(days),
    log(days),
    excluded(),
    ...BREAKDOWN_KEYS.map((k) => breakdown(BREAKDOWNS[k], days)),
  ])

  return json({
    tz,
    range: days,
    summary,
    series: { day, week, month },
    breakdowns: Object.fromEntries(BREAKDOWN_KEYS.map((k, i) => [k, breakdowns[i]])),
    visitors: visitorRows,
    log: logRows,
    excluded: excludedRows,
  })
})
