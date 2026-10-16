import { json } from './auth.js'
import { sql } from './db.js'

// What can be attached to a post. Images show inline; the rest download.
// SVG and HTML are left out on purpose: served from this origin they could run script.
export const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/zip',
])
export const MAX_FILE_BYTES = 3 * 1024 * 1024 // base64 in a JSON body must stay under Vercel's 4.5 MB limit
export const MAX_FILES_PER_POST = 6

// Sends one attachment. The public route passes publicOnly so drafts stay private.
export async function serveFile(request: Request, publicOnly: boolean) {
  const id = Number(new URL(request.url).searchParams.get('id'))
  if (!Number.isInteger(id)) return json({ error: 'Missing id' }, { status: 400 })
  const [file] = await sql`
    SELECT f.name, f.type, f.data FROM learning_files f
      JOIN learnings l ON l.id = f.post_id
     WHERE f.id = ${id} AND (${!publicOnly} OR l.published)`
  if (!file) return json({ error: 'Not found' }, { status: 404 })
  const inline = String(file.type).startsWith('image/')
  const name = String(file.name).replace(/[^\w.\- ]+/g, '_')
  return new Response(Buffer.from(String(file.data), 'base64') as unknown as BodyInit, {
    headers: {
      'content-type': String(file.type),
      'content-disposition': `${inline ? 'inline' : 'attachment'}; filename="${name}"`,
      'x-content-type-options': 'nosniff',
      'cache-control': publicOnly ? 'public, max-age=300' : 'private, no-store',
    },
  })
}
