import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { software } from '../data/career'
import { projects } from '../data/projects'
import { EASE } from './ui'

interface Item {
  id: string
  label: string
  hint: string
  group: 'Sections' | 'Software' | 'Architecture'
  run: () => void
}

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

// ⌘K / Ctrl+K palette (from the motion kit's demo-command-palette-dive):
// type to filter, arrows to move, Enter to dive into the result.
export default function CommandPalette({
  open,
  onClose,
  onOpenProject,
}: {
  open: boolean
  onClose: () => void
  onOpenProject: (sheet: string) => void
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const items = useMemo<Item[]>(
    () => [
      { id: 'top', label: 'Home', hint: 'Top', group: 'Sections', run: () => scrollTo('top') },
      { id: 'about', label: 'About me', hint: '01', group: 'Sections', run: () => scrollTo('about') },
      { id: 'projects', label: 'Projects · Software engineering', hint: '02', group: 'Sections', run: () => scrollTo('projects') },
      { id: 'architecture', label: 'Projects · Architecture archive', hint: '02', group: 'Sections', run: () => scrollTo('architecture') },
      { id: 'path', label: 'Career Path', hint: '03', group: 'Sections', run: () => scrollTo('path') },
      { id: 'contact', label: 'Contact', hint: '04', group: 'Sections', run: () => scrollTo('contact') },
      ...software.map<Item>((s) => ({
        id: `sw-${s.id}`,
        label: s.title,
        hint: `${s.org} · ${s.stack.slice(0, 3).join(', ')}`,
        group: 'Software',
        run: () => scrollTo('projects'),
      })),
      { id: 'diablos', label: 'Diablos Rojos Stadium', hint: 'Featured · Mexico City', group: 'Architecture', run: () => scrollTo('diablos') },
      { id: 'shanghai', label: 'Shanghai Financial Center', hint: 'Featured · Shanghai', group: 'Architecture', run: () => scrollTo('shanghai') },
      ...projects
        .filter((p) => p.folder !== 'diablos' && p.folder !== 'shanghai')
        .map<Item>((p) => ({
          id: p.sheet,
          label: p.name,
          hint: `${p.firm} · ${p.location}`,
          group: 'Architecture',
          run: () => onOpenProject(p.sheet),
        })),
    ],
    [onOpenProject],
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? items.filter((i) => `${i.label} ${i.hint}`.toLowerCase().includes(q)) : items
  }, [items, query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => setActive(0), [query])

  const choose = (item: Item | undefined) => {
    if (!item) return
    onClose()
    item.run()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(results.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(results[active])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="palette"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className="palette__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Jump to"
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: EASE }}
            onKeyDown={onKeyDown}
          >
            <div className="palette__search">
              <span aria-hidden="true">⌕</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects, firms, sections…"
                aria-label="Search"
                aria-controls="palette-results"
                aria-activedescendant={results[active] ? `palette-${results[active].id}` : undefined}
              />
              <kbd>Esc</kbd>
            </div>
            <ul id="palette-results" className="palette__results" role="listbox">
              {results.length === 0 && <li className="palette__empty">No matches for “{query}”.</li>}
              {results.map((item, i) => (
                <li
                  key={item.id}
                  id={`palette-${item.id}`}
                  role="option"
                  aria-selected={i === active}
                  className={i === active ? 'is-active' : undefined}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(item)}
                >
                  {(i === 0 || results[i - 1].group !== item.group) && (
                    <span className="palette__group">{item.group}</span>
                  )}
                  <span className="palette__row">
                    <span className="palette__label">{item.label}</span>
                    <span className="palette__hint">{item.hint}</span>
                    <span className="palette__enter" aria-hidden="true">
                      ↵
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
