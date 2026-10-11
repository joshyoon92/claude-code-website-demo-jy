import { motion, useScroll, useSpring } from 'motion/react'
import { useEffect, useState } from 'react'

const LINKS = [
  { href: '#about', label: 'About me' },
  { href: '#projects', label: 'Projects' },
  { href: '#path', label: 'Career Path' },
]

export default function Nav({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 40 })
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform)

  return (
    <header className={`nav${scrolled ? ' is-scrolled' : ''}`}>
      <a href="#top" className="nav__logo" aria-label="Joshua Yoon, back to top">
        <span className="nav__mark">JY</span>
        <span className="nav__name">Joshua Yoon</span>
      </a>
      <nav className="nav__links" aria-label="Sections">
        {LINKS.map((l) => (
          <a key={l.href} href={l.href}>
            {l.label}
          </a>
        ))}
      </nav>
      <div className="nav__actions">
        <button className="nav__search" onClick={onOpenPalette} aria-label="Search projects and sections">
          <span className="nav__search-label">Jump to</span>
          <kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd>
          <span className="nav__search-icon" aria-hidden="true">
            ⌕
          </span>
        </button>
        <a href="#contact" className="btn btn--lime">
          Contact
        </a>
      </div>
      <motion.span className="nav__progress" style={{ scaleX: progress }} aria-hidden="true" />
    </header>
  )
}
