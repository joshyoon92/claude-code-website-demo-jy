import { checkPassword, clearedCookie, json, sessionCookie } from '../_lib/auth.js'

export async function POST(request: Request) {
  let password = ''
  try {
    password = String((await request.json()).password ?? '')
  } catch {
    // fall through with an empty password
  }

  if (!password || !checkPassword(password)) {
    // Slow down guessing.
    await new Promise((r) => setTimeout(r, 800))
    return json({ error: 'Wrong password' }, { status: 401 })
  }
  return json({ ok: true }, { headers: { 'set-cookie': sessionCookie() } })
}

// Sign out.
export function DELETE() {
  return json({ ok: true }, { headers: { 'set-cookie': clearedCookie } })
}
