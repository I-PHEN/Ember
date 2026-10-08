"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Play, Check, GitBranch } from "lucide-react";
import Wordmark from "@/components/Wordmark";
import { useAuth } from "@/lib/firebase/auth-context";
import LessonPreview from "@/components/landing/LessonPreview";

const STARTERS = [
  { label: "Matrices", prompt: "Explain matrix dimensions and how to locate an entry." },
  { label: "Integration by parts", prompt: "Evaluate ∫ x · e^(2x) dx using integration by parts." },
  { label: "Forces on an incline", prompt: "Explain the forces on a 5 kg block on a 30 degree incline with friction." },
];
export default function LandingPage() {
  const { user, loading, openAuthModal } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [chapter, setChapter] = useState({ index: 0, n: 0 });
  const launch = (question = prompt.trim()) => {
    const target = question ? `/studio?prompt=${encodeURIComponent(question)}` : "/studio";
    if (user) window.location.assign(target);
    else openAuthModal(() => window.location.assign(target));
  };
  const revisit = (index: number) => {
    setChapter(previous => ({ index, n: previous.n + 1 }));
    document.getElementById("lesson-preview")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
  };
  return <main className="ember-landing">
    <header className="landing-nav"><Link href="/" aria-label="Ember home"><Wordmark /></Link><nav aria-label="Main navigation"><Link href="#comparison">Why Ember</Link><Link href="/gallery">Gallery</Link><button className="landing-outline" disabled={loading} onClick={() => launch()}>Open studio <ArrowRight size={14} /></button></nav></header>
    <section className="landing-hero landing-width">
      <div className="hero-copy">
        <p className="landing-eyebrow"><span className="ember-dot" /> A blackboard. A voice. Your next breakthrough.</p>
        <h1>Understand the steps.<br /><span className="font-hand">Not just the answer.</span></h1>
        <p className="hero-description">Turn a STEM question into a lesson you can follow. Watch the reasoning take shape, hear each step, and come back to the part that clicks.</p>
        <form className="landing-composer" onSubmit={event => { event.preventDefault(); launch(); }}>
          <label htmlFor="lesson-question">What are you working on?</label><textarea id="lesson-question" value={prompt} onChange={event => setPrompt(event.target.value)} rows={2} placeholder="Paste a problem or ask about a concept…" />
          <div className="composer-bottom"><span>Introductory university STEM</span><button className="landing-primary" disabled={loading} type="submit">Create a lesson <ArrowRight size={15} /></button></div>
        </form>
        <div className="landing-starters"><span>Try a question</span>{STARTERS.map(starter => <button key={starter.label} onClick={() => setPrompt(starter.prompt)}>{starter.label}</button>)}</div>
        <p className="landing-caption">Sign in to create and save lessons. The preview is open to everyone.</p>
      </div>
      <div className="hero-lesson" id="lesson-preview"><div className="lesson-heading"><span className="landing-eyebrow">Inside Ember</span><span className="landing-caption">Real player · recorded narration</span></div><LessonPreview requestedChapter={chapter} onSelectChapter={index => setChapter(previous => ({ index, n: previous.n + 1 }))} /><p className="preview-note"><Play size={13} /> Press play. Pause, change speed, or revisit a chapter.</p></div>
    </section>
    <section id="comparison" className="landing-width comparison-section">
      <div className="section-intro"><p className="landing-eyebrow">Same question. Different learning experience.</p><h2>A response you read.<br /><span>A lesson you can return to.</span></h2><p>Chat models can explain steps, too. Ember is built around a different format: a narrated board with a timeline you control.</p></div>
      <div className="comparison-grid">
        <article className="comparison-card chat-example"><div className="comparison-label"><span>Generic chat format</span><span className="landing-caption">Illustrative response</span></div><div className="example-question">How do I read a matrix and find A<sub>23</sub>?</div><div className="chat-answer"><p>A matrix is a rectangular array of numbers. For example:</p><div className="typeset-matrix" aria-label="A equals a matrix with rows 2, 7, negative 4 and 6, 3, 5"><span>A =</span><div><span>2</span><span>7</span><span>−4</span><span>6</span><span>3</span><span>5</span></div></div><p>There are two rows and three columns, so its dimensions are 2 × 3.</p><p>The first subscript gives the row; the second gives the column. A<sub>23</sub> is in row 2, column 3, so A<sub>23</sub> = 5.</p></div><p className="comparison-footnote">Useful when you want a written explanation to scan.</p></article>
        <article className="comparison-card ember-example"><div className="comparison-label"><span>Ember lesson format</span><span className="landing-caption">Try the player above</span></div><h3>Follow it. Stop it.<br /><span className="font-hand">Make sense of it.</span></h3><p>The same matrix stays on the board while the explanation moves from its shape to a specific entry.</p><div className="comparison-chapters"><button onClick={() => revisit(0)}><span className="chapter-mark">01</span><span>Read the dimensions<small>Rows first, then columns</small></span><ArrowRight size={16} /></button><button onClick={() => revisit(1)}><span className="chapter-mark">02</span><span>Locate an entry<small>Follow row 2 to column 3</small></span><ArrowRight size={16} /></button></div><p className="comparison-footnote"><Check size={14} /> Narrated writing · pause and seek · playback speed</p></article>
      </div>
      <div className="architecture-note"><GitBranch size={19} /><p><strong>One lesson, coordinated behind the scenes.</strong> Ember separates solving, lesson planning, board writing, and review—then brings the board and voice together on one timeline.</p><Link href="/how-it-works">How it works <ArrowRight size={14} /></Link></div>
    </section>
    <section className="landing-width learning-roadmap"><div className="section-intro"><p className="landing-eyebrow">Where we’re going</p><h2>Different stages.<br /><span>The same room to understand.</span></h2><p>We’re starting with university STEM. The longer-term aim is to adapt the pace, examples, and depth to the learner—not just simplify the words.</p></div><div className="roadmap-grid">
      <article><span className="roadmap-status">Planned</span><h3>Young learners</h3><p>Concrete pictures and small steps. Build intuition before introducing formal notation.</p><span className="roadmap-example">From counting to patterns</span></article>
      <article><span className="roadmap-status">Planned</span><h3>High school</h3><p>Connect diagrams, equations, and worked examples. Make space to predict the next step.</p><span className="roadmap-example">From formulas to understanding</span></article>
      <article className="roadmap-current"><span className="roadmap-status">Current focus</span><h3>University</h3><p>Introductory STEM with explicit assumptions, connected derivations, and reasoning you can revisit.</p><span className="roadmap-example">From a problem to its reasoning</span></article>
    </div><p className="landing-caption roadmap-disclaimer">This is our direction, not a claim of measured learning gains. School-age experiences are not yet available.</p></section>
    <footer className="landing-footer landing-width"><Wordmark /><span>Every problem, a lesson.</span><Link href="/how-it-works">How it works</Link><Link href="/gallery">Gallery</Link></footer>
  </main>;
}
