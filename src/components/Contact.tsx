import { useState } from 'react'
import { contact } from '../data/career'
import { Rail, Reveal } from './ui'

export default function Contact() {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard
      ?.writeText(contact.email)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      })
      .catch(() => {})
  }

  return (
    <>
      <section id="contact" className="section contact">
        <Reveal>
          <Rail index={4} label="Contact" />
          <h2 className="contact__title">
            Let’s build
            <br />
            the next one.
          </h2>
          <p className="section__lede">
            Get in touch about engineering, collaborations, or moving from architecture into software.
          </p>
        </Reveal>
        <Reveal delay={0.1} className="contact__actions">
          <a className="btn btn--lime btn--lg" href={`mailto:${contact.email}`}>
            {contact.email}
          </a>
          <button className="btn btn--ghost btn--lg" onClick={copy}>
            {copied ? 'Copied ✓' : 'Copy email'}
          </button>
          <a className="btn btn--ghost btn--lg" href={contact.linkedin} target="_blank" rel="noreferrer">
            LinkedIn ↗
          </a>
        </Reveal>
      </section>

      <footer className="footer">
        <div className="footer__brand">
          <span className="nav__mark">JY</span>
          <p>Joshua Yoon · Senior Software Engineer, formerly an architect. {contact.location}.</p>
        </div>
        <nav className="footer__col" aria-label="Site">
          <span className="rail">Site</span>
          <a href="#about">About me</a>
          <a href="#projects">Projects</a>
          <a href="#path">Career Path</a>
        </nav>
        <nav className="footer__col" aria-label="Architecture">
          <span className="rail">Architecture</span>
          <a href="#diablos">Diablos Rojos</a>
          <a href="#shanghai">Shanghai Financial Center</a>
          <a href="#architecture-index">All 11 projects</a>
        </nav>
        <div className="footer__col">
          <span className="rail">Elsewhere</span>
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
          <a href={contact.linkedin} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
        </div>
        <p className="footer__legal">
          © {new Date().getFullYear()} {contact.name}. Diablos images: Atelier FGP. Shanghai photography:
          Qingyan Zhu.
        </p>
      </footer>
    </>
  )
}
