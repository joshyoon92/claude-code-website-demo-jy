import { useMemo, useState, type ReactNode } from 'react'

export type Column<T> = {
  key: string
  label: string
  value: (row: T) => string | number // used for sorting, search and CSV
  render?: (row: T) => ReactNode
  numeric?: boolean
}

const PAGE = 50

// Sortable, searchable, paginated table. `rowKey` must be stable.
export default function DataGrid<T>({
  rows,
  columns,
  rowKey,
  initialSort,
  query,
  onRowClick,
}: {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  initialSort: { key: string; desc: boolean }
  query: string
  onRowClick?: (row: T) => void
}) {
  const [sort, setSort] = useState(initialSort)
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const hits = q
      ? rows.filter((r) => columns.some((c) => String(c.value(r)).toLowerCase().includes(q)))
      : rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col) return hits
    return [...hits].sort((a, b) => {
      const va = col.value(a)
      const vb = col.value(b)
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
      return sort.desc ? -cmp : cmp
    })
  }, [rows, columns, sort, query])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const current = Math.min(page, pages - 1)
  const visible = filtered.slice(current * PAGE, (current + 1) * PAGE)

  const toggle = (key: string) => {
    setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: true }))
    setPage(0)
  }

  return (
    <>
      <div className="grid__scroll">
        <table className="grid">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={c.numeric ? 'is-num' : undefined}
                  aria-sort={sort.key === c.key ? (sort.desc ? 'descending' : 'ascending') : 'none'}
                >
                  <button type="button" onClick={() => toggle(c.key)}>
                    {c.label}
                    <span className="grid__arrow">{sort.key === c.key ? (sort.desc ? '↓' : '↑') : ''}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={rowKey(r)}
                className={onRowClick ? 'is-clickable' : undefined}
                onClick={onRowClick && (() => onRowClick(r))}
              >
                {columns.map((c) => (
                  <td key={c.key} className={c.numeric ? 'is-num' : undefined}>
                    {c.render ? c.render(r) : c.value(r)}
                  </td>
                ))}
              </tr>
            ))}
            {!visible.length && (
              <tr>
                <td colSpan={columns.length} className="grid__empty">
                  {rows.length ? 'No rows match your search.' : 'No visits recorded in this range yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="grid__foot">
        <span>
          {filtered.length.toLocaleString()} row{filtered.length === 1 ? '' : 's'}
        </span>
        {pages > 1 && (
          <span className="grid__pager">
            <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)}>
              ← Prev
            </button>
            <span>
              {current + 1} / {pages}
            </span>
            <button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
              Next →
            </button>
          </span>
        )}
      </div>
    </>
  )
}
