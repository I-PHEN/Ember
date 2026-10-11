import { compileTimeline } from "./compile";
import { planTeachingSteps } from "./teaching-steps";
import type { SolveScene } from "./types";

/** Advisory authoring budget at 120 words/minute; real WAV timing remains authoritative. */
export function validateTeachingBudget(scene: SolveScene) {
  const steps = planTeachingSteps(scene);
  const timeline = compileTimeline({ title: scene.chapter, question: "", scenes: steps.map(step => ({
    ...step, chapter: scene.chapter, delivery: "step" as const,
  })) }, { measureOnly: true });
  const budgets = steps.map((step, i) => {
    const inkSeconds = timeline.scenes[i].writeEnd;
    const speechSeconds = step.narration.trim().split(/\s+/).length * .5;
    // Reserve the same bounded slowing range as measured playback, not a rigid estimate.
    const maximumBudget = speechSeconds / .65;
    return { inkSeconds, speechSeconds, maximumBudget };
  });
  const overloaded = budgets.findIndex((budget, i) => steps[i].kind === "work" && budget.inkSeconds > budget.maximumBudget);
  if (overloaded !== -1) {
    const budget = budgets[overloaded];
    const diagnostics = steps.map((step, i) => ({
      step: i + 1, spoken: step.narration, board: step.beats,
      inkSeconds: Number(budgets[i].inkSeconds.toFixed(1)),
      availableSeconds: Number(budgets[i].maximumBudget.toFixed(1)),
    }));
    throw new Error(`Step ${overloaded + 1} needs ${budget.inkSeconds.toFixed(1)} seconds of board motion, but its narration allows at most ${budget.maximumBudget.toFixed(1)} seconds within the natural speech-rate range. Simplify this board operation, omit unnecessary decoration, or split its writing across existing spoken anchors. Preserve the narration verbatim and the mathematics; do not add waits or speed up handwriting. Per-step timing measurements (JSON data): ${JSON.stringify(diagnostics)}`);
  }
  return budgets.map(({ inkSeconds, speechSeconds }) => ({ inkSeconds, speechSeconds }));
}
