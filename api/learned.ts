import { json, withErrors } from './_lib/auth.js'
import { ensureSchema, sql } from './_lib/db.js'

// Public: the published "What I learned" posts, newest week first, with attachment details.
export const GET = withErrors(async () => {
  await ensureSchema()
  const posts = await sql`
    SELECT l.id, l.week_of::text AS week_of, l.title, l.body, l.tags,
           COALESCE((SELECT json_agg(json_build_object('id', f.id, 'name', f.name, 'type', f.type, 'size', f.size) ORDER BY f.id)
                 FROM learning_files f WHERE f.post_id = l.id), '[]'::json) AS files
      FROM learnings l
     WHERE l.published
     ORDER BY l.week_of DESC, l.id DESC
     LIMIT 100`
  return json({ posts }, { headers: { 'cache-control': 'public, s-maxage=60, stale-while-revalidate=300' } })
}, false)
