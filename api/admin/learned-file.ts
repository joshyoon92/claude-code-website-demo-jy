import { isAuthed, json, withErrors } from '../_lib/auth.js'
import { ensureSchema, sql } from '../_lib/db.js'
import { ALLOWED_TYPES, MAX_FILE_BYTES, MAX_FILES_PER_POST, serveFile } from '../_lib/learned.js'

// Attachments for "What I learned" posts.
//   GET    ?id=            the file, drafts included (for previews)
//   POST   { postId, name, type, data }   data is base64
//   DELETE { id }

const unauthorized = () => json({ error: 'Unauthorized' }, { status: 401 })

export const GET = withErrors(async (request: Request) => {
  if (!isAuthed(request)) return unauthorized()
  await ensureSchema()
  return serveFile(request, false)
})

export const POST = withErrors(async (request: Request) => {
  if (!isAuthed(request)) return unauthorized()
  let b: Record<string, unknown> = {}
  try {
    b = (await request.json()) as Record<string, unknown>
  } catch {
    // handled below
  }
  const postId = Number(b.postId)
  const name = String(b.name ?? '').trim().slice(0, 200)
  const type = String(b.type ?? '')
  const data = String(b.data ?? '')
  if (!Number.isInteger(postId) || !name || !data) return json({ error: 'Missing file details.' }, { status: 400 })
  if (!ALLOWED_TYPES.has(type)) return json({ error: `${name}: this file type isn’t supported (images, PDF, text or zip).` }, { status: 400 })
  const size = Math.floor((data.length * 3) / 4)
  if (size > MAX_FILE_BYTES) return json({ error: `${name} is over 3 MB.` }, { status: 413 })

  await ensureSchema()
  const [count] = await sql`SELECT count(*)::int AS n FROM learning_files WHERE post_id = ${postId}`
  if (count.n >= MAX_FILES_PER_POST) return json({ error: `A post can have up to ${MAX_FILES_PER_POST} attachments.` }, { status: 409 })
  const [row] = await sql`
    INSERT INTO learning_files (post_id, name, type, size, data)
    SELECT id, ${name}, ${type}, ${size}, ${data} FROM learnings WHERE id = ${postId}
    RETURNING id`
  if (!row) return json({ error: 'Post not found' }, { status: 404 })
  return json({ ok: true, id: row.id })
})

export const DELETE = withErrors(async (request: Request) => {
  if (!isAuthed(request)) return unauthorized()
  const id = Number(((await request.json().catch(() => ({}))) as Record<string, unknown>).id)
  if (!Number.isInteger(id)) return json({ error: 'Missing id' }, { status: 400 })
  await ensureSchema()
  await sql`DELETE FROM learning_files WHERE id = ${id}`
  return json({ ok: true })
})
