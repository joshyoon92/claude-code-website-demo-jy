const diablosImages = import.meta.glob<string>(
  '../../images/Diablos - Baseball stadium/*.{jpg,JPG}',
  { eager: true, import: 'default' },
)
const shanghaiImages = import.meta.glob<string>(
  '../../images/Shanghai Financial Exchange Plaza Shanghai China 2020/*.jpg',
  { eager: true, import: 'default' },
)

// Put the named file first, keep the rest in glob order.
function ordered(images: Record<string, string>, leadFile: string): string[] {
  const entries = Object.entries(images)
  const lead = entries.find(([path]) => path.endsWith(leadFile))
  const rest = entries.filter(([path]) => !path.endsWith(leadFile))
  return [lead, ...rest].filter(Boolean).map((entry) => entry![1])
}

export interface Media {
  src: string
  kind: 'photo' | 'drawing'
  caption: string
}

// Images pulled from the portfolio PDF, one folder per project.
// File names follow "NN-<photo|drawing>-<caption-slug>.jpg".
const portfolioFiles = import.meta.glob<string>('../../images/portfolio/*/*.jpg', {
  eager: true,
  import: 'default',
})
const portfolio: Record<string, Media[]> = {}
for (const [path, src] of Object.entries(portfolioFiles).sort(([a], [b]) => a.localeCompare(b))) {
  const [, folder, file] = path.match(/portfolio\/([^/]+)\/(.+)\.jpg$/)!
  const [, kind, slug] = file.match(/^\d+-(photo|drawing)-(.+)$/)!
  const caption = slug.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
  ;(portfolio[folder] ??= []).push({ src, kind: kind as Media['kind'], caption })
}
export const mediaFor = (folder: string): Media[] => portfolio[folder] ?? []

const photos = (srcs: string[], caption: string): Media[] =>
  srcs.map((src) => ({ src, kind: 'photo', caption }))

export type Status = 'Completed' | 'Under Construction' | 'Design' | 'Competition'

interface ProjectData {
  sheet: string
  folder: string
  name: string
  location: string
  firm: string
  status: Status
  year?: string
  program: string
  role: string
  summary: string
  facts?: { label: string; value: string }[]
}

export interface Project extends ProjectData {
  media: Media[]
}

export interface FeaturedProject {
  id: string
  sheet: string
  name: string
  subtitle: string
  location: string
  year: string
  images: Media[]
  quote?: { text: string; by: string }
  body: string[]
  contribution: string
  stats: { label: string; value: string; unit?: string }[]
  facts: { label: string; value: string }[]
  awards: string[]
}

const projectData: ProjectData[] = [
  {
    sheet: 'A-101',
    folder: 'demeter',
    name: 'Demeter 4.Zero',
    location: 'Woodridge, Illinois',
    firm: 'Tom Lee Studio',
    status: 'Under Construction',
    year: '2024–25',
    program: '2-story manufacturing · 54,371 GSF',
    role: 'SD · DD · CD',
    summary:
      'A two-story facility integrating functionality with a modern industrial aesthetic. Worked through Schematic Design, Design Development and Construction Documentation, refining spatial organization, technical detailing and code compliance from concept to build-ready set.',
  },
  {
    sheet: 'A-102',
    folder: 'wolcott',
    name: 'Wolcott House',
    location: 'Chicago, Illinois',
    firm: 'Tom Lee Studio',
    status: 'Design',
    year: '2024–25',
    program: '2 stories + basement · 4,227 SF',
    role: 'Project Architect · SD · DD',
    summary:
      'A three-level residence balancing contemporary living with contextual character. Focused on spatial layout, material selection and façade articulation within a compact footprint.',
  },
  {
    sheet: 'A-201',
    folder: 'cambridge',
    name: 'Chick-fil-A Cambridge',
    location: 'Cambridge, Ontario',
    firm: 'Gensler',
    status: 'Completed',
    year: '2021',
    program: 'Free-standing restaurant · 451 m² · 96 seats',
    role: 'Project Architect · SD · DD · CD',
    summary:
      'A single-storey restaurant on the P13 LE template, tuned for high-volume service and drive-through efficiency, adapted to local zoning and the Ontario Building Code while keeping brand design integrity.',
  },
  {
    sheet: 'A-202',
    folder: 'appleby',
    name: 'Chick-fil-A Appleby',
    location: 'Burlington, Ontario',
    firm: 'Gensler',
    status: 'Completed',
    year: '2021',
    program: 'Free-standing restaurant · P13 SE Large',
    role: 'Project Architect',
    summary:
      'A single-storey restaurant on the P13 SE Large prototype with a drive-through layout, keeping flexibility in kitchen planning and seating for site conditions. Adapted the prototype to Ontario’s washroom and accessibility codes while preserving the brand’s operational efficiency and design identity.',
  },
  {
    sheet: 'A-301',
    folder: 'ada',
    name: '180 N Ada',
    location: 'Chicago, Illinois',
    firm: 'Brininstool + Lynch',
    status: 'Completed',
    year: '2019',
    program: '14-story residential · 263 units · 300,680 SF',
    role: 'Project Architect · PD · SD · DD · CD · CA',
    summary:
      'The Mason, a contemporary reinterpretation of Chicago’s exposed structural frame construction in the growing West Loop. The design acknowledges the area’s traditional industrial architecture while providing the amenities expected of new residential development, including a fitness center, shared office and bar. Led the Planned Development process with CDOT, CFD and MOPD, then carried the project through SD, DD, CD and CA. Construction finished late 2019.',
    facts: [
      { label: 'Firm role', value: 'Design Architect · Architect of Record · Interior Designer' },
      {
        label: 'Consultants',
        value:
          'SCA Consulting Engineers (Structural), Cosentini Associates (MEPFP), Eriksson Engineering (Civil), Shiner Acoustics (Acoustics)',
      },
      { label: 'Contractor', value: 'Power Construction' },
    ],
  },
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
  {
    sheet: 'A-303',
    folder: 'grand',
    name: '369 West Grand',
    location: 'Chicago, Illinois',
    firm: 'Brininstool + Lynch',
    status: 'Completed',
    year: '2021',
    program: '41-story residential · 356 units · 533,000 SF',
    role: 'Concept design · City approvals',
    summary:
      'A sleek, streamlined residential tower in Chicago’s River North. Amenity-rich floors and highly detailed units make everyday living feel like a stay in a high-end hotel. Developed the initial tower schemes; the grid concept was selected to move forward. Worked with the client, their counsel and City Hall to get through initial city approval.',
    facts: [
      { label: 'Firm role', value: 'Design Architect · Architect of Record' },
      {
        label: 'Consultants',
        value:
          'C.E. Anderson & Associates (Structural), Cosentini Associates (MEPFP), Eriksson Engineering (Civil), Daniel Weinbach & Partners (Landscape)',
      },
      { label: 'Contractor', value: 'Onni Group' },
    ],
  },
  {
    sheet: 'A-304',
    folder: 'southloop',
    name: 'South Loop Complex',
    location: 'Chicago, Illinois',
    firm: 'Brininstool + Lynch',
    status: 'Competition',
    program: '3 high-rises · 836 units · retail',
    role: 'Finalist (1 of 7) · team of 2',
    summary:
      'A multi-phased residential complex with commercial at grade. A two-person team with the partner designed, documented, modeled, rendered and diagrammed the entire scheme in 2.5 weeks.',
  },
  {
    sheet: 'A-401',
    folder: 'shanghai',
    name: 'Shanghai Financial Center',
    location: 'Shanghai, China',
    firm: 'JAHN',
    status: 'Completed',
    year: '2020',
    program: '3 office towers · 406,000 m²',
    role: 'CD · Interior package',
    summary:
      'Three headquarters towers joined by a 130 m sky bridge. Responsible for construction development and the interior package: plans, sections, interior elevations and details.',
  },
  {
    sheet: 'A-402',
    folder: 'diablos',
    name: 'Diablos Rojos Stadium',
    location: 'Mexico City, Mexico',
    firm: 'JAHN',
    status: 'Completed',
    year: '2019',
    program: '20,000-seat ballpark · 80,000 m²',
    role: 'DD · CD',
    summary:
      'The first stadium built in Mexico City in 50 years. Responsible for partial plans and sections of the VIP boxes and crowd seating, interior elevations, wall sections and details.',
  },
  {
    sheet: 'A-403',
    folder: 'shenzhen',
    name: 'Shenzhen Convention Center',
    location: 'Shenzhen, China',
    firm: 'JAHN',
    status: 'Competition',
    program: 'Convention masterplan · hotel · office · retail',
    role: 'Modeling · Elevations · Diagrams',
    summary:
      'A masterplan for a convention center supported by hotels, offices and retail. Modeled the retail component for rendering and produced convention center elevations, site sections and diagrams.',
  },
]

export const projects: Project[] = projectData.map((p) => ({ ...p, media: mediaFor(p.folder) }))

export const featured: FeaturedProject[] = [
  {
    id: 'diablos',
    sheet: 'A-402',
    name: 'Diablos Rojos',
    subtitle: 'Alfredo Harp Helú Stadium',
    location: 'Mexico City, Mexico',
    year: '2019',
    images: [
      ...photos(ordered(diablosImages, 'FGP-ATELIER-DIABLOS-4.jpg'), 'Photograph'),
      ...mediaFor('diablos'),
    ],
    quote: {
      text: 'Emerging as the new distinctive landmark of Mexico City and being the first stadium to be built in the capital in the last 50 years.',
      by: 'Francisco Rojas, Director of CDAHH',
    },
    body: [
      'As we stand, silent and in shadow, the crosswind subtly reminding us we are outside, the stadium tells us of its roots and transports us with an unexpected feeling of transparency and openness.',
      'It is designed to express the many layers of a vast metropolis steeped in a rich culture, connecting to its people, rewriting a new future after every game.',
    ],
    contribution:
      'Design Development and Construction Documents: partial plans and sections of the VIP boxes and crowd seating, interior elevations, wall sections and details.',
    stats: [
      { label: 'Seats', value: '20,000' },
      { label: 'Area', value: '80,000', unit: 'm²' },
      { label: 'Cost', value: '150', unit: 'M USD' },
      { label: 'Years since last', value: '50' },
    ],
    facts: [
      { label: 'Client', value: 'Alfredo Harp Helú' },
      { label: 'Design Architect', value: 'Atelier FGP + Taller ADG' },
      { label: 'Consultants', value: 'Werner Sobek, Populous, RWDI, Musco +9' },
    ],
    awards: [
      '2020 American Architecture Awards',
      'Re-Thinking The Future Awards',
      'Blueprint Awards',
      'Architecture MasterPrize',
      'Golden Trezzini Awards',
    ],
  },
  {
    id: 'shanghai',
    sheet: 'A-401',
    name: 'Shanghai Financial Center',
    subtitle: 'Shanghai Financial Exchange Plaza',
    location: 'Shanghai, China',
    year: '2020',
    images: [
      ...photos(ordered(shanghaiImages, '1660751163465.jpg'), 'Photograph · Qingyan Zhu'),
      ...mediaFor('shanghai'),
    ],
    body: [
      'Three towers (the Shanghai Stock Exchange, China Futures Exchange and China Securities Clearing) each retain their own identity while becoming part of a whole, organized around a central plaza anchored by a sunken Financial Theatre.',
      'A reflecting pool forms the theatre roof. High above, a 130-meter bridge ties the towers together and hosts exhibition space, a training center, a media center and a roof garden.',
    ],
    contribution:
      'Construction development and the interior package: updating plans, sections, interior elevations and details.',
    stats: [
      { label: 'Height', value: '230', unit: 'm' },
      { label: 'Floors', value: '31' },
      { label: 'Area', value: '406,000', unit: 'm²' },
      { label: 'Sky bridge', value: '130', unit: 'm' },
    ],
    facts: [
      { label: 'Type', value: 'Headquarters · Office' },
      { label: 'Certification', value: 'LEED Gold' },
      { label: 'Collaborators', value: 'JAHN + Atelier FGP' },
      { label: 'Photography', value: 'Qingyan Zhu' },
    ],
    awards: [
      'CTBUH Best Tall Building, 200–299 m',
      'Chicago Athenaeum International Architecture Award',
    ],
  },
  {
    id: 'grand',
    sheet: 'A-303',
    name: '369 West Grand',
    subtitle: 'River North residential tower',
    location: 'Chicago, Illinois',
    year: '2021',
    images: mediaFor('grand'),
    body: [
      'A sleek, elegant and streamlined tower of living that sets the standard for urban dwellers in Chicago’s River North.',
      'With amenity-rich floors and highly detailed units, residents enjoy everyday living as if on vacation in a high-end hotel.',
    ],
    contribution:
      'Concept design and city approvals: developed the initial tower schemes, from which the grid concept was selected to move forward, then worked with the client, their counsel and City Hall through initial city approval.',
    stats: [
      { label: 'Floors', value: '41' },
      { label: 'Units', value: '356' },
      { label: 'Area', value: '533,000', unit: 'SF' },
      { label: 'Completed', value: '2021' },
    ],
    facts: [
      { label: 'Firm', value: 'Brininstool + Lynch · Design Architect, Architect of Record' },
      { label: 'Contractor', value: 'Onni Group' },
      {
        label: 'Consultants',
        value: 'C.E. Anderson & Associates, Cosentini Associates, Eriksson Engineering, Daniel Weinbach & Partners',
      },
    ],
    awards: [],
  },
]

