import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { PROJECTS, highlight, type CodeCard, type GalleryCard, type PhotoCard, type VideoCard } from '../data/banner'
import AutoVideo from './AutoVideo'
import { EASE } from './ui'

const SPRING = { type: 'spring', bounce: 0.15, visualDuration: 0.45 } as const

// The 360px crop shows at once; the full-size original replaces it when it
// has loaded. `layout` animates the frame from the crop's shape to the photo's.
function Photo({ card, onClose }: { card: PhotoCard; onClose: () => void }) {
  const [src, setSrc] = useState(card.src)
  useEffect(() => {
    let live = true
    card
      .loadFull()
      .then((url) => {
        const img = new Image()
        img.onload = () => live && setSrc(url)
        img.src = url
      })
      .catch(() => {}) // keep the crop
    return () => {
      live = false
    }
  }, [card])
  return (
    // Clicking the photo again closes it, like the Close button.
    <motion.div
      layout
      className="gdetail__media gdetail__media--closes"
      transition={{ duration: 0.45, ease: EASE }}
      onClick={onClose}
      title="Click to close"
    >
      <img src={src} alt={`${PROJECTS[card.project].name}: ${card.title}`} />
    </motion.div>
  )
}

// The clip plays as soon as it opens; clicking it closes it, like a photo.
function Video({ card, onClose }: { card: VideoCard; onClose: () => void }) {
  return (
    <div className="gdetail__media gdetail__media--video gdetail__media--closes" title="Click to close">
      <AutoVideo src={card.video} poster={card.poster} label={`${PROJECTS[card.project].name}: ${card.title}`} onClick={onClose} />
      <span className="ai-badge">AI-generated</span>
    </div>
  )
}

function Code({ card, onClose }: { card: CodeCard; onClose: () => void }) {
  return (
    <div className="gdetail__media gdetail__media--code gdetail__media--closes" onClick={onClose} title="Click to close">
      <div className="gdetail__codebar">
        <i />
        <i />
        <i />
        <span>{card.file}</span>
      </div>
      <pre>
        {card.code.map((line, n) => (
          <code key={n}>
            <span className="gdetail__ln">{n + 1}</span>
            {highlight(line, card.lang).map((t, j) => (
              <span key={j} className={`tok tok--${t.kind}`}>
                {t.text}
              </span>
            ))}
          </code>
        ))}
      </pre>
    </div>
  )
}

// One card shown large, with a short description: the gallery's "open" state.
export default function BannerDetail({
  card,
  onClose,
  onOpenProject,
}: {
  card: GalleryCard
  onClose: () => void
  onOpenProject: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const project = PROJECTS[card.project]
  const isCode = card.kind === 'code'

  // Focus Close on open; give focus back to where it was on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus({ preventScroll: true })
    return () => previous?.focus?.({ preventScroll: true })
  }, [])

  return (
    <motion.div
      className="gdetail"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
      onPointerDown={(e) => e.stopPropagation()} // not the start of a gallery drag
    >
      <motion.figure
        className="gdetail__figure"
        role="dialog"
        aria-modal="true"
        aria-label={isCode ? card.file : `${project.name}: ${card.title}`}
        initial={{ opacity: 0, scale: 0.9, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={SPRING}
        onClick={(e) => e.stopPropagation()}
      >
        {card.kind === 'code' ? (
          <Code card={card} onClose={onClose} />
        ) : card.kind === 'video' ? (
          <Video card={card} onClose={onClose} />
        ) : (
          <Photo key={card.id} card={card} onClose={onClose} />
        )}
        <motion.figcaption layout="position" className="gdetail__bar" transition={{ duration: 0.45, ease: EASE }}>
          <span className="gdetail__title">{isCode ? card.file : card.title}</span>
          <button ref={closeRef} type="button" className="gdetail__close" onClick={onClose}>
            Close
          </button>
        </motion.figcaption>
        <motion.p layout="position" className="gdetail__desc" transition={{ duration: 0.45, ease: EASE }}>
          {isCode ? (
            <>
              <span className="gdetail__tag is-code">Engineer</span> {card.bridge} From the same discipline that built{' '}
              {project.name}.{' '}
            </>
          ) : (
            <>
              <span className="gdetail__tag">Architect</span> <b>{project.name}</b> · {project.place} · {project.year}.{' '}
              {card.kind === 'video'
                ? 'An AI-generated flythrough, made from the project renderings and photos.'
                : project.blurb}{' '}
            </>
          )}
          <button type="button" className="gallery__open" onClick={onOpenProject}>
            {isCode ? 'See software work →' : 'View project →'}
          </button>
        </motion.p>
      </motion.figure>
    </motion.div>
  )
}
