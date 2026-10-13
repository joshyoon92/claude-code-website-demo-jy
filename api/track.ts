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

// Public endpoint: errors are logged but not echoed back to visitors.
export const POST = withErrors(async (request: Request) => {
  const ua = request.headers.get('user-agent') ?? ''
  if (!ua || BOT.test(ua)) return new Response(null, { status: 204 })

  let body: Record<string, unknown> = {}
  try {
    body = JSON.parse(await request.text())
  } catch {
    return new Response(null, { status: 400 })
  }

  const visitorId = clip(body.visitorId, 64)
  if (!visitorId) return new Response(null, { status: 400 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const { browser, os, device } = parseAgent(ua)

  await ensureSchema()
  await sql`
    INSERT INTO visits (visitor_id, ip_hash, path, referrer, country, region, city,
                        browser, os, device, language, screen, user_agent)
    VALUES (${visitorId}, ${ip ? hashIp(ip) : null}, ${clip(body.path)}, ${clip(body.referrer)},
            ${header(request, 'x-vercel-ip-country')}, ${header(request, 'x-vercel-ip-country-region')},
            ${header(request, 'x-vercel-ip-city')}, ${browser}, ${os}, ${device},
            ${clip(body.language, 32)}, ${clip(body.screen, 32)}, ${clip(ua, 500)})`

  return new Response(null, { status: 204 })
}, false)
