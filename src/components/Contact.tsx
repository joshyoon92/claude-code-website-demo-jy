import { useState } from 'react'
import { contact } from '../data/career'
import { projects } from '../data/projects'
import { ArrowUpIcon, LinkedInIcon, MailIcon, PinIcon, ResumeIcon } from './icons'
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
      <section id="contact" className="section contact paper band">
        <Reveal>
          <Rail index={4} label="Contact" />
          <h2 className="contact__title">Get in touch.</h2>
          <p className="section__lede">
            For engineering roles, collaborations, or questions about moving from architecture into software.
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
          <a className="btn btn--ghost btn--lg" href={contact.resume} download={contact.resumeFile}>
            Download résumé ↓
          </a>
        </Reveal>
      </section>

      {/* Editorial footer: an icon strip, compact links, the name set edge to
          edge, and a slim legal line. */}
      <footer className="footer band">
        <ul className="footer__strip">
          <li>
            <PinIcon />
            <span>
              <b>Based in</b>
              {contact.location}
            </span>
          </li>
          <li>
            <a href={`mailto:${contact.email}`}>
              <MailIcon />
              <span>
                <b>Email</b>
                {contact.email}
              </span>
            </a>
          </li>
          <li>
            <a href={contact.linkedin} target="_blank" rel="noreferrer">
              <LinkedInIcon />
              <span>
                <b>LinkedIn</b>
                /in/jtyoon92
              </span>
            </a>
          </li>
          <li>
            <a href={contact.resume} download={contact.resumeFile}>
              <ResumeIcon />
              <span>
                <b>Résumé</b>
                Download PDF
              </span>
            </a>
          </li>
        </ul>

        <div className="footer__cols">
          <p className="footer__blurb">
            Senior Software Engineer at JPMorgan Chase.
            <br />
            Formerly an architect. Built this site.
          </p>
          <nav className="footer__col" aria-label="Site">
            <span className="rail">Site</span>
            <a href="#about">About</a>
            <a href="#projects">Work</a>
            <a href="#path">Career path</a>
            <a href="#contact">Contact</a>
          </nav>
          <nav className="footer__col" aria-label="Architecture">
            <span className="rail">Architecture</span>
            <a href="#grand">369 West Grand</a>
            <a href="#diablos">Diablos Rojos</a>
            <a href="#shanghai">Shanghai Financial Center</a>
            <a href="#architecture-index">All {projects.length} projects</a>
          </nav>
        </div>

        <p className="footer__word" aria-hidden="true">
          Joshua Yoon
        </p>

        <div className="footer__bottom">
          <p className="footer__legal">
            © {new Date().getFullYear()} {contact.name}. Diablos images: Atelier FGP. Shanghai photography: Qingyan
            Zhu. Anonymous, first-party analytics (a random ID stored in your browser); no ads or third-party trackers.
          </p>
          <a href="#top" className="footer__top">
            Back to top <ArrowUpIcon />
          </a>
        </div>
      </footer>
    </>
  )
}
