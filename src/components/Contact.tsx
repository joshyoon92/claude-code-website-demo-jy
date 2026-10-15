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
        {/* One contact strip (feature-row style): every way to reach me, once. */}
        <Reveal delay={0.1}>
          <ul className="contact__strip">
            <li>
              <div className="contact__cell">
                <PinIcon />
                <span>
                  <b>Based in</b>
                  {contact.location}
                </span>
              </div>
            </li>
            <li>
              <a className="contact__cell" href={`mailto:${contact.email}`}>
                <MailIcon />
                <span>
                  <b>Email</b>
                  {contact.email}
                </span>
              </a>
              <button className="contact__copy" onClick={copy}>
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
            </li>
            <li>
              <a className="contact__cell" href={contact.linkedin} target="_blank" rel="noreferrer">
                <LinkedInIcon />
                <span>
                  <b>LinkedIn</b>
                  /in/jtyoon92
                </span>
                <i aria-hidden="true">↗</i>
              </a>
            </li>
            <li>
              <a className="contact__cell" href={contact.resume} download={contact.resumeFile}>
                <ResumeIcon />
                <span>
                  <b>Résumé</b>
                  Download PDF
                </span>
                <i aria-hidden="true">↓</i>
              </a>
            </li>
          </ul>
        </Reveal>
      </section>

      {/* Slim footer: blurb, one row of links, legal line. */}
      <footer className="footer band">
        <div className="footer__row">
          <p className="footer__blurb">
            Senior Software Engineer at JPMorgan Chase. Formerly an architect. Built this site.
          </p>
          <nav className="footer__nav" aria-label="Footer">
            <a href="#about">About</a>
            <a href="#projects">Work</a>
            <a href="#path">Career path</a>
            <a href="#grand">369 West Grand</a>
            <a href="#diablos">Diablos Rojos</a>
            <a href="#shanghai">Shanghai</a>
            <a href="#architecture-index">All {projects.length} projects</a>
          </nav>
        </div>

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
