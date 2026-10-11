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
    <div className="section-intro"><p className="landing-eyebrow">Same idea. A different way in.</p><h2 id="comparison-heading" tabIndex={-1}>Don’t just read the step.<br /><span>Work through it.</span></h2><p>A written explanation is useful. A lesson gives you somewhere to follow the reasoning, revisit a decision, and ask why. Explore the same problem below.</p></div>
    <div className="comparison-workspace">
      <div className="comparison-shared-question"><span>The question</span><p>Evaluate ∫ x · e<sup>2x</sup> dx using integration by parts.</p></div>
      <div className="comparison-learning-grid">
      <article className="comparison-reading"><div className="comparison-label"><span>Read it</span><span className="landing-caption">Worked explanation</span></div>
        <div className="chat-answer">
          <h3>Choose what gets simpler.</h3>
          <p>Let u = x: differentiating it gives 1. Put the exponential in dv because it is easy to integrate. The chain rule supplies the factor of ½.</p>
          <div className="comparison-equations"><p>u = x → du = dx</p><p>dv = e<sup>2x</sup> dx → v = ½e<sup>2x</sup></p></div>
          <h3>Apply integration by parts.</h3>
          <p>Use ∫ u dv = uv − ∫ v du. The remaining integral has no factor of x, so another exponential integral finishes it.</p>
          <div className="comparison-equations"><p>∫ x·e<sup>2x</sup> dx</p><p>= ½xe<sup>2x</sup> − ∫ ½e<sup>2x</sup> dx</p><p>= ½xe<sup>2x</sup> − ¼e<sup>2x</sup> + C</p></div>
          <h3>Check by differentiating.</h3>
          <p>The product rule gives two terms from ½xe<sup>2x</sup>. The extra exponential cancels the derivative of −¼e<sup>2x</sup>; the constant differentiates to zero.</p>
          <div className="comparison-equations"><p>F′(x) = ½e<sup>2x</sup> + xe<sup>2x</sup> − ½e<sup>2x</sup></p><p>= xe<sup>2x</sup> ✓</p></div>
        </div><p className="comparison-footnote">A complete explanation to read, scan, and check.</p>
      </article>
      <article className="comparison-board">
        <div className="comparison-label"><span>Explore it in Ember</span><span className="landing-caption">Real player · silent excerpt</span></div>
        <div className="comparison-actions" aria-label="Prepared lesson moments">
          <button onClick={() => choose("follow")} aria-pressed={view === "follow"}><Play size={14} />Follow the derivation</button>
          <button onClick={() => choose("revisit")} aria-pressed={view === "revisit"}><RotateCcw size={14} />Revisit u / dv</button>
          <button onClick={() => choose("why")} aria-pressed={view === "why"}><MessageSquare size={14} />Ask why</button>
        </div>
        <SolvePlayer key={replay} script={TOUR_LESSON} themeId="blackboard" showChapterLabel={false} keyboardShortcuts={false} autoPlay={view === "follow"} seekRequest={view === "follow" ? null : { t: 14, n: replay }} />
        <p className="comparison-excerpt-note">The silent excerpt shows u = x becoming du = dx. These prepared examples demonstrate how you can explore a lesson; they don’t send an AI request.</p>
        <div className="comparison-response" aria-live="polite">
          {view === "follow" ? <>
            <span className="landing-eyebrow">Prepared derivation walkthrough</span>
            <h3>Follow one decision into the next.</h3>
            <p>Watch u = x become du = dx on the board, then follow the remaining derivation here. In a full lesson, the board and voice carry these steps together.</p>
            <ol className="comparison-derivation"><li>Choose u = x and dv = e<sup>2x</sup> dx.</li><li>Differentiate u and integrate dv: du = dx, v = ½e<sup>2x</sup>.</li><li>Substitute into uv − ∫ v du: ½xe<sup>2x</sup> − ∫ ½e<sup>2x</sup> dx.</li><li>Integrate once more: ½xe<sup>2x</sup> − ¼e<sup>2x</sup> + C.</li></ol>
          </> : view === "revisit" ? <>
            <span className="landing-eyebrow">Prepared chapter moment · Choosing u and dv</span>
            <h3>Return to the decision, not the beginning.</h3>
            <p>The player revisits the u = x step. Replay this short excerpt or drag its timeline to see it unfold again. In a full lesson, chapters help you return to a decision like this.</p>
            <p>Ask yourself: which factor becomes simpler when differentiated? Here, x becomes 1, while e<sup>2x</sup> stays easy to integrate.</p>
          </> : <>
            <span className="landing-eyebrow">Prepared follow-up example</span>
            <h3>“Why not choose u = e<sup>2x</sup> instead?”</h3>
            <p>You can, but it makes the work longer. With u = e<sup>2x</sup> and dv = x dx, we get du = 2e<sup>2x</sup> dx and v = x²/2. The formula then gives ½x²e<sup>2x</sup> − ∫ x²e<sup>2x</sup> dx: the power of x has increased.</p>
            <p>Choosing u = x instead removes that factor from the remaining integral. The method works because the next problem is simpler.</p>
          </>}
        </div>
      </article>
      </div>
    </div>
    <p className="comparison-honesty">Chat models can teach steps too. Ember’s difference is a coordinated lesson: board, voice, chapters, and follow-up questions in one workspace.</p>
  </section>;
}
