# Architecture projects: reference

Snapshot of `src/data/projects.ts` (October 2026). Re-read the file for the
live state; use this for the conventions.

## Current projects (Project Index order)

| Sheet | Folder | Name | Firm | Status | Year | Program | Gallery |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-101 | demeter | Demeter 4.Zero | Tom Lee Studio | Under Construction | 2024–25 | 2-story manufacturing · 54,371 GSF | 1 photo, 5 drawings |
| A-102 | wolcott | Wolcott House | Tom Lee Studio | Design | 2024–25 | 2 stories + basement · 4,227 SF | 4 drawings |
| A-201 | cambridge | Chick-fil-A Cambridge | Gensler | Completed | 2021 | Free-standing restaurant · 451 m² · 96 seats | 2 drawings |
| A-202 | appleby | Chick-fil-A Appleby | Gensler | Completed | 2021 | Free-standing restaurant · P13 SE Large | 2 drawings |
| A-301 | ada | 180 N Ada | Brininstool + Lynch | Completed | 2019 | 14-story residential · 263 units · 300,680 SF | 5 photos, 2 drawings |
| A-302 | navigation | 2404 Navigation | Brininstool + Lynch | Completed | 2022 | 8-story multifamily · 300 units · 440,450 SF | 4 photos, 3 drawings |
| A-303 | grand | 369 West Grand | Brininstool + Lynch | Completed | 2021 | 41-story residential · 356 units · 533,000 SF | 6 photos, 3 drawings |
| A-304 | southloop | South Loop Complex | Brininstool + Lynch | Competition | — | 3 high-rises · 836 units · retail | 3 photos, 1 drawing |
| A-401 | shanghai | Shanghai Financial Center | JAHN | Completed | 2020 | 3 office towers · 406,000 m² | 1 photo, 1 drawing |
| A-402 | diablos | Diablos Rojos Stadium | JAHN | Completed | 2019 | 20,000-seat ballpark · 80,000 m² | 2 photos, 1 drawing |
| A-403 | shenzhen | Shenzhen Convention Center | JAHN | Competition | — | Convention masterplan · hotel · office · retail | 1 photo, 5 drawings |

**Featured** (large showcase sections, in this order): `grand` (2021, leads),
`diablos` (2019), `shanghai` (2020, with the interactive massing model).
Diablos and Shanghai also pull extra photos from their original folders
(`images/Diablos - Baseball stadium/`, `images/Shanghai Financial Exchange
Plaza Shanghai China 2020/`) via `import.meta.glob`; new projects don't need
that and should use `mediaFor('<folder>')`.

**Projects with `facts` rows:** ada, navigation, grand. The others may get them
when the user supplies Role / Consultants / Contractor.

## Conventions the entries follow

- **Sheet series by firm:** A-1xx Tom Lee Studio (2024–25), A-2xx Gensler
  (2021), A-3xx Brininstool + Lynch (2019–22), A-4xx JAHN (2015–20). Newest
  firm first; within a firm, roughly by importance.
- **Location:** "City, State/Province" spelled out ("Chicago, Illinois",
  "Burlington, Ontario"), or "City, Country" abroad ("Shanghai, China").
- **Program:** `·`-separated: building type and size first, then units or
  seats, then area. Area unit: SF in the US (GSF when given as gross), m²
  elsewhere (including Canada). Numbers ≥ 1,000 use commas.
- **Role (the user's own):** `·`-separated phases or tasks, e.g.
  `Project Architect · SD · DD · CD · CA`. Abbreviations: PD Planned
  Development, SD Schematic Design, DD Design Development, CD Construction
  Documents, CA Construction Administration.
- **Summary:** 2–4 sentences. What the building is (the user's description),
  then what the user personally did.
- **Facts rows (firm-level):** `Firm role`, `Consultants` (with disciplines in
  parentheses), `Contractor`. Values use ` · ` between roles.

## Example: a complete updated entry

```ts
{
  sheet: 'A-302',
  folder: 'navigation',
  name: '2404 Navigation',
  location: 'Houston, Texas',
  firm: 'Brininstool + Lynch',
  status: 'Completed',
  year: '2022',
  program: '8-story multifamily · 300 units · 440,450 SF',
  role: 'Project Architect · SD · DD · CD · CA',
  summary:
    'Forth at Navigation, an eight-story, 300-unit multifamily community in Houston’s East End cultural district. A sleek glass and metal skin allows floor-to-ceiling windows in many units, with views of downtown. Handled the foundation and building permits, then SD, DD and CD with civil, structural and MEP consultants, and CA coordination with the GC through construction.',
  facts: [
    { label: 'Firm role', value: 'Design Architect · Architect of Record' },
    {
      label: 'Consultants',
      value:
        'SCA Engineers (Structural), Jordan & Skala Engineers (MEPFP), CAS Consulting & Services (Civil), Hitchcock Design Group (Landscape)',
    },
    { label: 'Contractor', value: 'Arch-Con Corporation' },
  ],
},
```

## Example: gallery after an update (369 West Grand)

```
01-photo-tower-at-dusk.jpg               ← strongest built photo = cover
02-photo-tower-from-the-street.jpg
03-photo-amenity-lounge.jpg              ← interiors
04-photo-amenity-kitchen-and-dining.jpg
05-photo-rendering-view-southwest.jpg    ← renderings after real photos
06-photo-rendering-facing-east.jpg       ← was 4480px / 5.1 MB → resized; original in images/_originals/
07-drawing-west-and-north-elevations.jpg ← drawings last
08-drawing-typical-plan.jpg
09-drawing-penthouse-plan.jpg
```
