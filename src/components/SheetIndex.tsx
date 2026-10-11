import { useEffect, useMemo, useRef, useState } from 'react'
import { featured, projects, type Project } from '../data/projects'
import Lightbox from './Lightbox'
import { Rail, Reveal } from './ui'

const FIRMS = ['All', ...Array.from(new Set(projects.map((p) => p.firm)))]
const featuredCover = new Map(featured.map((f) => [f.sheet, f.images[0].src]))

// Lead with a photo when there is one, otherwise the first drawing.
function previewFor(p: Project): string | undefined {
  return featuredCover.get(p.sheet) ?? (p.media.find((m) => m.kind === 'photo') ?? p.media[0])?.src
}

// `request` lets the command palette open a row from outside; the nonce
// makes repeat requests for the same project fire again.
export default function SheetIndex({ request }: { request?: { sheet: string; nonce: number } }) {
  const [firm, setFirm] = useState('All')
  const [open, setOpen] = useState<string | null>(null)
  const [hovered, setHovered] = useState<Project | null>(null)
  const [viewer, setViewer] = useState<{ project: Project; index: number } | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!request) return
    setFirm('All')
    setOpen(request.sheet)
    requestAnimationFrame(() =>
      document.getElementById(`row-${request.sheet}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    )
  }, [request])

  const rows = useMemo(
    () => (firm === 'All' ? projects : projects.filter((p) => p.firm === firm)),
    [firm],
  )

  const onMove = (e: React.PointerEvent) => {
    if (!previewRef.current) return
    previewRef.current.style.transform = `translate(${e.clientX + 24}px, ${e.clientY - 80}px)`
  }

  return (
    <section id="architecture-index" className="section index paper">
      <div className="section__head">
        <Rail label="Architecture · All projects" />
        <Reveal>
          <h2 className="display">Eleven projects, four practices.</h2>
          <p className="section__lede">
            Filter by practice, open a row for scope and role, then step through the photographs and
            construction drawings.
          </p>
        </Reveal>
      </div>

      <div className="index__filters" role="toolbar" aria-label="Filter by practice">
        {FIRMS.map((f) => (
          <button
            key={f}
            className={`chip${firm === f ? ' is-active' : ''}`}
            onClick={() => setFirm(f)}
            aria-pressed={firm === f}
          >
            {f}
            <span className="chip__count">
              {f === 'All' ? projects.length : projects.filter((p) => p.firm === f).length}
            </span>
          </button>
        ))}
      </div>

      <div className="index__table" onPointerMove={onMove} onPointerLeave={() => setHovered(null)}>
        <div className="index__row index__row--head" aria-hidden="true">
          <span>Sheet</span>
          <span>Project</span>
          <span className="hide-sm">Location</span>
          <span className="hide-md">Practice</span>
          <span>Status</span>
        </div>
        {rows.map((p) => {
          const isOpen = open === p.sheet
          return (
            <div
              key={p.sheet}
              id={`row-${p.sheet}`}
              className={`index__item${isOpen ? ' is-open' : ''}`}
              onPointerEnter={() => setHovered(p)}
            >
              <button
                className="index__row"
                onClick={() => setOpen(isOpen ? null : p.sheet)}
                aria-expanded={isOpen}
              >
                <span className="index__sheet">{p.sheet}</span>
                <span className="index__name">{p.name}</span>
                <span className="hide-sm">{p.location}</span>
                <span className="hide-md">{p.firm}</span>
                <span className={`status status--${p.status.replace(/\s/g, '-').toLowerCase()}`}>
                  {p.status}
                </span>
              </button>
              <div className="index__detail">
                <div className="index__detail-inner">
                  <dl>
                    <div>
                      <dt>Program</dt>
                      <dd>{p.program}</dd>
                    </div>
                    <div>
                      <dt>Role</dt>
                      <dd>{p.role}</dd>
                    </div>
                    {p.year && (
                      <div>
                        <dt>Year</dt>
                        <dd>{p.year}</dd>
                      </div>
                    )}
                  </dl>
                  <p>{p.summary}</p>
                  {p.media.length > 0 && (
                    <div className="filmstrip" aria-label={`${p.name} images`}>
                      {p.media.map((m, i) => (
                        <button
                          key={m.src}
                          className={`filmstrip__item filmstrip__item--${m.kind}`}
                          onClick={() => setViewer({ project: p, index: i })}
                          tabIndex={isOpen ? 0 : -1}
                        >
                          <img src={m.src} alt="" loading="lazy" />
                          <span>{m.caption}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div ref={previewRef} className={`index__preview${hovered && open !== hovered.sheet && !viewer ? ' is-visible' : ''}`} aria-hidden="true">
        {hovered && (
          <>
            {previewFor(hovered) ? (
              <img src={previewFor(hovered)} alt="" />
            ) : (
              <div className="index__preview-plan">
                <span>{hovered.sheet}</span>
              </div>
            )}
            <div className="index__preview-caption">
              <strong>{hovered.name}</strong>
              <span>{hovered.program}</span>
              {hovered.media.length > 0 && (
                <span>
                  {hovered.media.filter((m) => m.kind === 'photo').length} photos ·{' '}
                  {hovered.media.filter((m) => m.kind === 'drawing').length} drawings
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {viewer && (
        <Lightbox
          items={viewer.project.media}
          index={viewer.index}
          title={viewer.project.name}
          onClose={() => setViewer(null)}
          onIndex={(index) => setViewer((v) => v && { ...v, index })}
        />
      )}
    </section>
  )
}
