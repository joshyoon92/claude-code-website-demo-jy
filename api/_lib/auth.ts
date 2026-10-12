import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

const COOKIE = 'admin_session'
const MAX_AGE = 60 * 60 * 24 * 7 // one week

function password() {
  const p = process.env.ADMIN_PASSWORD
  if (!p) throw new Error('ADMIN_PASSWORD is not set.')
  return p
}

// Sessions are signed with a key derived from the password, so changing
// ADMIN_PASSWORD signs every existing session out.
function sign(value: string) {
  return createHmac('sha256', `session:${password()}`).update(value).digest('base64url')
}

function safeEqual(a: string, b: string) {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export function checkPassword(candidate: string) {
  return safeEqual(candidate, password())
}

export function sessionCookie() {
  const exp = String(Date.now() + MAX_AGE * 1000)
  const token = `${exp}.${sign(exp)}`
  return `${COOKIE}=${token}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`
}

export const clearedCookie = `${COOKIE}=; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0`

export function isAuthed(request: Request) {
  const cookies = request.headers.get('cookie') ?? ''
  const token = cookies
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1)
  if (!token) return false
  const [exp, mac] = token.split('.')
  if (!exp || !mac || Number(exp) < Date.now()) return false
  return safeEqual(mac, sign(exp))
}

// Salted so the stored hash can't be reversed by hashing all IPv4 addresses.
export function hashIp(ip: string) {
  const salt = process.env.VISITOR_SALT ?? password()
  return createHmac('sha256', salt).update(ip).digest('hex').slice(0, 16)
}

export function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...init.headers },
  })
}
