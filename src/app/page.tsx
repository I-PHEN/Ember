"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, MessageSquare, RotateCcw } from "lucide-react";
import Wordmark from "@/components/Wordmark";
import { useAuth } from "@/lib/firebase/auth-context";
import ProductWalkthrough from "@/components/landing/ProductWalkthrough";
import ScrollLearningFlow from "@/components/landing/ScrollLearningFlow";
import LearningComparison from "@/components/landing/LearningComparison";

const STARTERS = [
  { label: "Matrices", prompt: "Explain matrix dimensions and how to locate an entry." },
  { label: "Integration by parts", prompt: "Evaluate ∫ x · e^(2x) dx using integration by parts." },
  { label: "Forces on an incline", prompt: "Explain the forces on a 5 kg block on a 30 degree incline with friction." },
];
export default function LandingPage() {
  const { user, loading, openAuthModal } = useAuth();
  const [prompt, setPrompt] = useState("");
  const launch = () => {
    const question = prompt.trim();
    const target = question ? `/studio?prompt=${encodeURIComponent(question)}` : "/studio";
    if (user) window.location.assign(target);
    else openAuthModal(() => window.location.assign(target));
  };
  return <main className="ember-landing">
    <header className="landing-nav"><Link href="/" aria-label="Ember home"><Wordmark /></Link><nav aria-label="Main navigation"><Link href="#comparison">Why Ember</Link><Link href="/gallery">Gallery</Link><button className="landing-outline" disabled={loading} onClick={launch}>Open studio <ArrowRight size={14} /></button></nav></header>
    <section className="landing-hero landing-width">
      <div className="hero-copy">
        <p className="landing-eyebrow"><span className="ember-dot" /> Your question, taught on a blackboard.</p>
        <h1>Understand the steps.<br /><span className="font-hand">Not just the answer.</span></h1>
        <p className="hero-description">A lesson that writes, explains, and makes room for your questions. Follow the reasoning—and return to the step you need.</p>
        <form className="landing-composer" onSubmit={event => { event.preventDefault(); launch(); }}>
          <label htmlFor="lesson-question">What are you working on?</label><textarea id="lesson-question" value={prompt} onChange={event => setPrompt(event.target.value)} rows={2} placeholder="Paste a STEM problem or ask about a concept…" />
          <div className="composer-bottom"><span>Introductory university STEM</span><button className="landing-primary" disabled={loading} type="submit">Create a lesson <ArrowRight size={15} /></button></div>
        </form>
        <div className="landing-starters"><span>Try a question</span>{STARTERS.map(starter => <button key={starter.label} onClick={() => setPrompt(starter.prompt)}>{starter.label}</button>)}</div>
        <p className="landing-caption">Sign in to create and save lessons.</p>
      </div>
      <div className="hero-lesson"><ProductWalkthrough /></div>
    </section>
    <ScrollLearningFlow />
    <LearningComparison />
    <section className="landing-width current-benefits"><div className="section-intro"><p className="landing-eyebrow">Built for the way you learn</p><h2>A lesson you can work with.</h2></div><div className="benefits-grid"><article><BookOpen size={21} /><h3>Follow the reasoning</h3><p>See the derivation take shape on a board, with an explanation alongside it.</p></article><article><RotateCcw size={21} /><h3>Return to a step</h3><p>Pause, change speed, and use chapters to revisit the part that needs another look.</p></article><article><MessageSquare size={21} /><h3>Ask the next question</h3><p>Ask Ember to clarify a step or adjust the explanation without leaving the lesson.</p></article></div><Link className="benefits-link" href="/how-it-works">How Ember builds a lesson <ArrowRight size={14} /></Link></section>
    <footer className="landing-footer landing-width"><Wordmark /><span>Every problem, a lesson.</span><Link href="/how-it-works">How it works</Link><Link href="/gallery">Gallery</Link></footer>
  </main>;
}
