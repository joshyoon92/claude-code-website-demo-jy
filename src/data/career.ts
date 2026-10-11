// Software career, education and contact details (from the resume and
// LinkedIn). Architecture projects live in projects.ts.

export type Track = 'architecture' | 'software' | 'education'

export interface CareerStop {
  title: string
  role: string
  track: Track
  years: string
  detail: string
  current?: boolean
}

// Oldest first, matching the resume.
export const career: CareerStop[] = [
  {
    title: 'Illinois Institute of Technology',
    role: 'Bachelor of Architecture',
    track: 'education',
    years: '2010 – May 2015',
    detail: 'Professional architecture degree.',
  },
  {
    title: 'JAHN · Brininstool + Lynch · Gensler',
    role: 'Architect / Project Architect',
    track: 'architecture',
    years: 'Jun 2015 – Jan 2022',
    detail:
      'Designed the Diablos Rojos ballpark in Mexico City with a 10-person design team, and took a 264-unit Chicago residential building through a 19-month construction schedule. Towers, competitions and retail across the US, Canada, Mexico and China.',
  },
  {
    title: 'Boston University',
    role: 'M.S. Software Development',
    track: 'education',
    years: 'Graduated Sep 2021',
    detail: 'Retrained as a software engineer, shipping full-stack React, Firebase and SQL projects along the way.',
  },
  {
    title: 'Integral Ad Science',
    role: 'Software Engineer Intern',
    track: 'software',
    years: 'Jun – Aug 2022',
    detail: 'First engineering role after leaving architecture.',
  },
  {
    title: 'JPMorgan Chase',
    role: 'Software Engineer II',
    track: 'software',
    years: 'Oct 2022 – Jan 2024',
    detail:
      'Owned the production launch of a major release (+80% user journeys, 623 new users) and built an event-driven Python notification service with CI/CD.',
  },
  {
    title: 'JPMorgan Chase',
    role: 'Senior Software Engineer',
    track: 'software',
    years: 'Jan 2024 – Present',
    detail:
      'Backend architecture, data pipelines and full-stack products for supplier risk and management, plus AI-assisted development workflows presented to 100+ developers.',
    current: true,
  },
]

export type SoftwareTag = 'Backend' | 'Frontend' | 'Data' | 'AI'

export interface SoftwareProject {
  id: string
  title: string
  org: string
  summary: string
  metric: { value: string; label: string; prefix?: string; suffix?: string }
  stack: string[]
  tags: SoftwareTag[]
  lead?: boolean
}

export const software: SoftwareProject[] = [
  {
    id: 'ai-workflows',
    title: 'AI-assisted development workflows',
    org: 'JPMorgan Chase',
    summary:
      'Designed Claude Code (Sonnet/Opus) workflows that cut Java backend development time by 50% and React frontend delivery by 70%, then presented the approach to engineering leadership and 100+ developers.',
    metric: { value: '70', prefix: '−', suffix: '%', label: 'frontend delivery time' },
    stack: ['Claude Code', 'Skills', 'Java', 'React'],
    tags: ['AI', 'Backend', 'Frontend'],
    lead: true,
  },
  {
    id: 'risk-platform',
    title: 'Supplier financial-risk platform',
    org: 'JPMorgan Chase',
    summary:
      'Backend for the platform executives use to evaluate external vendors: schema, data dictionary and REST APIs, nightly pipelines ingesting 20K+ supplier records, document storage and external API integrations.',
    metric: { value: '2', suffix: ' mo', label: 'to ship with a team of 3' },
    stack: ['Java', 'Spring Boot', 'REST', 'SQL', 'Claude Code'],
    tags: ['Backend', 'Data', 'AI'],
  },
  {
    id: 'crm',
    title: 'Supplier-management CRM',
    org: 'JPMorgan Chase',
    summary:
      'Built from the ground up, consolidating performance, financial and review data into a single source of truth for 50+ supplier managers and leadership.',
    metric: { value: '120', suffix: 'K+', label: 'suppliers consolidated' },
    stack: ['Java', 'Spring Boot', 'React', 'TypeScript', 'SQL'],
    tags: ['Backend', 'Frontend', 'Data'],
  },
  {
    id: 'ingestion',
    title: 'Incremental supplier ingestion',
    org: 'JPMorgan Chase',
    summary:
      'Redesigned third-party data ingestion from bulk loads to incremental batched processing, for pipelines handling thousands of daily updates.',
    metric: { value: '90', prefix: '−', suffix: '%', label: 'pipeline failure rate' },
    stack: ['Java', 'Batch', 'SQL', 'Control-M'],
    tags: ['Data', 'Backend'],
  },
  {
    id: 'platform',
    title: 'Enterprise employee platform',
    org: 'JPMorgan Chase',
    summary:
      'Owned backend architecture and the data layer, with notifications, auditing and access control. My SQL models and Liquibase migrations became the team’s data standard, and I led the incident response that moved 90%+ of client teams onto the new system.',
    metric: { value: '300', suffix: 'K+', label: 'employee records' },
    stack: ['SQL', 'Liquibase', 'Erwin', 'Java'],
    tags: ['Backend', 'Data'],
  },
  {
    id: 'dashboard',
    title: 'Supplier-ratings dashboard',
    org: 'JPMorgan Chase',
    summary:
      'End to end, from REST endpoints and SQL queries to a Figma-based React UI that leadership uses to assess supplier performance and risk.',
    metric: { value: 'E2E', label: 'REST → SQL → React UI' },
    stack: ['React', 'TypeScript', 'REST', 'SQL', 'Figma'],
    tags: ['Frontend', 'Backend'],
  },
  {
    id: 'release',
    title: 'Major release launch',
    org: 'JPMorgan Chase',
    summary:
      'Owned a production launch and built an event-driven Python notification service with CI/CD, plus reporting across 1,400 applications and 200 customer journeys that surfaced 300 friction points.',
    metric: { value: '80', prefix: '+', suffix: '%', label: 'user journeys' },
    stack: ['Python', 'CI/CD', 'Jenkins'],
    tags: ['Backend', 'Data'],
  },
]

// Built while retraining at Boston University (from LinkedIn).
export const sideProjects = [
  {
    title: 'Anatomy: Building Analysis',
    year: '2020',
    detail: 'A construction cost calculator for architects and contractors. The bridge between both careers.',
    stack: 'Web app',
  },
  { title: 'Amazon Clone', year: '2021', detail: 'Full e-commerce app with a Firebase backend and Stripe payments.', stack: 'React · Firebase · Stripe' },
  { title: 'LinkedIn Clone', year: '2021', detail: 'Social feed with authentication and posts.', stack: 'React · Redux · Firebase' },
  { title: 'Hulu Clone', year: '2021', detail: 'Movie browsing backed by a movie database API.', stack: 'React · Firebase' },
  { title: 'BOSP: E-Commerce App', year: '2021', detail: 'Accounts, login, product selection and purchase history.', stack: 'SQLite' },
  { title: 'Airbnb Clone', year: '2021', detail: 'Main and search pages with date-range booking.', stack: 'React · Material UI' },
]

export const skills: Record<string, string[]> = {
  Languages: ['Java', 'TypeScript', 'JavaScript', 'Python', 'SQL'],
  Frameworks: ['Spring Boot', 'React', 'Node.js', 'REST APIs'],
  'Data & infra': ['Oracle', 'Liquibase', 'Kubernetes', 'Docker', 'Jenkins', 'CI/CD', 'Control-M'],
  'AI tooling': ['Claude Code', 'Skills', 'Agentic AI', 'Jules'],
  Testing: ['JUnit', 'Jest'],
}

export const contact = {
  name: 'Joshua Yoon',
  email: 'joshyoon92@gmail.com',
  linkedin: 'https://www.linkedin.com/in/jtyoon92/',
  location: 'Chicago, Illinois',
}
