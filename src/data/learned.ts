// Helpers shared by the site's "What I learned" section and the admin editor.

export const fmtWeek = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

// Posts are written in the admin as plain text; blank lines separate paragraphs.
export const paragraphs = (body: string) => body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)

export interface LearnedFile {
  id: number
  name: string
  type: string
  size: number
}

export const isImage = (f: Pick<LearnedFile, 'type'>) => f.type.startsWith('image/')

export const fmtSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
