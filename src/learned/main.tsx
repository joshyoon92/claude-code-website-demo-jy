import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { trackVisit } from '../track.ts'
import LearnedApp from './LearnedApp.tsx'

trackVisit()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LearnedApp />
  </StrictMode>,
)
