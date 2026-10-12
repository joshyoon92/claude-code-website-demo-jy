// Records one visit per page load. The admin page can set NO_TRACK in this
// browser so the owner's own visits aren't counted.
export const VISITOR_KEY = 'jy-visitor-id'
export const NO_TRACK_KEY = 'jy-no-track'

function storage(key: string, value?: string) {
  try {
    if (value !== undefined) localStorage.setItem(key, value)
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function trackVisit() {
  if (import.meta.env.DEV || storage(NO_TRACK_KEY) === '1') return

  const visitorId = storage(VISITOR_KEY) ?? storage(VISITOR_KEY, crypto.randomUUID()) ?? crypto.randomUUID()
  const body = JSON.stringify({
    visitorId,
    path: location.pathname + location.hash,
    referrer: document.referrer && new URL(document.referrer).host !== location.host ? document.referrer : '',
    language: navigator.language,
    screen: `${screen.width}x${screen.height}`,
  })

  if (!navigator.sendBeacon?.('/api/track', body)) {
    fetch('/api/track', { method: 'POST', body, keepalive: true }).catch(() => {})
  }
}
