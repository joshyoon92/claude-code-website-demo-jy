import { useCallback, useEffect, useState } from 'react'
import About from './components/About'
import ArchitectureIntro from './components/ArchitectureIntro'
import Banner from './components/Banner'
import CommandPalette from './components/CommandPalette'
import Contact from './components/Contact'
import Cursor from './components/Cursor'
import Featured from './components/Featured'
import Hero from './components/Hero'
import Nav from './components/Nav'
import PathMap from './components/PathMap'
import SheetIndex from './components/SheetIndex'
import SoftwareWork from './components/SoftwareWork'
import { featured } from './data/projects'

function App() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [request, setRequest] = useState<{ sheet: string; nonce: number }>()

  // ⌘K / Ctrl+K anywhere, or "/" when not typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest('input, textarea')
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // The sections render after the browser's own jump to #hash, so redo it.
  useEffect(() => {
    if (location.hash) document.querySelector(location.hash)?.scrollIntoView()
  }, [])

  const openProject = useCallback((sheet: string) => setRequest({ sheet, nonce: Date.now() }), [])

  // Software first; architecture follows as the archive.
  return (
    <>
      <Nav onOpenPalette={() => setPaletteOpen(true)} />
      <main>
        <Hero />
        <Banner onOpenProject={openProject} />
        <About />
        <SoftwareWork />
        <ArchitectureIntro />
        {featured.map((project) => (
          <Featured key={project.id} project={project} withModel={project.id === 'shanghai'} />
        ))}
        <SheetIndex request={request} />
        <PathMap />
        <Contact />
      </main>
      <Cursor />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onOpenProject={openProject} />
    </>
  )
}

export default App
