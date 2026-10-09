"use client";
import SolvePlayer from "@/components/player/SolvePlayer";
import { TOUR_LESSON } from "@/lib/product-walkthrough";

export default function LearningComparison() {
  return <section id="comparison" className="landing-width comparison-section">
    <div className="section-intro"><p className="landing-eyebrow">Same problem. Same reasoning.</p><h2>Read the explanation.<br /><span>Or watch the step unfold.</span></h2><p>For ∫ x · e<sup>2x</sup> dx, why choose u = x? Here’s that step in two formats—not a benchmark of model intelligence.</p></div>
    <div className="comparison-grid">
      <article className="comparison-card"><div className="comparison-label"><span>Chat response</span><span className="landing-caption">Illustrative example</span></div><div className="example-question">Why choose u = x for integration by parts?</div><div className="chat-answer"><p>Choose u = x. Differentiating x makes it simpler:</p><div className="comparison-equations"><p>u = x → du = dx</p></div><p>With dv = e<sup>2x</sup> dx, this removes x from the remaining integral when we apply ∫ u dv = uv − ∫ v du.</p></div><p className="comparison-footnote">A written explanation you can read and scan.</p></article>
      <article className="comparison-card ember-example"><div className="comparison-label"><span>Ember blackboard</span><span className="landing-caption">Playable writing preview · silent</span></div><SolvePlayer script={TOUR_LESSON} themeId="blackboard" /><p className="comparison-footnote">Press play to see that same step written. Pause or seek to revisit it. Full lessons in the studio include narration.</p></article>
    </div>
    <p className="comparison-honesty">Chat models can teach steps too. Ember’s difference is a coordinated lesson: board, voice, chapters, and follow-up questions in one workspace.</p>
  </section>;
}
