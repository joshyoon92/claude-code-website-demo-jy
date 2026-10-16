import { json, withErrors } from './_lib/auth.js'
import { ensureSchema, sql } from './_lib/db.js'

// Public: react to a published post. One emoji per browser per post; `emoji: null` takes it back.
const EMOJI = new Set(['👍', '❤️', '💡', '🔥', '👏'])

export const POST = withErrors(async (request: Request) => {
  let b: Record<string, unknown> = {}
  try {
    b = (await request.json()) as Record<string, unknown>
  } catch {
    // handled below
  }
  const postId = Number(b.postId)
  const visitor = String(b.visitorId ?? '').slice(0, 64)
  const emoji = b.emoji === null ? null : String(b.emoji ?? '')
  if (!Number.isInteger(postId) || !visitor || (emoji !== null && !EMOJI.has(emoji))) {
    return json({ error: 'Bad request' }, { status: 400 })
  }

  await ensureSchema()
  if (emoji === null) {
    await sql`DELETE FROM learning_reactions WHERE post_id = ${postId} AND visitor_id = ${visitor}`
  } else {
    await sql`
      INSERT INTO learning_reactions (post_id, visitor_id, emoji)
      SELECT id, ${visitor}, ${emoji} FROM learnings WHERE id = ${postId} AND published
      ON CONFLICT (post_id, visitor_id) DO UPDATE SET emoji = EXCLUDED.emoji, ts = now()`
  }
  return json({ ok: true })
}, false)
