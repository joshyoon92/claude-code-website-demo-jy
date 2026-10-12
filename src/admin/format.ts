const regionNames = new Intl.DisplayNames(undefined, { type: 'region' })

export function countryName(code: string | null) {
  if (!code || code === '(unknown)') return code ?? ''
  try {
    return regionNames.of(code) ?? code
  } catch {
    return code
  }
}

export function place(r: { city: string | null; region: string | null; country: string | null }) {
  return [r.city, r.region, countryName(r.country)].filter(Boolean).join(', ') || '—'
}

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
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n')
}
