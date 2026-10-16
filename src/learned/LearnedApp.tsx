import { motion, useScroll, useSpring } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import Cursor from '../components/Cursor'
import { LinkedInIcon, MailIcon, ResumeIcon } from '../components/icons'
import { EASE, Mark, Rail, Reveal } from '../components/ui'
import { contact } from '../data/career'
import { fmtSize, fmtWeek, isImage, paragraphs, type LearnedFile } from '../data/learned'

interface Post {
  id: number
  week_of: string
  title: string
  body: string
  tags: string[]
  files: LearnedFile[]
}

const fileUrl = (f: LearnedFile) => `/api/learned-file?id=${f.id}`

// The "What I learned" page: weekly notes written in the admin, newest first.
// Same header, type and footer as the portfolio; only published posts reach it.
export default function LearnedApp() {
  const [posts, setPosts] = useState<Post[]>()
  const [tag, setTag] = useState('All')

  useEffect(() => {
    fetch('/api/learned')
      .then((r) => (r.ok ? r.json() : { posts: [] }))
      .then((j) => setPosts(j.posts ?? []))
      .catch(() => setPosts([]))
  }, [])

  const tags = useMemo(() => ['All', ...new Set((posts ?? []).flatMap((p) => p.tags))], [posts])
  const shown = (posts ?? []).filter((p) => tag === 'All' || p.tags.includes(tag))

  return (
    <>
      <Header />
      <main>
        <section id="learned" className="section learned-page">
          <div className="section__head" data-ghost="Notes">
            <Rail label="What I learned · Weekly notes" />
            <Reveal>
              <h1 className="display">
                One thing
                <br />
                <Mark>every week.</Mark>
              </h1>
              <p className="section__lede">
                I came to software from architecture, so I learn in public. Each week I write down what I picked up
                while building: the bugs, the tools, the mental models.
              </p>
            </Reveal>
          </div>

          {tags.length > 2 && (
            <div className="software__filters" role="toolbar" aria-label="Filter by topic">
              {tags.map((t) => (
                <button key={t} className={`chip chip--dark${tag === t ? ' is-active' : ''}`} onClick={() => setTag(t)} aria-pressed={tag === t}>
                  <span className="chip__text">{t}</span>
                </button>
              ))}
            </div>
          )}

          {posts === undefined && <p className="learned-page__empty">Loading…</p>}
          {posts && !posts.length && (
            <div className="learned-page__empty">
              <Rail label="Coming soon" />
              <p>The first note is on its way. Check back next week.</p>
            </div>
          )}

          <ol className="learned__list">
            {shown.map((p, i) => (
              <Reveal key={p.id} delay={Math.min(i, 3) * 0.05} className="learned__item">
                <article id={`post-${p.id}`} className="learned__article">
                  <time className="learned__week rail" dateTime={p.week_of}>
                    Week of {fmtWeek(p.week_of)}
                  </time>
                  <div>
                    <h2>{p.title}</h2>
                    {paragraphs(p.body).map((para, j) => (
                      <p key={j}>{para}</p>
                    ))}
                    <Attachments files={p.files} />
                    {p.tags.length > 0 && (
                      <ul className="learned__tags">
                        {p.tags.map((t) => (
                          <li key={t}>
                            <button className="chip" onClick={() => setTag(t)}>{t}</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </article>
              </Reveal>
            ))}
          </ol>
        </section>
      </main>
      <Footer />
      <Cursor />
    </>
  )
}

function Attachments({ files }: { files: LearnedFile[] }) {
  if (!files.length) return null
  const images = files.filter(isImage)
  const others = files.filter((f) => !isImage(f))
  return (
    <div className="learned__files">
      {images.length > 0 && (
        <div className="learned__images">
          {images.map((f) => (
            <a key={f.id} href={fileUrl(f)} target="_blank" rel="noreferrer" data-cursor="View">
              <img src={fileUrl(f)} alt={f.name} loading="lazy" />
            </a>
          ))}
        </div>
      )}
      {others.map((f) => (
        <a key={f.id} className="learned__file" href={fileUrl(f)} download={f.name}>
          <span>{f.name}</span>
          <span className="rail">{fmtSize(f.size)} ↓</span>
        </a>
      ))}
    </div>
  )
}

// The portfolio's header: back to the sections on the left, wordmark, icon actions.
function Header() {
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 40 })
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`nav${scrolled ? ' is-scrolled' : ''}`}>
      <nav className="nav__links" aria-label="Sections">
        <a href="/#about">About</a>
        <a href="/#projects">Work</a>
        <a href="/learned" className="is-active" aria-current="page">
          Learned
          <motion.span className="nav__underline" layoutId="nav-underline" transition={{ duration: 0.35, ease: EASE }} />
        </a>
        <a href="/#path">Path</a>
      </nav>
      <a href="/" className="nav__logo" aria-label="Joshua Yoon, back to the portfolio">
        Joshua Yoon
      </a>
      <div className="nav__actions">
        <a className="nav__icon" href={contact.resume} download={contact.resumeFile} aria-label="Download résumé" title="Download résumé">
          <ResumeIcon />
        </a>
        <a className="nav__icon" href="/#contact" aria-label="Contact" title="Contact">
          <MailIcon />
        </a>
        <a className="nav__icon nav__icon--brand" href={contact.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn profile (opens in a new tab)" title="LinkedIn">
          <LinkedInIcon />
        </a>
      </div>
      <motion.span className="nav__progress" style={{ scaleX: progress }} aria-hidden="true" />
    </header>
  )
}

function Footer() {
  return (
    <footer className="footer band">
      <div className="footer__row">
        <p className="footer__blurb">Senior Software Engineer at JPMorgan Chase. Formerly an architect. Learning in public.</p>
        <nav className="footer__nav" aria-label="Footer">
          <a href="/">Portfolio</a>
          <a href="/#projects">Work</a>
          <a href="/#contact">Contact</a>
          <a href={contact.linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a>
        </nav>
      </div>
      <div className="footer__bottom">
        <p className="footer__legal">© {new Date().getFullYear()} {contact.name}. Anonymous, first-party analytics; no ads or third-party trackers.</p>
        <a href="#learned" className="footer__top">Back to top ↑</a>
      </div>
    </footer>
  )
}
