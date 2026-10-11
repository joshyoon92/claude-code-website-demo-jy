import { Rail, Reveal } from './ui'

// Divider inside Projects that opens the architecture archive.
export default function ArchitectureIntro() {
  return (
    <section id="architecture" className="section arch-intro">
      <Reveal>
        <Rail label="Projects · Architecture archive · 2015–2025" />
        <h2 className="display">Before the code: buildings.</h2>
        <p className="section__lede">
          Eleven projects across JAHN, Brininstool + Lynch, Gensler and Tom Lee Studio: towers, a stadium,
          competitions and retail in four countries. The same discipline (requirements, systems, documentation,
          delivery) now goes into software.
        </p>
      </Reveal>
    </section>
  )
}
