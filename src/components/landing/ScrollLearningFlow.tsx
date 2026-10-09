"use client";
import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { cursorAt, scrollWalkthroughProgress, WALKTHROUGH_STAGES } from "@/lib/product-walkthrough";
import { StudioTourScene } from "./ProductWalkthrough";

export default function ScrollLearningFlow() {
  const host = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: host, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 180, damping: 38, restDelta: .001 });
  const [progress, setProgress] = useState(0);
  useMotionValueEvent(smooth, "change", value => { if (reduced === false) setProgress(value); });
  const cursor = cursorAt(progress);
  const descriptions = ["Bring your question.", "See a lesson take shape.", "Follow the reasoning.", "Go deeper on a step."];
  if (reduced !== false) return <section ref={host} className="landing-width static-learning-flow"><h2>From your question to understanding.</h2><div>{WALKTHROUGH_STAGES.map((label, index) => <article key={label}><h3>{label}</h3><p>{descriptions[index]}</p></article>)}</div></section>;
  return <section className="scroll-learning-flow" ref={host} aria-label="Scroll-driven product journey">
    <div className="scroll-flow-pin landing-width"><div className="scroll-flow-heading"><p className="landing-eyebrow">Your question. Your pace.</p><h2>See how a lesson unfolds.</h2><p>Scroll to explore. Scroll back to revisit.</p></div>
      <div className="scroll-flow-targets">{WALKTHROUGH_STAGES.map((label, index) => {
        const settled = index < cursor.segment ? 1 : index === cursor.segment ? cursor.contact : 0;
        return <motion.div className="scroll-flow-target" key={label} style={{ x: (1 - settled) * (index % 2 ? 24 : -24), y: (1 - settled) * 22, rotate: (1 - settled) * (index % 2 ? 2 : -2), opacity: .55 + settled * .45 }}><span>{String(index + 1).padStart(2, "0")}</span><strong>{label}</strong><small>{descriptions[index]}</small><motion.i style={{ scaleX: settled, transformOrigin: "left" }} /></motion.div>;
      })}<svg className="scroll-fake-cursor" style={{ transform: `translate(${cursor.x / 10}cqw, ${cursor.y / 3.9}cqh)` }} viewBox="0 0 32 40" aria-hidden="true"><path d="M0 0L8 31L15 21L27 24Z" fill="#f4f4f6" stroke="#0b0d10" strokeWidth="2" /><circle cx="0" cy="0" r="13" transform={`scale(${.3 + cursor.contact * .7})`} fill="none" stroke="#e6b784" opacity={cursor.contact * .7} /></svg></div>
      <div className="scroll-flow-screen"><StudioTourScene progress={scrollWalkthroughProgress(progress)} /></div>
      <p className="landing-caption">Prepared walkthrough. Scrolling controls every stage; no lesson is generated here.</p>
    </div>
  </section>;
}
