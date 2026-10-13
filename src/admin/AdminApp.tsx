import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { NO_TRACK_KEY } from '../track'
import DataGrid, { type Column } from './DataGrid'
import TrendChart from './TrendChart'
import { countryName, fmtAgo, fmtDateTime, fmtNum, place, referrerHost, toCsv } from './format'
import type { Count, Stats, Visit, Visitor } from './types'

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
  { key: 'first', label: 'First seen', value: (r) => r.first_seen, render: (r) => fmtDateTime(r.first_seen) },
  { key: 'last', label: 'Last seen', value: (r) => r.last_seen, render: (r) => <span title={fmtDateTime(r.last_seen)}>{fmtAgo(r.last_seen)}</span> },
  { key: 'source', label: 'Came from', value: (r) => referrerHost(r.first_referrer) },
  { key: 'browser', label: 'Browser', value: (r) => r.browser ?? '' },
  { key: 'os', label: 'OS', value: (r) => r.os ?? '' },
  { key: 'device', label: 'Device', value: (r) => r.device ?? '' },
]

const LOG_COLUMNS: Column<Visit>[] = [
  { key: 'time', label: 'Time', value: (r) => r.ts, render: (r) => fmtDateTime(r.ts) },
  { key: 'visitor', label: 'Visitor', value: (r) => r.visitor_id, render: (r) => <code title={r.visitor_id}>{shortId(r.visitor_id)}</code> },
  { key: 'location', label: 'Location', value: place },
  { key: 'page', label: 'Page', value: (r) => r.path ?? '' },
  { key: 'source', label: 'Referrer', value: (r) => referrerHost(r.referrer), render: (r) => (
    <span title={r.referrer ?? ''}>{referrerHost(r.referrer)}</span>
  ) },
  { key: 'browser', label: 'Browser', value: (r) => r.browser ?? '' },
  { key: 'os', label: 'OS', value: (r) => r.os ?? '' },
  { key: 'device', label: 'Device', value: (r) => r.device ?? '' },
  { key: 'screen', label: 'Screen', value: (r) => r.screen ?? '' },
  { key: 'lang', label: 'Language', value: (r) => r.language ?? '' },
]

function readNoTrack() {
  try {
    return localStorage.getItem(NO_TRACK_KEY) === '1'
  } catch {
    return false
  }
}

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
      const res = await fetch(`/api/admin/stats?range=${days}&tz=${encodeURIComponent(TZ)}`)
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
  const [noTrack, setNoTrack] = useState(readNoTrack)
  const s = stats.summary
  const b = stats.breakdowns

  const toggleNoTrack = () => {
    const next = !noTrack
    try {
      if (next) localStorage.setItem(NO_TRACK_KEY, '1')
      else localStorage.removeItem(NO_TRACK_KEY)
    } catch {
      // storage blocked: nothing to persist
    }
    setNoTrack(next)
  }

  const signOut = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' })
    location.reload()
  }

  const exportCsv = () =>
    tab === 'visitors'
      ? download('visitors.csv', toCsv(stats.visitors))
      : download('visit-log.csv', toCsv(stats.log))

  const rangeLabel = RANGES.find((r) => r.days === range)!.label.toLowerCase()

  return (
    <div className="admin">
      <header className="admin__head">
        <div>
          <p className="mono">Admin · Visitor audit</p>
          <h1>Who’s visiting</h1>
        </div>
        <div className="admin__actions">
          <label className="check" title="Sets a flag in this browser so your own visits to the portfolio aren’t recorded">
            <input type="checkbox" checked={noTrack} onChange={toggleNoTrack} />
            Don’t count my visits from this browser
          </label>
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
          accent
        />
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

      <section className="breakdowns">
        <Breakdown title="Countries" rows={b.country} format={countryName} />
        <Breakdown title="Referrers" rows={b.referrer} />
        <Breakdown title="Pages" rows={b.path} />
        <Breakdown title="Browsers" rows={b.browser} />
        <Breakdown title="Operating systems" rows={b.os} />
        <Breakdown title="Devices" rows={b.device} />
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
            ? `One row per browser seen in the ${rangeLabel === 'all time' ? 'whole history' : `last ${rangeLabel}`} (most recent 1,000).`
            : `Every page load in the ${rangeLabel === 'all time' ? 'whole history' : `last ${rangeLabel}`} (most recent 1,000).`}
        </p>
        {tab === 'visitors' ? (
          <DataGrid key="visitors" rows={stats.visitors} columns={VISITOR_COLUMNS} rowKey={(r) => r.visitor_id} initialSort={{ key: 'last', desc: true }} query={query} />
        ) : (
          <DataGrid key="log" rows={stats.log} columns={LOG_COLUMNS} rowKey={(r) => String(r.id)} initialSort={{ key: 'time', desc: true }} query={query} />
        )}
      </section>
    </div>
  )
}

function Tile({
  label,
  visits,
  visitors,
  prev,
  prevLabel,
  note,
  accent,
}: {
  label: string
  visits: number
  visitors: number
  prev?: number
  prevLabel?: string
  note?: string
  accent?: boolean
}) {
  const delta = prev === undefined ? undefined : visits - prev
  return (
    <div className={`tile${accent ? ' tile--accent' : ''}`}>
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

function Breakdown({ title, rows, format }: { title: string; rows: Count[]; format?: (s: string) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.visits))
  return (
    <div className="panel breakdown">
      <h3>{title}</h3>
      {rows.length ? (
        <ul>
          {rows.map((r) => (
            <li key={r.label} title={`${r.label}: ${r.visits} visits`}>
              <span className="breakdown__bar" style={{ width: `${(r.visits / max) * 100}%` }} />
              <span className="breakdown__label">{format ? format(r.label) : r.label}</span>
              <span className="breakdown__n">{fmtNum(r.visits)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="panel__sub">No data yet.</p>
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
