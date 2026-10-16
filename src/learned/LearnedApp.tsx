import { LayoutGroup, motion, useScroll, useSpring } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import portrait from '../assets/portrait.jpg'
import Cursor from '../components/Cursor'
import { LinkedInIcon, MailIcon, ResumeIcon } from '../components/icons'
import { EASE, Mark, Rail, Reveal } from '../components/ui'
import { contact } from '../data/career'
import { visitorId } from '../track'
import { fmtSize, fmtWeek, isImage, paragraphs, type LearnedFile } from '../data/learned'

interface Post {
  id: number
  week_of: string
  title: string
  body: string
  tags: string[]
  files: LearnedFile[]
  reactions: Record<string, number>
  mine: string | null
}

// The reactions a visitor can leave; the first is the plain "Like".
const REACTIONS = [
  { emoji: '👍', label: 'Like' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '💡', label: 'Insightful' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '👏', label: 'Applaud' },
]

const fileUrl = (f: LearnedFile) => `/api/learned-file?id=${f.id}`

// The "What I learned" page: weekly notes written in the admin, newest first.
// Same header, type and footer as the portfolio; only published posts reach it.
export default function LearnedApp() {
  const [posts, setPosts] = useState<Post[]>()
  const [tag, setTag] = useState('All')

  useEffect(() => {
    fetch(`/api/learned?v=${encodeURIComponent(visitorId())}`)
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
            <LayoutGroup id="learned-filter"><div className="software__filters" role="toolbar" aria-label="Filter by topic">
              {tags.map((t) => (
                <button key={t} className={`chip chip--dark${tag === t ? ' is-active' : ''}`} onClick={() => setTag(t)} aria-pressed={tag === t}>
                  {tag === t && (
                    <motion.span className="chip__bg" layoutId="learned-filter-bg" transition={{ duration: 0.35, ease: EASE }} />
                  )}
                  <span className="chip__text">{t}</span>
                </button>
              ))}
            </div></LayoutGroup>
          )}

          {posts === undefined && <p className="learned-page__empty">Loading…</p>}
          {posts && !posts.length && (
            <div className="learned-page__empty">
              <Rail label="Coming soon" />
              <p>The first note is on its way. Check back next week.</p>
            </div>
          )}

          <div className="feed">
            {shown.map((p, i) => (
              <Reveal key={p.id} delay={Math.min(i, 3) * 0.05}>
                <PostCard post={p} number={posts!.length - posts!.indexOf(p)} featured={p === posts![0]} onTag={setTag} />
              </Reveal>
            ))}
          </div>
        </section>
      </main>
      <Footer />
      <Cursor />
    </>
  )
}

const SEE_MORE_AT = 320

// One note, laid out like a post on LinkedIn or X: author, text, media, reactions.
function PostCard({ post, number, featured, onTag }: { post: Post; number: number; featured: boolean; onTag: (tag: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [picker, setPicker] = useState(false)
  const [mine, setMine] = useState(post.mine)
  const [counts, setCounts] = useState(post.reactions)
  const [copied, setCopied] = useState(false)

  const paras = paragraphs(post.body)
  const long = post.body.length > SEE_MORE_AT
  const shownParas = expanded || !long ? paras : [post.body.slice(0, SEE_MORE_AT).replace(/\s+\S*$/, '').trim() + '…']

  // Optimistic: update the numbers now, tell the server in the background.
  const react = (emoji: string | null) => {
    setPicker(false)
    if (emoji === mine) emoji = null
    setCounts((c) => {
      const next = { ...c }
      if (mine) next[mine] = Math.max(0, (next[mine] ?? 1) - 1)
      if (emoji) next[emoji] = (next[emoji] ?? 0) + 1
      return next
    })
    setMine(emoji)
    fetch('/api/react', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ postId: post.id, visitorId: visitorId(), emoji }),
    }).catch(() => {})
  }

  const share = async () => {
    const url = `${location.origin}/learned#post-${post.id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('Copy this link', url)
    }
  }

  const top = Object.entries(counts).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])
  const total = top.reduce((sum, [, n]) => sum + n, 0)
  const active = REACTIONS.find((r) => r.emoji === mine)

  return (
    <article id={`post-${post.id}`} className="post">
      <div className="post__top">
        <p className="rail">
          <span className="rail__count">No. {String(number).padStart(2, '0')}</span>
          <span className="rail__dot" aria-hidden="true">·</span>
          <time dateTime={post.week_of}>Week of {fmtWeek(post.week_of)}</time>
        </p>
        {featured && <p className="rail">Latest</p>}
      </div>

      <header className="post__author">
        <img className="post__avatar" src={portrait} alt="" width={44} height={44} />
        <div>
          <p className="post__name">{contact.name}</p>
          <p className="post__role">Senior Software Engineer · JPMorgan Chase</p>
        </div>
      </header>

      <div className="post__body">
        <h2>{post.title}</h2>
        {shownParas.map((para, j) => (
          <p key={j}>{para}</p>
        ))}
        {long && !expanded && (
          <button className="post__more" onClick={() => setExpanded(true)}>…see more</button>
        )}
        {post.tags.length > 0 && (
          <p className="post__tags">
            {post.tags.map((t) => (
              <button key={t} onClick={() => onTag(t)}>#{t.replace(/\s+/g, '')}</button>
            ))}
          </p>
        )}
      </div>

      <Attachments files={post.files} />

      {total > 0 && (
        <p className="post__summary" aria-label={`${total} reaction${total === 1 ? '' : 's'}`}>
          <span className="post__stack" aria-hidden="true">
            {top.slice(0, 3).map(([e]) => <span key={e}>{e}</span>)}
          </span>
          {total}
        </p>
      )}

      <footer className="post__actions">
        <div className="post__react">
          {picker && (
            <div className="post__picker" role="menu" aria-label="Choose a reaction">
              {REACTIONS.map((r) => (
                <button key={r.emoji} role="menuitem" title={r.label} aria-label={r.label} onClick={() => react(r.emoji)}>{r.emoji}</button>
              ))}
            </div>
          )}
          <button className={`post__btn${mine ? ' is-on' : ''}`} onClick={() => react(mine ? null : '👍')} aria-pressed={Boolean(mine)}>
            <span aria-hidden="true">{mine ?? '👍'}</span> {active?.label ?? 'Like'}
          </button>
          <button className="post__btn" onClick={() => setPicker((o) => !o)} aria-expanded={picker} aria-label="More reactions">
            <span aria-hidden="true">😊</span> React
          </button>
        </div>
        <button className="post__btn" onClick={share}>
          <span aria-hidden="true">↗</span> {copied ? 'Link copied' : 'Share'}
        </button>
      </footer>
    </article>
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
        <a href="/#path">Path</a>
        <a href="/learned" className="is-active" aria-current="page">
          Learned
          <motion.span className="nav__underline" layoutId="nav-underline" transition={{ duration: 0.35, ease: EASE }} />
        </a>
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
