"use client";
import { useState } from "react";
import { Play, RotateCcw, MessageSquare } from "lucide-react";
import SolvePlayer from "@/components/player/SolvePlayer";
import { TOUR_LESSON } from "@/lib/product-walkthrough";

export default function LearningComparison() {
  const [view, setView] = useState<"follow" | "revisit" | "why">("revisit");
  const [replay, setReplay] = useState(0);
  const choose = (next: typeof view) => { setView(next); setReplay(value => value + 1); };
  return <section id="comparison" className="landing-width comparison-section">
    <div className="section-intro"><p className="landing-eyebrow">The answer is only the beginning</p><h2 id="comparison-heading" tabIndex={-1}>Getting an answer<br /><span>vs understanding the step.</span></h2><p>Same problem. One gives you a result to read. The other gives you a decision to explore.</p></div>
    <div className="comparison-workspace">
      <div className="comparison-shared-question"><span>The question</span><p>Evaluate ∫ x · e<sup>2x</sup> dx using integration by parts.</p></div>
      <div className="comparison-learning-grid">
      <article className="comparison-reading"><div className="comparison-label"><span>Worked answer</span><span className="landing-caption">Read and check</span></div>
        <div className="chat-answer">
          <p className="landing-eyebrow">The result</p>
          <div className="comparison-result">½xe<sup>2x</sup> − ¼e<sup>2x</sup> + C</div>
          <h3>Choose what gets simpler.</h3>
          <p>Choose u = x because its derivative is 1. The exponential stays easy to integrate.</p>
          <div className="comparison-equations"><p>u = x → du = dx</p><p>dv = e<sup>2x</sup> dx → v = ½e<sup>2x</sup></p></div>
          <h3>Substitute, then integrate.</h3>
          <p>Using ∫ u dv = uv − ∫ v du leaves a simpler integral without the factor of x.</p>
          <div className="comparison-equations"><p>½xe<sup>2x</sup> − ∫ ½e<sup>2x</sup> dx</p></div>
        </div><p className="comparison-footnote">The reasoning is here. You choose how to read it.</p>
      </article>
      <article className="comparison-board">
        <div className="comparison-label"><span>Explore it in Ember</span><span className="landing-caption">Real player · silent excerpt</span></div>
        <div className="comparison-actions" aria-label="Prepared lesson moments">
          <button onClick={() => choose("follow")} aria-pressed={view === "follow"}><Play size={14} />Follow the reasoning</button>
          <button onClick={() => choose("revisit")} aria-pressed={view === "revisit"}><RotateCcw size={14} />Revisit the decision</button>
          <button onClick={() => choose("why")} aria-pressed={view === "why"}><MessageSquare size={14} />Ask why</button>
        </div>
        <SolvePlayer key={replay} script={TOUR_LESSON} themeId="blackboard" showChapterLabel={false} keyboardShortcuts={false} autoPlay={view === "follow"} seekRequest={view === "follow" ? null : { t: 14, n: replay }} />
        <div className="comparison-response" aria-live="polite">
          {view === "follow" ? <>
            <span className="landing-eyebrow">Follow the reasoning</span>
            <h3>Follow one decision into the next.</h3>
            <p>Watch x become 1 as the board writes du = dx. In a full lesson, the explanation accompanies each step instead of leaving you to connect the lines.</p>
          </> : view === "revisit" ? <>
            <span className="landing-eyebrow">Revisit the decision</span>
            <h3>Return to the decision, not the beginning.</h3>
            <p>You’re back at u = x. Replay or scrub this moment to see why differentiating x simplifies the next integral. Full lessons give you chapters for decisions like this.</p>
          </> : <>
            <span className="landing-eyebrow">Ask why · Prepared example</span>
            <h3>“Why not choose u = e<sup>2x</sup> instead?”</h3>
            <p>That choice leaves ∫ x²e<sup>2x</sup> dx: the power of x increases, so the work gets longer. Choosing u = x removes x from the remaining integral. The next problem gets simpler.</p>
          </>}
        </div>
        <p className="comparison-excerpt-note">Prepared examples · silent board excerpt. These controls don’t send an AI request.</p>
      </article>
      </div>
    </div>
    <p className="comparison-honesty">Chat models can teach steps too. Ember’s difference is a coordinated lesson: board, voice, chapters, and follow-up questions in one workspace.</p>
  </section>;
}
