// Checks project gallery folders against the rules the site depends on.
//   node .claude/skills/adding-arch-project/check-images.mjs            (all folders)
//   node .claude/skills/adding-arch-project/check-images.mjs grand ada  (some)
// Errors (exit code 1) would crash the site; warnings are conventions to fix
// unless there is a reason not to (e.g. Diablos leads with a drawing on purpose).
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'images/portfolio'
const NAME = /^\d{2}-(photo|drawing)-[a-z0-9]+(-[a-z0-9]+)*\.jpg$/ // what projects.ts can parse
const MAX_BYTES = 1024 * 1024

const folders = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(ROOT)
let errors = 0

for (const folder of folders) {
  const dir = join(ROOT, folder)
  let files
  try {
    files = readdirSync(dir).filter((f) => statSync(join(dir, f)).isFile())
  } catch {
    console.log(`✗ ${folder}: folder not found (${dir})`)
    errors++
    continue
  }
  const issues = [] // errors
  const warnings = []
  const numbers = new Map()
  for (const f of files) {
    if (!NAME.test(f)) issues.push(`bad name (would crash the site): ${f}`)
    else {
      const n = f.slice(0, 2)
      if (numbers.has(n)) issues.push(`duplicate number ${n}: ${numbers.get(n)} and ${f}`)
      numbers.set(n, f)
    }
    const size = statSync(join(dir, f)).size
    if (size > MAX_BYTES) warnings.push(`too large (${(size / 1048576).toFixed(1)} MB, resize to ≤1600px): ${f}`)
  }
  const sorted = [...numbers.keys()].sort()
  const firstDrawing = files.filter((f) => NAME.test(f)).sort().findIndex((f) => f.includes('-drawing-'))
  const photoAfterDrawing = files
    .filter((f) => NAME.test(f))
    .sort()
    .slice(firstDrawing === -1 ? Infinity : firstDrawing)
    .some((f) => f.includes('-photo-'))
  if (photoAfterDrawing) warnings.push('a photo comes after a drawing (photos should come first)')
  if (sorted.length && sorted[0] !== '01') warnings.push(`numbering starts at ${sorted[0]}, not 01`)

  errors += issues.length
  const mark = issues.length ? '✗' : warnings.length ? '!' : '✓'
  console.log(`${mark} ${folder} (${files.length} images)`)
  for (const i of issues) console.log(`    error: ${i}`)
  for (const w of warnings) console.log(`    warning: ${w}`)
}

process.exit(errors ? 1 : 0)
