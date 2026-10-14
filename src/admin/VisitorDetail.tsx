import { useEffect } from 'react'
import {
  CONTACT_ACTIONS,
  actionName,
  fmtDateTime,
  fmtDuration,
  fmtNum,
  place,
  referrerHost,
  sectionName,
} from './format'
import type { Visit, VisitEvent, Visitor } from './types'

// Contact clicks (email, LinkedIn, résumé…) are the strongest interest signal,
// so they get the lime chip; other clicks stay neutral.
export function ActionChips({ clicks }: { clicks: string[] | null }) {
  if (!clicks?.length) return <span className="muted">—</span>
  return (
    <span className="chips">
      {clicks.map((c) => (
        <span key={c} className={`chip${CONTACT_ACTIONS.has(c) ? ' chip--hot' : ''}`}>
          {actionName(c)}
        </span>
      ))}
    </span>
  )
}

function describe(e: VisitEvent) {
  if (e.type === 'click') return `Clicked ${actionName(e.target ?? '')}${e.label ? ` · ${e.label}` : ''}`
  if (e.type === 'project') return `Opened project · ${e.label ?? e.target}`
  return `Viewed photo · ${e.target}${e.label ? ` — ${e.label}` : ''}`
}

// Seconds after the visit started, e.g. "+1m 20s".
function offset(start: string, at: string) {
  const s = Math.max(0, Math.round((new Date(at).getTime() - new Date(start).getTime()) / 1000))
  return `+${fmtDuration(s) === '—' ? '0s' : fmtDuration(s)}`
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

// Everything one visitor did, newest visit first.
export default function VisitorDetail({
  visitor: v,
  visits,
  onClose,
}: {
  visitor: Visitor
  visits: Visit[]
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-label={`Visitor ${v.visitor_id.slice(0, 8)}`}>
      <button className="drawer__scrim" aria-label="Close" onClick={onClose} />
      <aside className="drawer__panel">
        <header className="drawer__head">
          <div>
            <p className="mono">Visitor</p>
            <h2>
              <code>{v.visitor_id.slice(0, 8)}</code>
              {v.ref && <span className="tag tag--ref">{v.ref}</span>}
            </h2>
            <p className="panel__sub">{place(v)}</p>
          </div>
          <button className="btn" onClick={onClose}>Close</button>
        </header>

        <dl className="drawer__facts">
          <Fact label="Visits">{fmtNum(v.visits)}</Fact>
          <Fact label="Time on site">{fmtDuration(v.total_time)}</Fact>
          <Fact label="Deepest scroll">{v.max_scroll ? `${v.max_scroll}%` : '—'}</Fact>
          <Fact label="Actions">{fmtNum(v.actions)}</Fact>
          <Fact label="First seen">{fmtDateTime(v.first_seen)}</Fact>
          <Fact label="Last seen">{fmtDateTime(v.last_seen)}</Fact>
          <Fact label="Came from">{referrerHost(v.first_referrer)}</Fact>
          <Fact label="Landed on">{v.landing ?? '—'}</Fact>
          <Fact label="Time zone">{v.timezone ?? '—'}</Fact>
          <Fact label="Language">{v.language ?? '—'}</Fact>
          <Fact label="Device">{[v.device, v.os, v.browser].filter(Boolean).join(' · ') || '—'}</Fact>
          <Fact label="Networks">{fmtNum(v.networks)}</Fact>
        </dl>

        <div className="drawer__block">
          <p className="mono">Clicked</p>
          <ActionChips clicks={v.clicks} />
        </div>
        <div className="drawer__block">
          <p className="mono">Sections viewed</p>
          {v.sections?.length ? (
            <span className="chips">
              {v.sections.map((s) => (
                <span key={s} className="chip">{sectionName(s)}</span>
              ))}
            </span>
          ) : (
            <span className="muted">—</span>
          )}
        </div>

        <p className="mono drawer__label">Visits</p>
        <ol className="timeline">
          {visits.map((visit) => (
            <li key={visit.id}>
              <div className="timeline__head">
                <b>{fmtDateTime(visit.ts)}</b>
                <span>
                  {fmtDuration(visit.duration_s)} · {visit.max_scroll ? `${visit.max_scroll}% scrolled` : 'no scroll data'}
                </span>
              </div>
              <p className="timeline__meta">
                Landed on {visit.path ?? '/'} from {referrerHost(visit.referrer)}
                {visit.ref && <> · ref <span className="tag tag--ref">{visit.ref}</span></>}
              </p>
              {visit.sections?.length ? (
                <p className="timeline__meta">Viewed: {visit.sections.map(sectionName).join(', ')}</p>
              ) : null}
              {visit.events?.length ? (
                <ul className="timeline__events">
                  {visit.events.map((e, i) => (
                    <li key={i} className={e.type === 'click' && CONTACT_ACTIONS.has(e.target ?? '') ? 'is-hot' : undefined}>
                      <span className="timeline__at">{offset(visit.ts, e.ts)}</span>
                      {describe(e)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="timeline__meta muted">No actions</p>
              )}
            </li>
          ))}
        </ol>
        {visits.length < v.visits && (
          <p className="panel__sub">
            Showing {visits.length} of {v.visits} visits: older ones fall outside the visit log’s most recent 1,000.
          </p>
        )}
      </aside>
    </div>
  )
}
