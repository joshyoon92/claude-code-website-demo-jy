import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { fmtSize, fmtWeek, isImage, paragraphs, type LearnedFile } from '../data/learned'
import { fmtAgo } from './format'

interface Post {
  id: number
  week_of: string
  title: string
  body: string
  tags: string[]
  published: boolean
  linkedin_posted: string | null
  files: LearnedFile[]
}

const LINKEDIN_LIMIT = 3000
const MAX_FILE_BYTES = 3 * 1024 * 1024
const MAX_FILES = 6
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'text/plain', 'text/markdown', 'application/zip']

// Monday of the current week, as YYYY-MM-DD in local time.
function thisMonday() {
  const d = new Date()
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const empty = () => ({ id: undefined as number | undefined, weekOf: thisMonday(), title: '', body: '', tags: '' })
type Draft = ReturnType<typeof empty>

const splitTags = (tags: string) => tags.split(',').map((t) => t.trim()).filter(Boolean)

// The post as it will read on LinkedIn: title, text, hashtags, then a link back to the site.
function linkedinText(d: Pick<Draft, 'title' | 'body' | 'tags'>) {
  const hashtags = splitTags(d.tags)
    .map((t) => `#${t.replace(/[^\p{L}\p{N}]+/gu, '')}`)
    .filter((t) => t.length > 1)
    .join(' ')
  return [d.title.trim(), d.body.trim(), hashtags, `More of what I’m learning: ${location.origin}/learned`].filter(Boolean).join('\n\n')
}

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

// A post as the public page will show it (drafts included). Pending files preview from the browser.
function Preview({ title, body, tags, weekOf, files, pending = [] }: { title: string; body: string; tags: string[]; weekOf: string; files: LearnedFile[]; pending?: File[] }) {
  const urls = useMemo(() => pending.map((f) => URL.createObjectURL(f)), [pending])
  useEffect(() => () => urls.forEach(URL.revokeObjectURL), [urls])
  return (
    <article className="preview">
      <p className="mono">Week of {weekOf ? fmtWeek(weekOf) : '…'}</p>
      <h3>{title || 'Untitled'}</h3>
      {paragraphs(body).map((p, i) => <p key={i} className="preview__p">{p}</p>)}
      {(files.length > 0 || pending.length > 0) && (
        <div className="preview__files">
          {files.filter(isImage).map((f) => <img key={f.id} src={`/api/admin/learned-file?id=${f.id}`} alt={f.name} />)}
          {pending.map((f, i) => (f.type.startsWith('image/') ? <img key={`p${i}`} src={urls[i]} alt={f.name} /> : null))}
          {files.filter((f) => !isImage(f)).map((f) => <span key={f.id} className="tag">{f.name} · {fmtSize(f.size)}</span>)}
          {pending.filter((f) => !f.type.startsWith('image/')).map((f, i) => <span key={`q${i}`} className="tag">{f.name} · {fmtSize(f.size)}</span>)}
        </div>
      )}
      {tags.length > 0 && <p>{tags.map((t) => <span key={t} className="tag">{t}</span>)}</p>}
    </article>
  )
}

export default function LearnedAdmin() {
  const [posts, setPosts] = useState<Post[]>([])
  const [draft, setDraft] = useState<Draft>(empty)
  const [existing, setExisting] = useState<LearnedFile[]>([])
  const [removed, setRemoved] = useState<number[]>([])
  const [pending, setPending] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState<'all' | 'live' | 'draft'>('all')
  const [open, setOpen] = useState<number>()

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/learned').catch(() => undefined)
    if (res?.ok) setPosts((await res.json()).posts)
    else setMessage('Couldn’t load posts.')
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const call = async (url: string, method: string, body: object) => {
    const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => undefined)
    if (res?.ok) return (await res.json()) as { id?: number }
    setMessage((await res?.json().catch(() => undefined))?.error ?? 'That didn’t work. Try again.')
    return undefined
  }

  const reset = () => {
    setDraft(empty())
    setExisting([])
    setRemoved([])
    setPending([])
  }

  const attach = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = [...(e.target.files ?? [])]
    e.target.value = ''
    const problems: string[] = []
    const ok = picked.filter((f) => {
      if (!ALLOWED.includes(f.type)) problems.push(`${f.name}: unsupported type (use images, PDF, text or zip)`)
      else if (f.size > MAX_FILE_BYTES) problems.push(`${f.name}: over 3 MB`)
      else return true
      return false
    })
    const room = MAX_FILES - (existing.length - removed.length) - pending.length
    if (ok.length > room) problems.push(`Up to ${MAX_FILES} attachments per post.`)
    setPending([...pending, ...ok.slice(0, Math.max(0, room))])
    setMessage(problems.join(' · '))
  }

  // Creates or updates the post, applies attachment changes, and returns the post id (undefined if the post itself failed).
  const save = async (published: boolean, extra: object = {}) => {
    setBusy(true)
    setMessage('')
    const result = await call('/api/admin/learned', draft.id ? 'PUT' : 'POST', {
      id: draft.id, weekOf: draft.weekOf, title: draft.title, body: draft.body, tags: splitTags(draft.tags), published, ...extra,
    })
    const id = result && (draft.id ?? result.id)
    if (!id) {
      setBusy(false)
      return undefined
    }
    for (const fileId of removed) await call('/api/admin/learned-file', 'DELETE', { id: fileId })
    const failed: File[] = []
    for (const file of pending) {
      const ok = await call('/api/admin/learned-file', 'POST', { postId: id, name: file.name, type: file.type, data: await toBase64(file) })
      if (!ok) failed.push(file)
    }
    await load()
    setBusy(false)
    if (failed.length) {
      // Keep the draft open on the saved post so the failed files can be retried.
      setDraft({ ...draft, id })
      setRemoved([])
      setPending(failed)
      setExisting((await fetch('/api/admin/learned').then((r) => r.json()).catch(() => ({ posts: [] }))).posts.find((p: Post) => p.id === id)?.files ?? [])
      setMessage((m) => `Saved, but ${failed.length} attachment${failed.length === 1 ? '' : 's'} didn’t upload. ${m}`.trim())
      return undefined
    }
    return id
  }

  const submit = (published: boolean) => async (e?: FormEvent) => {
    e?.preventDefault()
    if (await save(published)) {
      setMessage(published ? 'Posted. It’s live on the Learned page.' : 'Saved as a draft. Only you can see it.')
      reset()
    }
  }

  // Posts to the site, copies the text and opens LinkedIn's composer with it filled in.
  // The share link can't carry files, so attachments are added in LinkedIn by hand.
  const shareToLinkedIn = async () => {
    const text = linkedinText(draft)
    const hadFiles = existing.length - removed.length + pending.length > 0
    const id = await save(true, { linkedinPosted: true })
    if (!id) return
    await navigator.clipboard?.writeText(text).catch(() => {})
    window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    reset()
    setMessage(`Posted to the site and opened LinkedIn with your text (also copied).${hadFiles ? ' Add the attachments in LinkedIn yourself.' : ''}`)
  }

  const edit = (p: Post) => {
    setDraft({ id: p.id, weekOf: p.week_of, title: p.title, body: p.body, tags: p.tags.join(', ') })
    setExisting(p.files)
    setRemoved([])
    setPending([])
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const patch = async (p: Post, changes: { published?: boolean; linkedinPosted?: boolean }) => {
    if (await call('/api/admin/learned', 'PUT', { id: p.id, weekOf: p.week_of, title: p.title, body: p.body, tags: p.tags, published: p.published, ...changes })) load()
  }
  const remove = async (p: Post) => {
    if (!confirm(`Delete “${p.title}” and its attachments? This can’t be undone.`)) return
    if (await call('/api/admin/learned', 'DELETE', { id: p.id })) {
      if (draft.id === p.id) reset()
      load()
    }
  }

  const keptFiles = existing.filter((f) => !removed.includes(f.id))
  const length = linkedinText(draft).length
  const ready = Boolean(draft.title.trim() && draft.body.trim())
  const shown = posts.filter((p) => filter === 'all' || (filter === 'live') === p.published)
  const live = posts.filter((p) => p.published).length

  return (
    <div className="learned-admin">
      <section className="panel">
        <div className="panel__head">
          <div>
            <h2>{draft.id ? 'Edit post' : 'Write this week’s note'}</h2>
            <p className="panel__sub">Plain text; a blank line starts a new paragraph. Nothing is public until you press Post.</p>
          </div>
          {draft.id && <button className="btn" onClick={reset}>Start a new post</button>}
        </div>
        <form className="learned-form" onSubmit={submit(true)}>
          <div className="learned-form__row">
            <input type="date" aria-label="Week of" value={draft.weekOf} onChange={(e) => setDraft({ ...draft, weekOf: e.target.value })} required />
            <input placeholder="Title, e.g. Why my Postgres query was slow" value={draft.title} maxLength={200} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
          </div>
          <textarea placeholder="What happened, what you learned, what you’ll do differently…" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} required />
          <input placeholder="Tags, comma separated (React, SQL, Testing)" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />

          <div className="attach">
            <label className="btn">
              Attach files
              <input type="file" multiple hidden accept={ALLOWED.join(',')} onChange={attach} />
            </label>
            <span className="panel__sub">Images, PDF, text or zip · up to 3 MB each · {MAX_FILES} per post</span>
            <ul className="attach__list">
              {keptFiles.map((f) => (
                <li key={f.id} className="tag">{f.name} · {fmtSize(f.size)} <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setRemoved([...removed, f.id])}>×</button></li>
              ))}
              {pending.map((f, i) => (
                <li key={`${f.name}${i}`} className="tag tag--ref">{f.name} · {fmtSize(f.size)} <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setPending(pending.filter((_, j) => j !== i))}>×</button></li>
              ))}
            </ul>
          </div>

          <div className="learned-form__actions">
            <button className="btn btn--primary" disabled={busy || !ready}>{busy ? 'Working…' : 'Post to site'}</button>
            <button type="button" className="btn" disabled={busy || !ready} onClick={submit(false)}>Save as draft</button>
            <button type="button" className="btn" disabled={busy || !ready} onClick={shareToLinkedIn}>Post &amp; share on LinkedIn ↗</button>
            {draft.id && (
              <button type="button" className="btn btn--danger" disabled={busy} onClick={() => remove(posts.find((p) => p.id === draft.id)!)}>Delete post</button>
            )}
            <span className="learned-form__count" style={length > LINKEDIN_LIMIT ? { color: '#ff6b6b' } : undefined}>
              {length.toLocaleString()} / {LINKEDIN_LIMIT.toLocaleString()} for LinkedIn
            </span>
          </div>
          {message && <p className="panel__sub" role="status">{message}</p>}
        </form>
      </section>

      {ready && (
        <section className="panel">
          <div className="panel__head"><h2>Preview</h2><p className="panel__sub">How it will look on the Learned page</p></div>
          <Preview title={draft.title} body={draft.body} tags={splitTags(draft.tags)} weekOf={draft.weekOf} files={keptFiles} pending={pending} />
        </section>
      )}

      <section className="panel">
        <div className="panel__head">
          <div>
            <h2>Your posts ({posts.length})</h2>
            <p className="panel__sub">{live} live · {posts.length - live} draft. Visitors only see the live ones.</p>
          </div>
          <div className="seg" role="tablist">
            {([['all', 'All'], ['live', 'Live'], ['draft', 'Drafts']] as const).map(([v, label]) => (
              <button key={v} type="button" role="tab" aria-selected={filter === v} className={filter === v ? 'is-on' : undefined} onClick={() => setFilter(v)}>{label}</button>
            ))}
          </div>
        </div>
        {!shown.length && <p className="panel__sub">{posts.length ? 'No posts match.' : 'Nothing written yet.'}</p>}
        {shown.map((p) => (
          <div key={p.id}>
            <div className="learned-row">
              <div>
                <div className="learned-row__title">
                  {p.title} <span className={`tag${p.published ? ' tag--ref' : ''}`}>{p.published ? 'Live' : 'Draft'}</span>
                </div>
                <div className="learned-row__meta">
                  Week of {fmtWeek(p.week_of)} · {p.files.length} attachment{p.files.length === 1 ? '' : 's'} ·{' '}
                  {p.linkedin_posted ? `Shared to LinkedIn ${fmtAgo(p.linkedin_posted)}` : 'Not on LinkedIn'}
                </div>
              </div>
              <div className="learned-row__actions">
                <button className="btn" onClick={() => setOpen(open === p.id ? undefined : p.id)}>{open === p.id ? 'Hide' : 'Preview'}</button>
                <button className="btn" onClick={() => edit(p)}>Edit</button>
                <button className="btn" onClick={() => patch(p, { published: !p.published })}>{p.published ? 'Unpublish' : 'Post'}</button>
                {p.published && <a className="btn" href={`/learned#post-${p.id}`} target="_blank" rel="noreferrer">View on site ↗</a>}
                <button className="btn" onClick={() => patch(p, { linkedinPosted: !p.linkedin_posted })}>{p.linkedin_posted ? 'Unmark LinkedIn' : 'Mark on LinkedIn'}</button>
                <button className="btn btn--danger" onClick={() => remove(p)}>Delete</button>
              </div>
            </div>
            {open === p.id && <Preview title={p.title} body={p.body} tags={p.tags} weekOf={p.week_of} files={p.files} />}
          </div>
        ))}
      </section>
    </div>
  )
}
