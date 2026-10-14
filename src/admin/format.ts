const regionNames = new Intl.DisplayNames(undefined, { type: 'region' })

export function countryName(code: string | null) {
  if (!code || code === '(unknown)') return code ?? ''
  try {
    return regionNames.of(code) ?? code
  } catch {
    return code
  }
}

export function place(r: { city: string | null; region: string | null; postal_code?: string | null; country: string | null }) {
  const region = [r.region, r.postal_code].filter(Boolean).join(' ')
  return [r.city, region, countryName(r.country)].filter(Boolean).join(', ') || '—'
}

// Seconds → "45s", "3m 05s", "1h 02m".
export function fmtDuration(s: number | null | undefined) {
  if (!s) return '—'
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`
  return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`
}

// Section ids on the portfolio page → readable names.
const SECTION_NAMES: Record<string, string> = {
  top: 'Intro',
  about: 'About',
  projects: 'Software work',
  architecture: 'Architecture intro',
  diablos: 'Diablos Rojos',
  shanghai: 'Shanghai Financial Center',
  grand: '369 West Grand',
  'architecture-index': 'Project index',
  path: 'Career path',
  contact: 'Contact',
}
export const sectionName = (id: string) => SECTION_NAMES[id] ?? id

// Click targets recorded by the tracker → readable names.
const ACTION_NAMES: Record<string, string> = {
  email: 'Email',
  linkedin: 'LinkedIn',
  resume: 'Résumé',
  phone: 'Phone',
  github: 'GitHub',
  link: 'Other link',
}
export const actionName = (target: string) => ACTION_NAMES[target] ?? target

// The clicks that mean someone wants to get in touch.
export const CONTACT_ACTIONS = new Set(['email', 'linkedin', 'resume', 'phone'])

export function referrerHost(ref: string | null) {
  if (!ref) return '(direct)'
  try {
    return new URL(ref).host.replace(/^www\./, '')
  } catch {
    return ref
  }
}

export const fmtNum = new Intl.NumberFormat().format

export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function fmtAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// Bucket keys are local calendar dates (YYYY-MM-DD) — parse without a UTC shift.
export function bucketDate(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function bucketLabel(key: string, unit: 'day' | 'week' | 'month', long = false) {
  const d = bucketDate(key)
  if (unit === 'month') return d.toLocaleDateString(undefined, { month: long ? 'long' : 'short', year: 'numeric' })
  const s = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(long && { year: 'numeric' }) })
  return unit === 'week' && long ? `Week of ${s}` : s
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0])
  const cell = (v: unknown) => {
    const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n')
}
