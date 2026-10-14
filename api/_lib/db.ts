import { neon } from '@neondatabase/serverless'

// Vercel's Neon integration injects DATABASE_URL, but a custom prefix chosen
// when connecting the store renames it (e.g. STORAGE_DATABASE_URL), and older
// Vercel Postgres stores used POSTGRES_URL. Prefer the exact names, then any
// pooled postgres:// connection string.
function findUrl() {
  const env = process.env
  if (env.DATABASE_URL) return env.DATABASE_URL
  if (env.POSTGRES_URL) return env.POSTGRES_URL
  const candidates = Object.entries(env).filter(
    ([key, value]) => /^postgres(ql)?:\/\//.test(value ?? '') && !/UNPOOLED|NON_POOLING/.test(key),
  )
  const byName = (suffix: string) => candidates.find(([key]) => key.endsWith(suffix))?.[1]
  return byName('DATABASE_URL') ?? byName('POSTGRES_URL') ?? candidates[0]?.[1]
}

// Checked in ensureSchema() rather than at import, so a missing variable is
// reported as a readable error instead of crashing the function.
const url = findUrl()

export const sql = neon(url ?? 'postgresql://unset@localhost/unset')

// Create the table on first use so there is no separate migration step.
let ready: Promise<unknown> | undefined
export function ensureSchema() {
  if (!url) {
    // Names only, never values, so the error can't leak a secret.
    const related = Object.keys(process.env).filter((k) => /DATABASE|POSTGRES|PG|NEON|STORAGE/.test(k))
    return Promise.reject(
      new Error(
        'No database connection string found in this deployment. Connect the Neon database to this Vercel project ' +
          '(Storage tab, with Production checked), then redeploy. ' +
          `Related variables present: ${related.length ? related.join(', ') : 'none'}.`,
      ),
    )
  }
  ready ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS visits (
        id          bigserial PRIMARY KEY,
        ts          timestamptz NOT NULL DEFAULT now(),
        visitor_id  text NOT NULL,
        ip_hash     text,
        path        text,
        referrer    text,
        country     text,
        region      text,
        city        text,
        browser     text,
        os          text,
        device      text,
        language    text,
        screen      text,
        user_agent  text
      )`
    await sql`CREATE INDEX IF NOT EXISTS visits_ts_idx ON visits (ts)`
    await sql`CREATE INDEX IF NOT EXISTS visits_visitor_idx ON visits (visitor_id)`
  })().catch((err) => {
    ready = undefined
    throw err
  })
  return ready
}
