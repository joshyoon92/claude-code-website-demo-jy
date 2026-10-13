import { neon } from '@neondatabase/serverless'

// Vercel's Neon integration injects DATABASE_URL (older Vercel Postgres
// stores used POSTGRES_URL).
// Checked in ensureSchema() rather than at import, so a missing variable is
// reported as a readable error instead of crashing the function.
const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL

export const sql = neon(url ?? 'postgresql://unset@localhost/unset')

// Create the table on first use so there is no separate migration step.
let ready: Promise<unknown> | undefined
export function ensureSchema() {
  if (!url) {
    return Promise.reject(
      new Error('DATABASE_URL is not set. Connect the Neon database to this Vercel project, then redeploy.'),
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
