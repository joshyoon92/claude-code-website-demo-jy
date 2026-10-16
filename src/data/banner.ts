import grandVideoCard from '../assets/banner/grand-video.jpg'
import { grandVideo } from './projects'

// The top banner: a 3D gallery of built work with the software it led to
// shuffled in, so the cards alternate between the architect and the engineer.
// Photos are 360×480 crops in src/assets/banner/ (kept small: ~22 cards are
// on screen at once).

export type CodeLang = 'ts' | 'tsx' | 'java' | 'sql' | 'bash'

type ProjectId = 'grand' | 'navigation' | 'ada' | 'diablos' | 'shanghai' | 'southloop'

interface ProjectInfo {
  name: string
  place: string
  year: string
  /** One sentence for the photo detail view. */
  blurb: string
  /** Where "View project" goes: a featured section, or a row in the index. */
  link: { section: string } | { sheet: string }
}

export const PROJECTS: Record<ProjectId, ProjectInfo> = {
  grand: {
    name: '369 West Grand',
    place: 'Chicago',
    year: '2021',
    blurb: 'A 41-story River North tower: amenity-rich floors and hotel-grade units.',
    link: { section: 'grand' },
  },
  navigation: {
    name: '2404 Navigation',
    place: 'Houston',
    year: '2022',
    blurb: 'Forth at Navigation: 300 units in the East End, in glass and metal with views of downtown.',
    link: { sheet: 'A-302' },
  },
  ada: {
    name: '180 N Ada',
    place: 'Chicago',
    year: '2019',
    blurb: 'The Mason: a West Loop take on Chicago’s exposed structural frame, 264 units over 14 stories.',
    link: { sheet: 'A-301' },
  },
  diablos: {
    name: 'Diablos Rojos Stadium',
    place: 'Mexico City',
    year: '2019',
    blurb: 'A 20,000-seat ballpark, the first stadium built in Mexico City in 50 years.',
    link: { section: 'diablos' },
  },
  shanghai: {
    name: 'Shanghai Financial Center',
    place: 'Shanghai',
    year: '2021',
    blurb: 'Three exchange headquarters joined by a 130-meter sky bridge.',
    link: { section: 'shanghai' },
  },
  southloop: {
    name: 'South Loop Complex',
    place: 'Chicago',
    year: 'Competition',
    blurb: 'A competition finalist: three high-rises and 836 units over retail.',
    link: { sheet: 'A-304' },
  },
}

export type PhotoCard = {
  kind: 'photo'
  id: string
  /** 360×480 crop shown on the card. */
  src: string
  /** Short title for the detail view, e.g. "Tower at dusk". */
  title: string
  /** Loads the full-size original, only when the photo is opened. */
  loadFull: () => Promise<string>
  project: ProjectId
}
export type CodeCard = {
  kind: 'code'
  id: string
  project: ProjectId
  /** One line tying the building to the code. */
  bridge: string
  file: string
  lang: CodeLang
  code: string[]
}
/** A clip, shown on its card as a still and played when opened. Always AI-labelled. */
export type VideoCard = {
  kind: 'video'
  id: string
  /** 360×480 still for the card. */
  src: string
  video: string
  poster: string
  title: string
  project: ProjectId
}
export type GalleryCard = PhotoCard | CodeCard | VideoCard

const VIDEO: VideoCard = {
  kind: 'video',
  id: 'grand-video',
  src: grandVideoCard,
  video: grandVideo.video!,
  poster: grandVideo.src,
  title: 'Flythrough (AI-generated)',
  project: 'grand',
}

const photos = import.meta.glob<string>('../assets/banner/*.jpg', { eager: true, import: 'default' })
// Not eager: an original is fetched only when its photo is opened.
const originals = import.meta.glob<string>(
  [
    '../../images/portfolio/*/*.jpg',
    '../../images/Diablos - Baseball stadium/*.jpg',
    '../../images/Shanghai Financial Exchange Plaza Shanghai China 2020/*.jpg',
  ],
  { import: 'default' },
)

// Each card's title, and the original it was cropped from.
const PHOTOS: Record<string, { title: string; original: string }> = {
  'grand-02': { title: 'Tower from the street', original: 'portfolio/grand/02-photo-tower-from-the-street.jpg' },
  'grand-03': { title: 'Amenity lounge', original: 'portfolio/grand/03-photo-amenity-lounge.jpg' },
  'grand-04': { title: 'Rendering, view southwest', original: 'portfolio/grand/05-photo-rendering-view-southwest.jpg' },
  'navigation-01': { title: 'Aerial at twilight', original: 'portfolio/navigation/01-photo-aerial-at-twilight.jpg' },
  'navigation-02': { title: 'Street facade at twilight', original: 'portfolio/navigation/02-photo-street-facade-at-twilight.jpg' },
  'navigation-03': { title: 'Pool courtyard', original: 'portfolio/navigation/03-photo-pool-courtyard.jpg' },
  'ada-01': { title: 'Exterior from Ada and Lake', original: 'portfolio/ada/01-photo-exterior-from-ada-and-lake.jpg' },
  'ada-02': { title: 'Facade beyond the L tracks', original: 'portfolio/ada/02-photo-facade-beyond-the-elevated-tracks.jpg' },
  'ada-03': { title: 'Pool courtyard and skyline', original: 'portfolio/ada/03-photo-pool-courtyard-and-skyline.jpg' },
  'ada-04': { title: 'Roof deck looking downtown', original: 'portfolio/ada/04-photo-roof-deck-looking-downtown.jpg' },
  'diablos-01': { title: 'Field from the stands', original: 'Diablos - Baseball stadium/FGP-ATELIER-DIABLOS-4.jpg' },
  'diablos-02': { title: 'Canopy over the stands', original: 'Diablos - Baseball stadium/FGP-ATELIER-DIABLOS-21.jpg' },
  'diablos-03': { title: 'Seating bowl', original: 'portfolio/diablos/03-photo-seating-bowl.jpg' },
  'shanghai-01': { title: 'The three towers at dusk', original: 'Shanghai Financial Exchange Plaza Shanghai China 2020/1660751163465.jpg' },
  'shanghai-02': { title: 'Aerial along the avenue', original: 'Shanghai Financial Exchange Plaza Shanghai China 2020/0041b_06-1024x820.jpg' },
  'southloop-01': { title: 'Rendering, view southwest on Clinton', original: 'portfolio/southloop/01-photo-view-southwest-on-clinton.jpg' },
}

const photo = (key: string): PhotoCard => {
  const src = Object.entries(photos).find(([path]) => path.endsWith(`/${key}.jpg`))?.[1]
  const info = PHOTOS[key]
  const load = info && originals[`../../images/${info.original}`]
  if (!src || !info || !load) throw new Error(`Banner photo "${key}" is missing its crop, title or original`)
  return { kind: 'photo', id: key, src, title: info.title, loadFull: load, project: key.split('-')[0] as ProjectId }
}

const CODE: Record<string, CodeCard> = {
  grand: {
    kind: 'code',
    id: 'code-grand',
    project: 'grand',
    bridge: 'Drawings become specs: define it before you build it.',
    file: 'Tower.ts',
    lang: 'ts',
    code: [
      '// 41 floors, one source of truth',
      'const tower = new Building({',
      '  floors: 41,',
      '  units: 356,',
      '})',
      "await tower.ship('River North')",
    ],
  },
  diablos: {
    kind: 'code',
    id: 'code-diablos',
    project: 'diablos',
    bridge: '20,000 seats, then 20,000 supplier records a night.',
    file: 'SupplierIngest.java',
    lang: 'java',
    code: [
      '@Scheduled(cron = "0 0 2 * * *")',
      'void ingestSuppliers() {',
      '  batches(suppliers, 500)',
      '    .forEach(repo::upsertAll);',
      '} // 20K+ records, nightly',
    ],
  },
  ada: {
    kind: 'code',
    id: 'code-ada',
    project: 'ada',
    bridge: 'An exposed structural frame, then a data model.',
    file: 'supplier.sql',
    lang: 'sql',
    code: [
      'CREATE TABLE supplier (',
      '  id     BIGINT PRIMARY KEY,',
      '  rating NUMERIC(3,1),',
      '  tier   VARCHAR(16) NOT NULL',
      '); -- the frame it stands on',
    ],
  },
  shanghai: {
    kind: 'code',
    id: 'code-shanghai',
    project: 'shanghai',
    bridge: 'Three towers and a bridge, then one dashboard.',
    file: 'Dashboard.tsx',
    lang: 'tsx',
    code: ['<Dashboard>', '  <Tower name="Ratings" />', '  <Tower name="Risk" />', '  <Bridge data={suppliers} />', '</Dashboard>'],
  },
  navigation: {
    kind: 'code',
    id: 'code-navigation',
    project: 'navigation',
    bridge: 'Coordinating consultants, then directing AI agents.',
    file: 'terminal',
    lang: 'bash',
    code: ['$ claude "add audit log"', '● Planning · 4 files', '✓ Tests passing', '# Java −50% · React −70%'],
  },
}

// Interleaved so a code card turns up every three or four photos.
export const galleryCards: GalleryCard[] = [
  VIDEO,
  photo('diablos-01'),
  photo('ada-01'),
  CODE.grand,
  photo('shanghai-01'),
  photo('navigation-01'),
  photo('grand-02'),
  CODE.diablos,
  photo('ada-02'),
  photo('diablos-02'),
  photo('navigation-02'),
  CODE.ada,
  photo('shanghai-02'),
  photo('grand-03'),
  photo('ada-03'),
  CODE.shanghai,
  photo('southloop-01'),
  photo('navigation-03'),
  photo('diablos-03'),
  CODE.navigation,
  photo('grand-04'),
  photo('ada-04'),
]

// A tiny highlighter: enough to colour these snippets, not a parser.
export type Token = { kind: 'kw' | 'str' | 'num' | 'com' | 'tag' | 'plain'; text: string }

const KEYWORDS =
  /^(const|let|new|await|async|public|void|return|import|from|export|CREATE|TABLE|PRIMARY|KEY|NOT|NULL|BIGINT|NUMERIC|VARCHAR)$/
const COMMENT: Record<CodeLang, RegExp> = {
  ts: /\/\/.*$/,
  tsx: /\/\/.*$/,
  java: /\/\/.*$/,
  sql: /--.*$/,
  bash: /(^|\s)#.*$/,
}

export function highlight(line: string, lang: CodeLang): Token[] {
  const tokens: Token[] = []
  const comment = line.match(COMMENT[lang])
  const code = comment ? line.slice(0, comment.index) : line
  const re = /("[^"]*"|'[^']*')|(@\w+|<\/?[A-Z]\w*|\/?>)|(\b\d[\d,.]*\b)|(\b[A-Za-z_]\w*\b)|([^"'@<>/\w]+|.)/g
  for (const m of code.matchAll(re)) {
    if (m[1]) tokens.push({ kind: 'str', text: m[1] })
    else if (m[2]) tokens.push({ kind: 'tag', text: m[2] })
    else if (m[3]) tokens.push({ kind: 'num', text: m[3] })
    else if (m[4]) tokens.push({ kind: KEYWORDS.test(m[4]) ? 'kw' : 'plain', text: m[4] })
    else tokens.push({ kind: 'plain', text: m[0] })
  }
  if (comment) tokens.push({ kind: 'com', text: comment[0] })
  return tokens
}
