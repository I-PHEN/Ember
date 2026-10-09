"use client";
import { useState } from "react";
import { Play, Check, MessageSquare } from "lucide-react";
import SolvePlayer from "@/components/player/SolvePlayer";
import { TOUR_LESSON } from "@/lib/product-walkthrough";

export default function LearningComparison() {
  const [view, setView] = useState<"watch" | "complete" | "why">("complete");
  const [replay, setReplay] = useState(0);
  const choose = (next: typeof view) => { setView(next); setReplay(value => value + 1); };
  return <section id="comparison" className="landing-width comparison-section">
    <div className="section-intro"><p className="landing-eyebrow">Same idea. A different way in.</p><h2>Don’t just read the step.<br /><span>Work through it.</span></h2><p>A written answer is useful. A lesson gives you somewhere to pause, revisit, and ask why. Try one small step below.</p></div>
    <div className="comparison-workspace">
      <div className="comparison-shared-question"><span>The question</span><p>For ∫ x · e<sup>2x</sup> dx, why choose u = x?</p></div>
      <div className="comparison-learning-grid">
      <article className="comparison-reading"><div className="comparison-label"><span>Read it</span><span className="landing-caption">Illustrative example</span></div><div className="chat-answer"><p>Choose u = x. Differentiating x makes it simpler:</p><div className="comparison-equations"><p>u = x → du = dx</p></div><p>With dv = e<sup>2x</sup> dx, this removes x from the remaining integral when we apply ∫ u dv = uv − ∫ v du.</p></div><p className="comparison-footnote">Useful when you want an explanation to scan.</p></article>
      <article className="comparison-board">
        <div className="comparison-label"><span>Explore it in Ember</span><span className="landing-caption">Real player · silent excerpt</span></div>
        <div className="comparison-actions" aria-label="Explore the lesson step">
          <button onClick={() => choose("watch")} aria-pressed={view === "watch"}><Play size={14} />Watch the step</button>
          <button onClick={() => choose("complete")} aria-pressed={view === "complete"}><Check size={14} />See it complete</button>
          <button onClick={() => choose("why")} aria-pressed={view === "why"}><MessageSquare size={14} />Why this choice?</button>
        </div>
        <SolvePlayer key={replay} script={TOUR_LESSON} themeId="blackboard" showChapterLabel={false} autoPlay={view === "watch"} seekRequest={view === "watch" ? null : { t: 14, n: replay }} />
        <div className="comparison-response" aria-live="polite">{view === "why" ? <><span className="landing-eyebrow">Prepared follow-up example</span><p>Differentiating x gives 1, while integrating e<sup>2x</sup> stays straightforward. That makes the next integral simpler. Choosing the exponential as u instead would increase the power of x.</p></> : <p>{view === "watch" ? "Follow the writing, then pause or drag the timeline to revisit a moment." : "The completed step stays on the board. Replay it, or explore why this choice helps."}</p>}</div>
      </article>
      </div>
    </div>
    <p className="comparison-honesty">Chat models can teach steps too. Ember’s difference is a coordinated lesson: board, voice, chapters, and follow-up questions in one workspace.</p>
  </section>;
}
