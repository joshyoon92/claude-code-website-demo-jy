import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { markAsOwner, visitorId } from '../track'
import DataGrid, { type Column } from './DataGrid'
import TrendChart from './TrendChart'
import VisitorDetail, { ActionChips } from './VisitorDetail'
import {
  actionName,
  countryName,
  fmtAgo,
  fmtDateTime,
  fmtDuration,
  fmtNum,
  place,
  referrerHost,
  sectionName,
  toCsv,
} from './format'
import type { Count, Excluded, Stats, Visit, Visitor } from './types'

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone
const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '1 year' },
  { days: 0, label: 'All time' },
]
const UNITS = [
  { unit: 'day', label: 'Daily', span: 'last 90 days' },
  { unit: 'week', label: 'Weekly', span: 'last 26 weeks' },
  { unit: 'month', label: 'Monthly', span: 'last 24 months' },
] as const

const shortId = (id: string) => id.slice(0, 8)

const VISITOR_COLUMNS: Column<Visitor>[] = [
  { key: 'visitor', label: 'Visitor', value: (r) => r.visitor_id, render: (r) => <code title={r.visitor_id}>{shortId(r.visitor_id)}</code> },
  { key: 'location', label: 'Location', value: place },
  { key: 'visits', label: 'Visits', value: (r) => r.visits, numeric: true, render: (r) => (
    <>
      {fmtNum(r.visits)}
      {r.visits > 1 && <span className="tag">returning</span>}
    </>
  ) },
  { key: 'time', label: 'Time on site', value: (r) => r.total_time, numeric: true, render: (r) => fmtDuration(r.total_time) },
  { key: 'sections', label: 'Sections', value: (r) => r.sections?.length ?? 0, numeric: true, render: (r) => (
    <span title={r.sections?.map(sectionName).join(', ')}>{r.sections?.length ?? 0}</span>
  ) },
  { key: 'clicked', label: 'Clicked', value: (r) => (r.clicks ?? []).map(actionName).join(' '), render: (r) => <ActionChips clicks={r.clicks} /> },
  { key: 'actions', label: 'Actions', value: (r) => r.actions, numeric: true },
  { key: 'ref', label: 'Ref tag', value: (r) => r.ref ?? '', render: (r) => (r.ref ? <span className="tag tag--ref">{r.ref}</span> : <span className="muted">—</span>) },
  { key: 'source', label: 'Came from', value: (r) => referrerHost(r.first_referrer) },
  { key: 'first', label: 'First seen', value: (r) => r.first_seen, render: (r) => fmtDateTime(r.first_seen) },
  { key: 'last', label: 'Last seen', value: (r) => r.last_seen, render: (r) => <span title={fmtDateTime(r.last_seen)}>{fmtAgo(r.last_seen)}</span> },
  { key: 'landing', label: 'Landed on', value: (r) => r.landing ?? '' },
  { key: 'lang', label: 'Language', value: (r) => r.language ?? '' },
  { key: 'browser', label: 'Browser', value: (r) => r.browser ?? '' },
  { key: 'os', label: 'OS', value: (r) => r.os ?? '' },
  { key: 'device', label: 'Device', value: (r) => r.device ?? '' },
]

const visitClicks = (r: Visit) => [...new Set((r.events ?? []).filter((e) => e.type === 'click').map((e) => e.target ?? ''))]

const LOG_COLUMNS: Column<Visit>[] = [
  { key: 'time', label: 'Time', value: (r) => r.ts, render: (r) => fmtDateTime(r.ts) },
  { key: 'visitor', label: 'Visitor', value: (r) => r.visitor_id, render: (r) => <code title={r.visitor_id}>{shortId(r.visitor_id)}</code> },
  { key: 'location', label: 'Location', value: place },
  { key: 'duration', label: 'Time on page', value: (r) => r.duration_s ?? 0, numeric: true, render: (r) => fmtDuration(r.duration_s) },
  { key: 'scroll', label: 'Scrolled', value: (r) => r.max_scroll ?? 0, numeric: true, render: (r) => (r.max_scroll ? `${r.max_scroll}%` : '—') },
  { key: 'sections', label: 'Sections', value: (r) => r.sections?.length ?? 0, numeric: true, render: (r) => (
    <span title={r.sections?.map(sectionName).join(', ')}>{r.sections?.length ?? 0}</span>
  ) },
  { key: 'clicked', label: 'Clicked', value: (r) => visitClicks(r).map(actionName).join(' '), render: (r) => <ActionChips clicks={visitClicks(r)} /> },
  { key: 'actions', label: 'Actions', value: (r) => r.events?.length ?? 0, numeric: true },
  { key: 'page', label: 'Landed on', value: (r) => r.path ?? '' },
  { key: 'ref', label: 'Ref tag', value: (r) => r.ref ?? '', render: (r) => (r.ref ? <span className="tag tag--ref">{r.ref}</span> : <span className="muted">—</span>) },
  { key: 'source', label: 'Referrer', value: (r) => referrerHost(r.referrer), render: (r) => (
    <span title={r.referrer ?? ''}>{referrerHost(r.referrer)}</span>
  ) },
  { key: 'lang', label: 'Language', value: (r) => r.language ?? '' },
  { key: 'browser', label: 'Browser', value: (r) => r.browser ?? '' },
  { key: 'os', label: 'OS', value: (r) => r.os ?? '' },
  { key: 'device', label: 'Device', value: (r) => r.device ?? '' },
]

function download(name: string, text: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }))
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function AdminApp() {
  const [state, setState] = useState<'loading' | 'login' | 'ready' | 'error'>('loading')
  const [stats, setStats] = useState<Stats>()
  const [error, setError] = useState('')
  const [range, setRange] = useState(30)

  const load = useCallback(async (days: number) => {
    try {
      // Sending this browser's visitor id lets the server exclude it from the counts.
      const res = await fetch(`/api/admin/stats?range=${days}&tz=${encodeURIComponent(TZ)}`, {
        headers: { 'x-visitor-id': visitorId() },
      })
      if (res.status === 401) return setState('login')
      if (!res.ok) {
        const text = await res.text()
        let message = text
        try {
          message = JSON.parse(text).error ?? text
        } catch {
          // not JSON (e.g. a platform error page): show it as-is
        }
        throw new Error(`${res.status}: ${message}`)
      }
      // Signed in, so this is the owner's browser: stop tracking it locally too.
      markAsOwner()
      setStats(await res.json())
      setState('ready')
    } catch (err) {
      setError(String(err))
      setState('error')
    }
  }, [])

  useEffect(() => {
    load(range)
  }, [load, range])

  if (state === 'loading' && !stats) return <div className="admin-center mono">Loading…</div>
  if (state === 'login') return <Login onDone={() => load(range)} />
  if (state === 'error' && !stats)
    return (
      <div className="admin-center">
        <p className="mono">Couldn’t load stats</p>
        <pre className="admin-error">{error}</pre>
        <button className="btn" onClick={() => load(range)}>Retry</button>
      </div>
    )

  return <Dashboard stats={stats!} range={range} setRange={setRange} reload={() => load(range)} />
}

function Login({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    }).catch(() => undefined)
    setBusy(false)
    if (res?.ok) onDone()
    else setError(res?.status === 401 ? 'Wrong password.' : 'Login failed — is ADMIN_PASSWORD set?')
  }

  return (
    <div className="admin-center">
      <form className="login" onSubmit={submit}>
        <p className="mono">Admin · Visitor audit</p>
        <h1>Sign in</h1>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="login__error">{error}</p>}
        <button className="btn btn--primary" disabled={busy || !password}>
          {busy ? 'Checking…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

function Dashboard({
  stats,
  range,
  setRange,
  reload,
}: {
  stats: Stats
  range: number
  setRange: (d: number) => void
  reload: () => void
}) {
  const [unit, setUnit] = useState<(typeof UNITS)[number]['unit']>('day')
  const [tab, setTab] = useState<'visitors' | 'log'>('visitors')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Visitor>()
  const s = stats.summary
  const b = stats.breakdowns

  const signOut = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' })
    location.reload()
  }

  const exportCsv = () =>
    tab === 'visitors'
      ? download('visitors.csv', toCsv(stats.visitors))
      : download('visit-log.csv', toCsv(stats.log))

  const openVisitor = (id: string) => setSelected(stats.visitors.find((v) => v.visitor_id === id))
  const rangeLabel = RANGES.find((r) => r.days === range)!.label.toLowerCase()
  const inRange = rangeLabel === 'all time' ? 'whole history' : `last ${rangeLabel}`

  return (
    <div className="admin">
      <header className="admin__head">
        <div>
          <p className="mono">Admin · Visitor audit</p>
          <h1>Who’s visiting</h1>
        </div>
        <div className="admin__actions">
          <span className="check" title="Every browser you open this dashboard in is excluded, including its earlier visits">
            Your own visits are excluded automatically
          </span>
          <button className="btn" onClick={reload}>Refresh</button>
          <button className="btn" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <section className="tiles">
        <Tile label="This week" visits={s.week_visits} visitors={s.week_visitors} prev={s.prev_week_visits} prevLabel="last week" />
        <Tile label="This month" visits={s.month_visits} visitors={s.month_visitors} prev={s.prev_month_visits} prevLabel="last month" />
        <Tile
          label="All time"
          visits={s.all_visits}
          visitors={s.all_visitors}
          note={s.first_visit ? `since ${new Date(s.first_visit).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : 'no visits yet'}
        />
        <div className="tile tile--accent">
          <p className="mono">Engagement · this month</p>
          <p className="tile__value">{fmtDuration(s.month_avg_time)}</p>
          <p className="tile__unit">average time on site</p>
          <p className="tile__sub">
            <b>{fmtNum(s.month_contact_clicks)}</b> contact click{s.month_contact_clicks === 1 ? '' : 's'}
            <span className="muted"> (email, LinkedIn, résumé)</span>
          </p>
          <p className="tile__note">
            {fmtNum(s.month_actions)} actions · {s.month_avg_scroll ? `${s.month_avg_scroll}% average scroll` : 'no scroll data yet'}
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <div>
            <h2>Visits over time</h2>
            <p className="panel__sub">{UNITS.find((u) => u.unit === unit)!.span} · weeks start Monday · {stats.tz}</p>
          </div>
          <Segmented options={UNITS.map((u) => ({ value: u.unit, label: u.label }))} value={unit} onChange={setUnit} />
        </div>
        <TrendChart data={stats.series[unit]} unit={unit} />
      </section>

      <div className="toolbar">
        <span className="mono">Breakdown &amp; visitors for</span>
        <Segmented options={RANGES.map((r) => ({ value: r.days, label: r.label }))} value={range} onChange={setRange} />
      </div>

      <h2 className="group-title">Interest</h2>
      <section className="breakdowns">
        <Breakdown title="Clicked" unit="clicks" rows={b.actions} format={actionName} empty="No link clicks yet." />
        <Breakdown title="Sections viewed" unit="visits" rows={b.sections} format={sectionName} />
        <Breakdown title="Projects opened" unit="opens" rows={b.projects} empty="No projects opened yet." />
        <Breakdown title="Photos viewed, by project" unit="photos" rows={b.photos} empty="No photos viewed yet." />
      </section>

      <h2 className="group-title">Audience</h2>
      <section className="breakdowns">
        <Breakdown title="Ref tags" unit="visits" rows={b.ref} empty="No tagged links used yet. Share links like ?ref=acme to label visits." />
        <Breakdown title="Referrers" unit="visits" rows={b.referrer} />
        <Breakdown title="Countries" unit="visits" rows={b.country} format={countryName} />
        <Breakdown title="Landing pages" unit="visits" rows={b.path} />
        <Breakdown title="Languages" unit="visits" rows={b.language} />
        <Breakdown title="Browsers" unit="visits" rows={b.browser} />
        <Breakdown title="Operating systems" unit="visits" rows={b.os} />
        <Breakdown title="Devices" unit="visits" rows={b.device} />
      </section>

      <section className="panel">
        <div className="panel__head">
          <Segmented
            options={[
              { value: 'visitors', label: `Visitors (${fmtNum(stats.visitors.length)})` },
              { value: 'log', label: `Visit log (${fmtNum(stats.log.length)})` },
            ]}
            value={tab}
            onChange={setTab}
          />
          <div className="admin__actions">
            <input className="search" type="search" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <button className="btn" onClick={exportCsv}>Export CSV</button>
          </div>
        </div>
        <p className="panel__sub">
          {tab === 'visitors'
            ? `One row per browser seen in the ${inRange} (most recent 1,000). Click a row for everything that visitor did.`
            : `Every page load in the ${inRange} (most recent 1,000). Click a row to open that visitor.`}
        </p>
        {tab === 'visitors' ? (
          <DataGrid
            key="visitors"
            rows={stats.visitors}
            columns={VISITOR_COLUMNS}
            rowKey={(r) => r.visitor_id}
            initialSort={{ key: 'last', desc: true }}
            query={query}
            onRowClick={(r) => setSelected(r)}
          />
        ) : (
          <DataGrid
            key="log"
            rows={stats.log}
            columns={LOG_COLUMNS}
            rowKey={(r) => String(r.id)}
            initialSort={{ key: 'time', desc: true }}
            query={query}
            onRowClick={(r) => openVisitor(r.visitor_id)}
          />
        )}
      </section>

      <ExcludedPanel rows={stats.excluded} reload={reload} />

      {selected && (
        <VisitorDetail
          visitor={selected}
          visits={stats.log.filter((v) => v.visitor_id === selected.visitor_id)}
          onClose={() => setSelected(undefined)}
        />
      )}
    </div>
  )
}

// Browsers hidden from every count. Release one that isn't you and its visits
// count again; add one by the short ID shown in the visitor table.
function ExcludedPanel({ rows, reload }: { rows: Excluded[]; reload: () => void }) {
  const [id, setId] = useState('')
  const [busy, setBusy] = useState<string>()
  const [message, setMessage] = useState('')
  const self = visitorId()

  const call = async (method: 'POST' | 'DELETE', body: object, key: string) => {
    setBusy(key)
    setMessage('')
    const res = await fetch('/api/admin/exclusions', {
      method,
      headers: { 'content-type': 'application/json', 'x-visitor-id': self },
      body: JSON.stringify(body),
    }).catch(() => undefined)
    setBusy(undefined)
    if (!res?.ok) {
      const error = await res?.json().then((j) => j.error).catch(() => undefined)
      setMessage(error ?? 'That didn’t work. Try again.')
      return false
    }
    reload()
    return true
  }

  const exclude = async (e: FormEvent) => {
    e.preventDefault()
    if (await call('POST', { id }, 'add')) {
      setMessage(`Excluded ${id.trim().slice(0, 8)}.`)
      setId('')
    }
  }
  const release = async (r: Excluded) => {
    if (await call('DELETE', { visitorId: r.visitor_id }, r.visitor_id)) setMessage(`Released ${shortId(r.visitor_id)}.`)
  }

  const how = (r: Excluded) =>
    r.visitor_id === self ? 'This browser' : r.source === 'admin' ? 'Opened the dashboard' : r.source === 'manual' ? 'Added by ID' : 'Earlier exclusion'

  return (
    <section className="panel excluded">
      <div className="panel__head">
        <div>
          <h2>Excluded visitors ({fmtNum(rows.length)})</h2>
          <p className="panel__sub">
            Hidden from every number on this page, and their new visits aren’t recorded. Release any that aren’t
            you: their earlier visits count again. Visits made while excluded were never saved.
          </p>
        </div>
        <form className="admin__actions" onSubmit={exclude}>
          <input
            className="search"
            placeholder="Visitor ID, e.g. b89d494e"
            aria-label="Visitor ID to exclude"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
          <button className="btn" disabled={!id.trim() || busy === 'add'}>
            {busy === 'add' ? 'Excluding…' : 'Exclude'}
          </button>
        </form>
      </div>
      {message && (
        <p className="excluded__message" role="status">
          {message}
        </p>
      )}
      {rows.length ? (
        <div className="excluded__scroll">
          <table className="excluded__table">
            <thead>
              <tr>
                <th>Visitor</th>
                <th>How</th>
                <th>Location</th>
                <th>Device</th>
                <th className="num">Visits</th>
                <th>Last seen</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.visitor_id}>
                  <td>
                    <code title={r.visitor_id}>{shortId(r.visitor_id)}</code>
                  </td>
                  <td>{how(r)}</td>
                  <td>{place(r)}</td>
                  <td>{[r.device, r.browser, r.os].filter(Boolean).join(' · ') || <span className="muted">—</span>}</td>
                  <td className="num">{fmtNum(r.visits)}</td>
                  <td>{r.last_seen ? <span title={fmtDateTime(r.last_seen)}>{fmtAgo(r.last_seen)}</span> : <span className="muted">never</span>}</td>
                  <td className="num">
                    {r.visitor_id === self ? (
                      <span className="tag">you</span>
                    ) : (
                      <button className="btn" disabled={busy === r.visitor_id} onClick={() => release(r)}>
                        {busy === r.visitor_id ? 'Releasing…' : 'Release'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="panel__sub">Nobody is excluded.</p>
      )}
    </section>
  )
}

function Tile({
  label,
  visits,
  visitors,
  prev,
  prevLabel,
  note,
}: {
  label: string
  visits: number
  visitors: number
  prev?: number
  prevLabel?: string
  note?: string
}) {
  const delta = prev === undefined ? undefined : visits - prev
  return (
    <div className="tile">
      <p className="mono">{label}</p>
      <p className="tile__value">{fmtNum(visits)}</p>
      <p className="tile__unit">visits</p>
      <p className="tile__sub">
        <b>{fmtNum(visitors)}</b> unique visitor{visitors === 1 ? '' : 's'}
      </p>
      <p className="tile__note">
        {delta !== undefined
          ? `${delta > 0 ? '▲' : delta < 0 ? '▼' : '='} ${fmtNum(Math.abs(delta))} vs all of ${prevLabel} (${fmtNum(prev!)})`
          : note}
      </p>
    </div>
  )
}

function Breakdown({
  title,
  unit,
  rows,
  format,
  empty = 'No data yet.',
}: {
  title: string
  unit: string
  rows: Count[]
  format?: (s: string) => string
  empty?: string
}) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div className="panel breakdown">
      <h3>{title}</h3>
      {rows.length ? (
        <ul>
          {rows.map((r) => (
            <li key={r.label} title={`${r.label}: ${r.count} ${unit}`}>
              <span className="breakdown__bar" style={{ width: `${(r.count / max) * 100}%` }} />
              <span className="breakdown__label">{format ? format(r.label) : r.label}</span>
              <span className="breakdown__n">{fmtNum(r.count)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="panel__sub">{empty}</p>
      )}
    </div>
  )
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          className={o.value === value ? 'is-on' : undefined}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
