import { contact, skills } from "../data/career";
import { Mark, Rail, Reveal } from "./ui";

export default function About() {
  return (
    <section id="about" className="section about paper">
      <div className="about__copy">
        <Rail index={1} label="About me" />
        <Reveal>
          <h2 className="display">
            From blueprints
            <br />
            <Mark>to backends.</Mark>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="about__lead">
            “I started my career leading and designing $100M+ high-rises as an
            architect.”
          </p>
          <p>
            Today I’m a Senior Software Engineer at JPMorgan Chase in Chicago. I
            own backend architecture and data layers, build full-stack products
            in Java, Spring Boot, React and TypeScript, and design the
            AI-assisted workflows (Claude Code) my teams use to ship faster.
          </p>
          <p>
            Architecture taught me to work from requirements to documents to a
            built result, coordinating many disciplines on a fixed schedule. I
            bring the same habit to software: start from the business
            requirements, design the data model first, and ship something people
            rely on.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <dl className="about__facts">
            <div>
              <dt>Based in</dt>
              <dd>{contact.location}</dd>
            </div>
            <div>
              <dt>Education</dt>
              <dd>M.S. Software Development, Boston University</dd>
              <dd>Bachelor of Architecture, Illinois Tech</dd>
            </div>
            <div>
              <dt>Languages</dt>
              <dd>English, Korean</dd>
            </div>
          </dl>
        </Reveal>

        <Reveal delay={0.2} className="about__skills">
          {Object.entries(skills).map(([group, items]) => (
            <div key={group} className="about__skill-row">
              <span className="rail">{group}</span>
              <div className="about__chips">
                {items.map((s) => (
                  <span key={s} className="chip">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </Reveal>

        <Reveal delay={0.25} className="about__links">
          <a
            className="btn btn--dark"
            href={contact.linkedin}
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn ↗
          </a>
          <a className="btn btn--outline" href="#contact">
            Get in touch
          </a>
        </Reveal>
      </div>
    </section>
  );
}
