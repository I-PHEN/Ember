"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useScroll, useSpring, useMotionValueEvent, useReducedMotion } from "framer-motion";
import { galleryScene } from "@/lib/gallery-presentation";

const phrases = ["Find a question like yours.", "Explore a shared lesson.", "Return when you need it."];
export default function CommunityJourney() {
  const host = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: host, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 180, damping: 38 });
  const [progress, setProgress] = useState(0);
  useMotionValueEvent(smooth, "change", value => { if (reduced === false) setProgress(value); });
  const cursor = galleryScene(progress);
  const moving = reduced === false;
  return <section ref={host} className={`community-journey ${moving ? "community-animated" : ""}`} aria-label="Discover the community gallery">
    <div className="community-pin landing-width">
      <div className="section-intro"><p className="landing-eyebrow">Questions worth sharing</p><h2>Your question might<br /><span>already have a lesson.</span></h2><p>Explore questions others have worked through with Ember. Find a useful explanation, watch it, and come back when you need another look.</p><Link href="/gallery" className="benefits-link">Explore the community gallery <ArrowRight size={14} /></Link></div>
      <div className="community-text-scene">
        {phrases.map((phrase, index) => {
          const settled = !moving || index < cursor.segment ? 1 : index === cursor.segment ? cursor.contact : 0;
          return <motion.p className={`community-phrase community-phrase-${index}`} key={phrase} style={{ x: (1 - settled) * (index === 1 ? 30 : -24), y: (1 - settled) * 22, rotate: (1 - settled) * (index === 1 ? -2 : 2), opacity: .6 + settled * .4 }}><span>{phrase}<motion.i aria-hidden="true" style={{ scaleX: settled, transformOrigin: "left" }} /></span></motion.p>;
        })}
        {moving && <svg className="community-cursor" viewBox="0 0 32 40" aria-hidden="true" style={{ transform: `translate(${cursor.x}cqw, ${cursor.y}cqh)` }}><path d="M0 0L8 31L15 21L27 24Z" fill="#f4f4f6" stroke="#0b0d10" strokeWidth="2" /></svg>}
      </div>
    </div>
  </section>;
}
