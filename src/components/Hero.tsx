import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useRef } from "react";
import cutout from "../assets/portrait-cutout.webp";
import { skills } from "../data/career";
import { EASE, Mark } from "./ui";

const STACK = [
  ...skills.Languages,
  ...skills.Frameworks,
  "Claude Code",
  "Kubernetes",
];

const WORD = "Yoon";

// One letter of the giant name: it rises out of a mask on entry, then drifts
// away from the centre as the section scrolls, opening space around the figure.
function Letter({
  ch,
  i,
  spread,
  show,
  reduce,
}: {
  ch: string;
  i: number;
  spread: MotionValue<number>;
  show: boolean;
  reduce: boolean;
}) {
  const side = i - (WORD.length - 1) / 2; // -1.5, -0.5, 0.5, 1.5
  const x = useTransform(spread, [0, 1], ["0%", `${side * 14}%`]);
  return (
    <span className="hero__letter-clip">
      <motion.span
        className="hero__letter"
        style={{ x }}
        initial={reduce ? false : { y: "105%" }}
        animate={show ? { y: "0%" } : undefined}
        transition={{ duration: 1.1, delay: 0.1 + i * 0.09, ease: EASE }}
      >
        {ch}
      </motion.span>
    </span>
  );
}

// Editorial intro (after the reference layouts): an oversized surname with the
// cut-out portrait standing in front of it, small copy pinned to the corners,
// and a black stats band underneath.
export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const stageRef = useRef<HTMLDivElement>(null);
  // The stage, not the figure: a fully hidden element never counts as in view.
  const show = useInView(stageRef, { once: true, amount: 0.25 }) || !!reduce;

  // Scroll: the name slides and its letters part; the figure rises and grows.
  const still = !!reduce;
  const wordX = useTransform(scrollYProgress, [0, 1], ["5%", still ? "5%" : "-5%"]);
  const spread = useTransform(scrollYProgress, [0.35, 0.85], [0, still ? 0 : 1]);
  const figureY = useTransform(scrollYProgress, [0, 1], ["6%", still ? "6%" : "-6%"]);
  const figureScale = useTransform(scrollYProgress, [0.2, 0.8], [1, still ? 1 : 1.05]);

  // Pointer: the name and the figure shift in opposite directions, so the
  // scene reads as two layers at different depths.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 70, damping: 20 });
  const sy = useSpring(py, { stiffness: 70, damping: 20 });
  const backX = useTransform(sx, [-1, 1], [18, -18]);
  const backY = useTransform(sy, [-1, 1], [10, -10]);
  const figX = useTransform(sx, [-1, 1], [-10, 10]);
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set(((e.clientX - r.left) / r.width) * 2 - 1);
    py.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };
  const onPointerLeave = () => {
    px.set(0);
    py.set(0);
  };

  const rise = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.3 },
    transition: { duration: 0.8, delay, ease: EASE },
  });

  return (
    <section id="top" ref={ref} className="hero">
      <div className="hero__stage" ref={stageRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
        <h1 className="sr-only">Joshua Yoon</h1>
        <motion.p className="hero__kicker" {...rise(0.05)}>
          Software
          <br />
          that ships.
          <br />
          Built like
          <br />
          buildings.
        </motion.p>

        <motion.div className="hero__word" aria-hidden="true" style={{ x: wordX }}>
          <motion.span className="hero__word-inner" style={{ x: backX, y: backY }}>
            {WORD.split("").map((ch, i) => (
              <Letter key={i} ch={ch} i={i} spread={spread} show={show} reduce={still} />
            ))}
          </motion.span>
        </motion.div>

        <motion.div className="hero__figure-wrap" style={{ x: figX }}>
          <motion.img
            className="hero__figure"
            src={cutout}
            alt="Portrait of Joshua Yoon"
            style={{ y: figureY, scale: figureScale }}
            initial={still ? false : { clipPath: "inset(100% 0% 0% 0%)", opacity: 0 }}
            animate={show ? { clipPath: "inset(0% 0% 0% 0%)", opacity: 1 } : undefined}
            transition={{ duration: 1.2, delay: 0.35, ease: EASE }}
          />
        </motion.div>

        {/* Not animated itself: a moving or fading wrapper would cut the
            tagline off from the figure it blends against (see .hero__tagline). */}
        <div className="hero__intro">
          <motion.p className="hero__tagline" {...rise(0.15)}>
            Over seven years designing buildings, from Chicago high-rises to a
            ballpark in Mexico City. <Mark delay={0.8}>Now I build software</Mark>:
            frontend & backend platforms, data pipelines and AI-assisted workflows at JPMorgan
            Chase.
          </motion.p>
          <motion.div className="hero__ctas" {...rise(0.15)}>
            <a href="#projects" className="btn btn--solid">
              See engineering work
            </a>
            <a href="#architecture" className="link-arrow">
              Architecture archive
            </a>
          </motion.div>
        </div>

        <motion.p className="hero__now" {...rise(0.25)}>
          <span className="live-dot" aria-hidden="true" /> Now
          <br />
          Senior Software
          <br />
          Engineer
          <br />
          JPMorgan Chase
        </motion.p>

        <span className="hero__scroll" aria-hidden="true">
          Scroll
        </span>
      </div>

      <div className="hero__band band">
        <dl className="hero__stats">
          <div>
            <dt>Engineering</dt>
            <dd>2022–now</dd>
          </div>
          <div>
            <dt>Architecture</dt>
            <dd>2015–22</dd>
          </div>
          <div>
            <dt>AI dev speed-up</dt>
            <dd>+300%</dd>
          </div>
        </dl>
        <div className="hero__ticker" aria-label="Stack">
          <span className="rail">Stack</span>
          <ul>
            {STACK.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
