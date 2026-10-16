import { motion, useScroll, useSpring } from 'motion/react'
import { useEffect, useState } from 'react'
import { contact } from '../data/career'
import { LinkedInIcon, MailIcon, ResumeIcon, SearchIcon } from './icons'

// Each link owns the sections it leads to, so "Work" stays lit through
// the software work, the featured buildings and the index.
const LINKS = [
  { href: '#about', label: 'About', sections: ['about'] },
  {
    href: '#projects',
    label: 'Work',
    sections: ['projects', 'architecture', 'diablos', 'shanghai', 'grand', 'architecture-index'],
  },
  { href: '/learned', label: 'Learned', sections: [] as string[] },
  { href: '#path', label: 'Path', sections: ['path'] },
]

// The section crossing the middle of the screen.
function useCurrentSection() {
  const [current, setCurrent] = useState<string | null>(null)
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setCurrent(e.target.id)
      },
      { rootMargin: '-45% 0px -55% 0px' },
    )
    // Sections mount with the app; observe them once they exist.
    const id = requestAnimationFrame(() => document.querySelectorAll('main section[id]').forEach((s) => io.observe(s)))
    return () => {
      cancelAnimationFrame(id)
      io.disconnect()
    }
  }, [])
  return current
}

// Editorial header, after the reference layouts: section links on the left,
// the name as a wordmark in the middle, small icon actions on the right.
export default function Nav({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 40 })
  const [scrolled, setScrolled] = useState(false)
  const current = useCurrentSection()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`nav${scrolled ? ' is-scrolled' : ''}`}>
      <nav className="nav__links" aria-label="Sections">
        {LINKS.map((l) => {
          const active = current !== null && l.sections.includes(current)
          return (
            <a key={l.href} href={l.href} className={active ? 'is-active' : undefined} aria-current={active ? 'true' : undefined}>
              {l.label}
              {active && (
                <motion.span
                  className="nav__underline"
                  layoutId="nav-underline"
                  transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.35 }}
                />
              )}
            </a>
          )
        })}
      </nav>

      <a href="#top" className="nav__logo" aria-label="Joshua Yoon, back to top">
        Joshua Yoon
      </a>

      <div className="nav__actions">
        <button type="button" className="nav__icon" onClick={onOpenPalette} aria-label="Search (Ctrl K)" title="Search · Ctrl K">
          <SearchIcon />
        </button>
        <a className="nav__icon" href={contact.resume} download={contact.resumeFile} aria-label="Download résumé" title="Download résumé">
          <ResumeIcon />
        </a>
        <a className="nav__icon" href="#contact" aria-label="Contact" title="Contact">
          <MailIcon />
        </a>
        <a
          className="nav__icon nav__icon--brand"
          href={contact.linkedin}
          target="_blank"
          rel="noreferrer"
          aria-label="LinkedIn profile (opens in a new tab)"
          title="LinkedIn"
        >
          <LinkedInIcon />
        </a>
      </div>
      <motion.span className="nav__progress" style={{ scaleX: progress }} aria-hidden="true" />
    </header>
  )
}
