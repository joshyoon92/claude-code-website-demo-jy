import { isAuthed, json, withErrors } from '../_lib/auth.js'
import { ensureSchema, sql } from '../_lib/db.js'

// Manage "What I learned" posts from the dashboard.
//   GET                                       every post, drafts included
//   POST   { weekOf, title, body, tags, published }
//   PUT    { id, ...same fields, linkedinPosted? }   linkedinPosted: true stamps now, false clears
//   DELETE { id }

const readBody = async (request: Request) => {
  try {
    return (await request.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

function parse(b: Record<string, unknown>) {
  const title = String(b.title ?? '').trim().slice(0, 200)
  const body = String(b.body ?? '').trim().slice(0, 20000)
  const weekOf = String(b.weekOf ?? '')
  const tags = (Array.isArray(b.tags) ? b.tags : [])
    .map((t) => String(t).trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 8)
  if (!title || !body) return { error: 'A title and some text are required.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekOf)) return { error: 'Pick the week this was learned.' }
  return { title, body, weekOf, tags, published: b.published === true }
}

const unauthorized = () => json({ error: 'Unauthorized' }, { status: 401 })

export const GET = withErrors(async (request: Request) => {
  if (!isAuthed(request)) return unauthorized()
  await ensureSchema()
  const posts = await sql`
    SELECT l.id, l.week_of::text AS week_of, l.title, l.body, l.tags, l.published, l.linkedin_posted, l.updated,
           COALESCE((SELECT json_agg(json_build_object('id', f.id, 'name', f.name, 'type', f.type, 'size', f.size) ORDER BY f.id)
                 FROM learning_files f WHERE f.post_id = l.id), '[]'::json) AS files
      FROM learnings l ORDER BY l.week_of DESC, l.id DESC`
  return json({ posts })
})

export const POST = withErrors(async (request: Request) => {
  if (!isAuthed(request)) return unauthorized()
  const p = parse(await readBody(request))
  if ('error' in p) return json({ error: p.error }, { status: 400 })
  await ensureSchema()
  const [row] = await sql`
    INSERT INTO learnings (week_of, title, body, tags, published)
    VALUES (${p.weekOf}, ${p.title}, ${p.body}, ${p.tags}, ${p.published})
    RETURNING id`
  return json({ ok: true, id: row.id })
})

export const PUT = withErrors(async (request: Request) => {
  if (!isAuthed(request)) return unauthorized()
  const b = await readBody(request)
  const id = Number(b.id)
  if (!Number.isInteger(id)) return json({ error: 'Missing id' }, { status: 400 })
  const p = parse(b)
  if ('error' in p) return json({ error: p.error }, { status: 400 })
  await ensureSchema()
  const posted = typeof b.linkedinPosted === 'boolean' ? b.linkedinPosted : null
  const updated = await sql`
    UPDATE learnings
       SET week_of = ${p.weekOf}, title = ${p.title}, body = ${p.body}, tags = ${p.tags},
           published = ${p.published}, updated = now(),
           linkedin_posted = CASE WHEN ${posted}::boolean IS NULL THEN linkedin_posted
                                  WHEN ${posted}::boolean THEN now() ELSE NULL END
     WHERE id = ${id} RETURNING id`
  if (!updated.length) return json({ error: 'Post not found' }, { status: 404 })
  return json({ ok: true })
})

export const DELETE = withErrors(async (request: Request) => {
  if (!isAuthed(request)) return unauthorized()
  const id = Number((await readBody(request)).id)
  if (!Number.isInteger(id)) return json({ error: 'Missing id' }, { status: 400 })
  await ensureSchema()
  await sql`DELETE FROM learnings WHERE id = ${id}`
  return json({ ok: true })
})
