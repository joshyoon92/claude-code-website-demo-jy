---
name: adding-arch-project
description: Add a new architecture project or update an existing one on the portfolio site. Use when the user drops new photos/drawings into images/portfolio/<folder>/ (or another images folder), pastes project details (Location, Year, Area, Role, Consultants, Contractor, a description paragraph), says "more information/photos for <project>", or asks to feature/highlight a project like Diablos and Shanghai.
---

# Add or update an architecture project

The site leads with software; architecture is the archive. Keep project copy
factual and concise, and don't let it crowd the software story.

Everything lives in two places:
- `src/data/projects.ts`: `projectData` (one entry per project, shown in the
  Project Index) and `featured` (the large showcase sections).
- `images/portfolio/<folder>/`: each project's gallery, built automatically.

Read `reference.md` (next to this file) for the current project list, sheet
numbers and the conventions the existing entries follow. Match them.

## 1. Images

**Naming is critical.** The gallery loader in `projects.ts` requires every file
in `images/portfolio/<folder>/` to be named `NN-photo-<caption>.jpg` or
`NN-drawing-<caption>.jpg`. Any other name **crashes the whole site** at load.

1. Run `node .claude/skills/adding-arch-project/check-images.mjs <folder>` to list
   files that break the pattern (the new ones) and any that are too large.
2. **Open and look at every new image** before naming it:
   - `photo`: photographs of built work, and renderings
   - `drawing`: plans, sections, elevations, details, diagrams
   - caption: short and factual, from what is visible ("pool courtyard",
     "tower at dusk"). Don't invent orientations or facts. Prefix renderings
     with "rendering" so they aren't mistaken for built work.
3. Order the gallery: the strongest finished photo first (it becomes the cover),
   then other built photos, then interiors, then renderings, then drawings.
   Renumber existing tracked files with `git mv` to fit; use plain `mv` for
   untracked new files.
4. The caption comes from the file name and only its first letter is
   capitalized, so avoid words that need capitals mid-caption: "the L tracks"
   becomes "the elevated tracks", and "on Grand" should be dropped or reworded.
5. Resize any image wider than 1600px **or** larger than 1 MB:
   `powershell -NoProfile -File .claude/skills/adding-arch-project/resize-image.ps1 -Source "<in>" -Dest "<folder>/NN-photo-<caption>.jpg"`
   Then move the original into `images/_originals/` (gitignored). **Never
   delete originals.**
6. If the user put photos in a different folder (e.g. `images/2404/`), move
   them into `images/portfolio/<folder>/` and remove the empty folder.
7. Re-run `check-images.mjs <folder>`. It must report **no errors** (errors
   crash the site). Fix warnings too, unless there is a reason not to (Diablos
   deliberately leads with a drawing because its featured section uses
   separate photos).

## 2. Project data (`projectData` in `src/data/projects.ts`)

### Updating an existing project
Find it by `folder` and update only what the user gave you:
- `year`: as given ("2021"; a span uses an en dash: "2024–25").
- `program`: keep the existing description and append the area, e.g.
  `'8-story multifamily · 300 units · 440,450 SF'`. US projects use SF;
  international ones use m².
- `summary`: lead with the user's description (lightly edited for flow, in
  their words), then keep the existing sentences about the user's own role.
- `facts`: the firm's information as rows, in this order:
  - `Firm role`: the pasted "Role" (e.g. "Design Architect · Architect of
    Record"). It is **the firm's** role, not the user's.
  - `Consultants`: as pasted, keeping the disciplines in parentheses
  - `Contractor`
  - (any other pasted fields, such as `Client`, with their own labels)
- `name`: if the user calls the project something different from the file
  (e.g. 369 vs 353 West Grand), use the user's name and **say so** in your
  report. If the description gives a marketing name ("Forth at Navigation",
  "The Mason"), keep the address as `name` and mention the marketing name in
  the summary unless the user asks to rename.

**Never change `role`** (the user's personal scope) unless asked.

### Adding a new project
Add an entry to `projectData`, grouped with its firm (see `reference.md`):
- `sheet`: the next free number in the firm's series (`A-1xx` Tom Lee Studio,
  `A-2xx` Gensler, `A-3xx` Brininstool + Lynch, `A-4xx` JAHN). A new firm gets
  the next series, `A-5xx`.
- `folder`: short lowercase slug of the name ("navigation", "southloop").
- `status`: one of `'Completed' | 'Under Construction' | 'Design' | 'Competition'`.
- `role`: the user's own scope. **Ask the user if they didn't give it**;
  don't infer it from the firm's role.
- Fill `program`, `summary`, `facts` as above.
The footer's project count and the command palette update automatically.

## 3. Featuring a project (only when asked)

Add an object to `featured` in `projects.ts`, after the existing ones in
chronological order. Use the existing three as templates:
- `id`: the folder name (≤ 8 letters reads best; the shutter animation spells it).
- `images: mediaFor('<folder>')`
- `body`: the user's description, as 1–2 short paragraphs
- `contribution`: `'<Short scope>: <detail>'`. The text before the colon gets
  the highlight.
- `stats`: **exactly 4** (the grid has 4 columns). Write numbers ≥ 1,000 with
  commas ("533,000"); a year without ("2021").
- `facts`: firm and role, contractor, consultants (names only, to keep it short)
- `awards`: only real ones the user gave; an empty array is fine.

Then link it in the two hand-written places:
- `src/components/CommandPalette.tsx`: add a `Featured · <City>` item and
  add the folder to the list excluded from the plain project items.
- `src/components/Contact.tsx`: add a footer link `<a href="#<id>">…</a>`.

## 4. Verify

1. `npm run build` must pass.
2. Screenshot the expanded Project Index row at 1400px and 390px wide (and the
   featured section, if any). Check gallery order, captions, the facts
   rows, and that the page doesn't scroll sideways on the phone.
   A local static server over `dist/` plus headless Edge (puppeteer-core in a
   scratch directory) works; open the row by clicking `.index__row` that
   contains the project name.

## 5. Report back

Tell the user what changed:
- the details updated, and any rename
- the final gallery order with captions
- images that were resized, and where the originals went
- anything you assumed or that needs their check (e.g. unit counts you kept)

Don't commit unless asked.
