import type { ReactNode } from 'react'

// 18px line icons shared by the header and footer (LinkedIn is its filled brand mark).
const Icon = ({ children }: { children: ReactNode }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    {children}
  </svg>
)
export const SearchIcon = () => (
  <Icon>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" strokeLinecap="round" />
  </Icon>
)
export const ResumeIcon = () => (
  <Icon>
    <path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z" strokeLinejoin="round" />
    <path d="M13.5 3.5V8H18M10 13h5M10 16.5h5" strokeLinecap="round" />
  </Icon>
)
export const MailIcon = () => (
  <Icon>
    <rect x="3.5" y="5.5" width="17" height="13" />
    <path d="m4 6.5 8 6 8-6" strokeLinejoin="round" />
  </Icon>
)
export const LinkedInIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
  </svg>
)

export const PinIcon = () => (
  <Icon>
    <path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" strokeLinejoin="round" />
    <circle cx="12" cy="10" r="2.3" />
  </Icon>
)
export const ArrowUpIcon = () => (
  <Icon>
    <path d="M12 19V5M6 11l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
)
