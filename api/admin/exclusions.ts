import { isAuthed, json, withErrors } from '../_lib/auth.js'
import { ensureSchema, sql } from '../_lib/db.js'

// Manage the excluded list from the dashboard.
//   POST   { id }         exclude every visitor whose ID starts with id (the 8-character short ID works)
//   DELETE { visitorId }  release one visitor: their visits count again from now on
// Visits from a browser while it was excluded were never recorded, so a
// release brings back its earlier visits only.

const readBody = async (request: Request) => {
  try {
    return (await request.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

export const POST = withErrors(async (request: Request) => {
  if (!isAuthed(request)) return json({ error: 'Unauthorized' }, { status: 401 })
  const id = String((await readBody(request)).id ?? '').trim().toLowerCase()
  if (!/^[0-9a-f-]{8,64}$/.test(id)) return json({ error: 'Enter at least the first 8 characters of a visitor ID.' }, { status: 400 })

  await ensureSchema()
  const added = await sql`
    INSERT INTO excluded_visitors (visitor_id, source)
    SELECT DISTINCT visitor_id, 'manual' FROM visits WHERE visitor_id LIKE ${id + '%'}
    ON CONFLICT DO NOTHING
    RETURNING visitor_id`
  if (!added.length) {
    const [known] = await sql`SELECT 1 FROM excluded_visitors WHERE visitor_id LIKE ${id + '%'} LIMIT 1`
    return json(
      { error: known ? 'That visitor is already excluded.' : 'No visitor with that ID has been recorded.' },
      { status: known ? 409 : 404 },
    )
  }
  return json({ ok: true, added: added.length })
})

export const DELETE = withErrors(async (request: Request) => {
  if (!isAuthed(request)) return json({ error: 'Unauthorized' }, { status: 401 })
  const visitorId = String((await readBody(request)).visitorId ?? '').slice(0, 64)
  if (!visitorId) return json({ error: 'Missing visitorId' }, { status: 400 })
  // The browser using the dashboard is the admin by definition, and would be re-excluded on the next load.
  if (visitorId === request.headers.get('x-visitor-id')) {
    return json({ error: 'This is the browser you are using now, so it stays excluded.' }, { status: 409 })
  }

  await ensureSchema()
  const removed = await sql`DELETE FROM excluded_visitors WHERE visitor_id = ${visitorId} RETURNING visitor_id`
  return json({ ok: true, released: removed.length })
})
