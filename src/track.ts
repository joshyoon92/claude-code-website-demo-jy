// Anonymous visit analytics for the admin dashboard (/admin).
//  - one "visit" per page load, tagged with ?ref= / utm_* if present
//  - "engage" updates: visible time on page, deepest scroll, sections viewed
//  - "event"s: outbound clicks (email, LinkedIn, résumé…), projects opened, photos viewed
// Browsers the admin dashboard is opened from are marked as the owner's and never tracked.
const VISITOR_KEY = 'jy-visitor-id'
const NO_TRACK_KEY = 'jy-no-track'
const ENDPOINT = '/api/track'

function storage(key: string, value?: string) {
  try {
    if (value !== undefined) localStorage.setItem(key, value)
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

// Stable random id for this browser, created on first use.
export function visitorId() {
  return storage(VISITOR_KEY) ?? storage(VISITOR_KEY, crypto.randomUUID()) ?? crypto.randomUUID()
}

// Called by the admin dashboard; the server also excludes this id.
export function markAsOwner() {
  storage(NO_TRACK_KEY, '1')
}

const enabled = () => !import.meta.env.DEV && storage(NO_TRACK_KEY) !== '1'

// One id per page load ties engagement and actions to the visit.
const visitKey = crypto.randomUUID()

function send(payload: Record<string, unknown>) {
  const body = JSON.stringify({ ...payload, visitorId: visitorId(), visitKey })
  if (!navigator.sendBeacon?.(ENDPOINT, body)) {
    fetch(ENDPOINT, { method: 'POST', body, keepalive: true }).catch(() => {})
  }
}

// Something the visitor did: opened a project, viewed a photo, clicked a link.
export function trackAction(type: 'click' | 'project' | 'photo', target: string, label?: string) {
  if (enabled()) send({ kind: 'event', type, target, label })
}

// Outbound links, classified so the dashboard can say "clicked LinkedIn".
function classify(a: HTMLAnchorElement): { target: string; label: string } | undefined {
  const href = a.getAttribute('href') ?? ''
  if (href.startsWith('mailto:')) return { target: 'email', label: href.slice(7) }
  if (href.startsWith('tel:')) return { target: 'phone', label: href.slice(4) }
  let url: URL
  try {
    url = new URL(href, location.href)
  } catch {
    return undefined
  }
  if (/\.pdf$/i.test(url.pathname) || /resume|cv/i.test(url.pathname)) {
    return { target: 'resume', label: decodeURIComponent(url.pathname.split('/').pop() ?? '') }
  }
  if (url.host === location.host) return undefined // in-page navigation is covered by sections
  const host = url.host.replace(/^www\./, '')
  if (host.endsWith('linkedin.com')) return { target: 'linkedin', label: host }
  if (host.endsWith('github.com')) return { target: 'github', label: url.pathname }
  return { target: 'link', label: host }
}

function watchClicks() {
  document.addEventListener(
    'click',
    (e) => {
      const a = (e.target as Element | null)?.closest?.('a[href]')
      const hit = a && classify(a as HTMLAnchorElement)
      if (hit) trackAction('click', hit.target, hit.label)
    },
    { capture: true },
  )
}

// Visible time, deepest scroll and sections seen. Reported shortly after each
// new section, every 15s while open, and when the page is hidden or closed;
// browsers don't always deliver that last report, so it can't be the only one.
function watchEngagement() {
  let visibleMs = 0
  let visibleSince = document.visibilityState === 'visible' ? performance.now() : 0
  let maxScroll = 0
  const sections = new Set<string>()
  let lastSent = ''

  const seconds = () => Math.round((visibleMs + (visibleSince ? performance.now() - visibleSince : 0)) / 1000)
  const measureScroll = () => {
    const doc = document.documentElement
    const pct = Math.round(((scrollY + innerHeight) / Math.max(1, doc.scrollHeight)) * 100)
    maxScroll = Math.max(maxScroll, Math.min(100, pct))
  }
  const flush = () => {
    const payload = { duration: seconds(), scroll: maxScroll, sections: [...sections] }
    const key = JSON.stringify(payload)
    if (key === lastSent || payload.duration === 0) return
    lastSent = key
    send({ kind: 'engage', ...payload })
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (visibleSince) visibleMs += performance.now() - visibleSince
      visibleSince = 0
      flush()
    } else {
      visibleSince = performance.now()
    }
  })
  addEventListener('pagehide', flush)
  addEventListener('scroll', measureScroll, { passive: true })
  setInterval(() => document.visibilityState === 'visible' && flush(), 15_000)
  measureScroll()
  let soon = 0
  const flushSoon = () => {
    clearTimeout(soon)
    soon = window.setTimeout(flush, 1000)
  }

  // A section counts as viewed once it fills half the screen (or is mostly
  // on screen, for short ones) for 1.5s.
  const timers = new Map<Element, number>()
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).id
        const inView = entry.intersectionRect.height >= innerHeight * 0.5 || entry.intersectionRatio >= 0.6
        if (inView && !timers.has(entry.target)) {
          timers.set(
            entry.target,
            window.setTimeout(() => {
              if (!sections.has(id)) flushSoon()
              sections.add(id)
            }, 1500),
          )
        } else if (!inView && timers.has(entry.target)) {
          clearTimeout(timers.get(entry.target))
          timers.delete(entry.target)
        }
      }
    },
    { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
  )
  // Sections are rendered by React after this runs; pick them up once they exist.
  requestAnimationFrame(() =>
    setTimeout(() => document.querySelectorAll('section[id]').forEach((s) => io.observe(s)), 500),
  )
}

export function trackVisit() {
  if (!enabled()) return

  const params = new URLSearchParams(location.search)
  send({
    kind: 'visit',
    path: location.pathname + location.hash,
    referrer: document.referrer && new URL(document.referrer).host !== location.host ? document.referrer : '',
    ref: params.get('ref') ?? '',
    utmSource: params.get('utm_source') ?? '',
    utmMedium: params.get('utm_medium') ?? '',
    utmCampaign: params.get('utm_campaign') ?? '',
    language: navigator.language,
  })
  watchClicks()
  watchEngagement()
}
