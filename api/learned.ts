import { json, withErrors } from './_lib/auth.js'
import { ensureSchema, sql } from './_lib/db.js'

// Public: the published "What I learned" posts, newest week first, with attachments and reaction counts
// (`mine` is the calling browser's own reaction, from ?v=<visitor id>).
export const GET = withErrors(async (request: Request) => {
  await ensureSchema()
  const visitor = (new URL(request.url).searchParams.get('v') ?? '').slice(0, 64)
  const posts = await sql`
    SELECT l.id, l.week_of::text AS week_of, l.title, l.body, l.tags,
           COALESCE((SELECT json_agg(json_build_object('id', f.id, 'name', f.name, 'type', f.type, 'size', f.size) ORDER BY f.id)
                 FROM learning_files f WHERE f.post_id = l.id), '[]'::json) AS files,
           COALESCE((SELECT json_object_agg(emoji, n) FROM (
             SELECT emoji, count(*)::int AS n FROM learning_reactions WHERE post_id = l.id GROUP BY emoji) r), '{}'::json) AS reactions,
           (SELECT emoji FROM learning_reactions WHERE post_id = l.id AND visitor_id = ${visitor}) AS mine
      FROM learnings l
     WHERE l.published
     ORDER BY l.week_of DESC, l.id DESC
     LIMIT 100`
  return json({ posts })
}, false)
