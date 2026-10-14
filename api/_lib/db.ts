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
    // Added after launch: campaign tags, finer location, and engagement that
    // the page reports back while it's open (keyed by a per-page-load visit_key).
    await sql`
      ALTER TABLE visits
        ADD COLUMN IF NOT EXISTS visit_key    text,
        ADD COLUMN IF NOT EXISTS ref          text,
        ADD COLUMN IF NOT EXISTS utm_source   text,
        ADD COLUMN IF NOT EXISTS utm_medium   text,
        ADD COLUMN IF NOT EXISTS utm_campaign text,
        ADD COLUMN IF NOT EXISTS postal_code  text,
        ADD COLUMN IF NOT EXISTS timezone     text,
        ADD COLUMN IF NOT EXISTS duration_s   integer,
        ADD COLUMN IF NOT EXISTS max_scroll   integer,
        ADD COLUMN IF NOT EXISTS sections     text[]`
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS visits_key_idx ON visits (visit_key)`
    // Actions within a visit: link clicks, projects opened, photos viewed.
    await sql`
      CREATE TABLE IF NOT EXISTS events (
        id          bigserial PRIMARY KEY,
        ts          timestamptz NOT NULL DEFAULT now(),
        visit_key   text NOT NULL,
        visitor_id  text NOT NULL,
        type        text NOT NULL,
        target      text,
        label       text
      )`
    await sql`CREATE INDEX IF NOT EXISTS events_visit_idx ON events (visit_key)`
    await sql`CREATE INDEX IF NOT EXISTS events_visitor_idx ON events (visitor_id, ts)`
    // Browsers the admin has opened the dashboard from. Their visits are
    // never recorded again, and the stats read through counted_visits so
    // anything recorded before the exclusion is hidden too.
    await sql`
      CREATE TABLE IF NOT EXISTS excluded_visitors (
        visitor_id  text PRIMARY KEY,
        added       timestamptz NOT NULL DEFAULT now()
      )`
    await sql`
      CREATE OR REPLACE VIEW counted_visits AS
        SELECT * FROM visits v
         WHERE NOT EXISTS (SELECT 1 FROM excluded_visitors e WHERE e.visitor_id = v.visitor_id)`
    await sql`
      CREATE OR REPLACE VIEW counted_events AS
        SELECT * FROM events ev
         WHERE NOT EXISTS (SELECT 1 FROM excluded_visitors e WHERE e.visitor_id = ev.visitor_id)`
  })().catch((err) => {
    ready = undefined
    throw err
  })
  return ready
}
