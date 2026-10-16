import { withErrors } from './_lib/auth.js'
import { ensureSchema } from './_lib/db.js'
import { serveFile } from './_lib/learned.js'

// Public: an attachment of a published post.
export const GET = withErrors(async (request: Request) => {
  await ensureSchema()
  return serveFile(request, true)
}, false)
