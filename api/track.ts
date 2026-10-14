import { hashIp, withErrors } from './_lib/auth.js'
import { ensureSchema, sql } from './_lib/db.js'

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|curl|wget|python|go-http/i

function clip(value: unknown, max = 300) {
  return typeof value === 'string' && value ? value.slice(0, max) : null
}

function header(request: Request, name: string) {
  const v = request.headers.get(name)
  if (!v) return null
  try {
    return decodeURIComponent(v)
  } catch {
    return v
  }
}

function parseAgent(ua: string) {
  const browser =
    /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
    : /Firefox\/|FxiOS/.test(ua) ? 'Firefox'
    : /Chrome\/|CriOS/.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Other'
  const os =
    /Windows/.test(ua) ? 'Windows'
    : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Android/.test(ua) ? 'Android'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /CrOS/.test(ua) ? 'ChromeOS'
    : /Linux/.test(ua) ? 'Linux'
    : 'Other'
  const device = /iPad|Tablet/.test(ua) ? 'Tablet' : /Mobi|iPhone|Android/.test(ua) ? 'Mobile' : 'Desktop'
  return { browser, os, device }
}

const EVENT_TYPES = new Set(['click', 'project', 'photo'])
const MAX_EVENTS_PER_VISIT = 300

function int(value: unknown, min: number, max: number) {
  const n = Math.round(Number(value))
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null
}

type Body = Record<string, unknown>

// A page load: one row in visits.
async function recordVisit(request: Request, body: Body, visitorId: string, visitKey: string | null, ua: string) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const { browser, os, device } = parseAgent(ua)
  // Skipped entirely for browsers the admin has used.
  await sql`
    INSERT INTO visits (visitor_id, visit_key, ip_hash, path, referrer, ref, utm_source, utm_medium, utm_campaign,
                        country, region, city, postal_code, timezone, browser, os, device, language, user_agent)
    SELECT ${visitorId}, ${visitKey}, ${ip ? hashIp(ip) : null}, ${clip(body.path)}, ${clip(body.referrer)},
           ${clip(body.ref, 100)}, ${clip(body.utmSource, 100)}, ${clip(body.utmMedium, 100)}, ${clip(body.utmCampaign, 100)},
           ${header(request, 'x-vercel-ip-country')}, ${header(request, 'x-vercel-ip-country-region')},
           ${header(request, 'x-vercel-ip-city')}, ${header(request, 'x-vercel-ip-postal-code')},
           ${header(request, 'x-vercel-ip-timezone')}, ${browser}, ${os}, ${device},
           ${clip(body.language, 32)}, ${clip(ua, 500)}
     WHERE NOT EXISTS (SELECT 1 FROM excluded_visitors WHERE visitor_id = ${visitorId})
    ON CONFLICT (visit_key) DO NOTHING`
}

// Engagement so far for an open page; values only ever grow.
async function recordEngagement(body: Body, visitorId: string, visitKey: string) {
  const sections = (Array.isArray(body.sections) ? body.sections : [])
    .filter((s): s is string => typeof s === 'string' && /^[\w-]{1,40}$/.test(s))
    .slice(0, 40)
  await sql`
    UPDATE visits SET
      duration_s = GREATEST(COALESCE(duration_s, 0), ${int(body.duration, 0, 86400) ?? 0}),
      max_scroll = GREATEST(COALESCE(max_scroll, 0), ${int(body.scroll, 0, 100) ?? 0}),
      sections   = (SELECT array_agg(DISTINCT s) FROM unnest(COALESCE(sections, '{}') || ${sections}::text[]) AS s)
    WHERE visit_key = ${visitKey} AND visitor_id = ${visitorId}`
}

// One action. Only accepted for a visit that was recorded (so never for the
// admin's browsers), and capped per visit.
async function recordEvent(body: Body, visitorId: string, visitKey: string) {
  const type = clip(body.type, 20)
  if (!type || !EVENT_TYPES.has(type)) return
  await sql`
    INSERT INTO events (visit_key, visitor_id, type, target, label)
    SELECT ${visitKey}, ${visitorId}, ${type}, ${clip(body.target, 100)}, ${clip(body.label, 200)}
     WHERE EXISTS (SELECT 1 FROM visits WHERE visit_key = ${visitKey} AND visitor_id = ${visitorId})
       AND (SELECT count(*) FROM events WHERE visit_key = ${visitKey}) < ${MAX_EVENTS_PER_VISIT}`
}

// Public endpoint: errors are logged but not echoed back to visitors.
export const POST = withErrors(async (request: Request) => {
  const ua = request.headers.get('user-agent') ?? ''
  if (!ua || BOT.test(ua)) return new Response(null, { status: 204 })

  let body: Body = {}
  try {
    body = JSON.parse(await request.text())
  } catch {
    return new Response(null, { status: 400 })
  }

  const visitorId = clip(body.visitorId, 64)
  const visitKey = clip(body.visitKey, 64)
  if (!visitorId) return new Response(null, { status: 400 })

  await ensureSchema()
  const kind = body.kind ?? 'visit'
  if (kind === 'visit') await recordVisit(request, body, visitorId, visitKey, ua)
  else if (!visitKey) return new Response(null, { status: 400 })
  else if (kind === 'engage') await recordEngagement(body, visitorId, visitKey)
  else if (kind === 'event') await recordEvent(body, visitorId, visitKey)
  else return new Response(null, { status: 400 })

  return new Response(null, { status: 204 })
}, false)
