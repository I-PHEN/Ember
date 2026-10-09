import { SAMPLE_CALCULUS } from "./samples";
import type { SolveScript } from "./video/types";

/** A silent excerpt from the actual master lesson, retaining authored ink timing. */
export const TOUR_LESSON: SolveScript = { ...SAMPLE_CALCULUS, scenes: [{ ...SAMPLE_CALCULUS.scenes[2], narration: "", beats: [SAMPLE_CALCULUS.scenes[2].beats[1], { type: "point", target: "text:u = x", ms: 1800 }] }] };

export const WALKTHROUGH_SECONDS = 29;
export const STAGE_SECONDS = [0, 4, 8, 22, 29];
export const WALKTHROUGH_STAGES = ["Type", "Generate", "Watch", "Refine"] as const;
export const WALKTHROUGH_PROMPT = "Evaluate ∫ x · e^(2x) dx using integration by parts.";
export const clampProgress = (p: number) => Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : 0;
export function scrollWalkthroughProgress(progress: number) {
  const p = clampProgress(progress);
  const segment = Math.min(3, Math.floor(p * 4));
  const stops = STAGE_SECONDS;
  return (stops[segment] + (stops[segment + 1] - stops[segment]) * (p === 1 ? 1 : p * 4 - segment)) / WALKTHROUGH_SECONDS;
}
export function walkthroughState(progress: number) {
  const t = clampProgress(progress) * WALKTHROUGH_SECONDS;
  const stage = t < 4 ? 0 : t < 8 ? 1 : t < 22 ? 2 : 3;
  const start = STAGE_SECONDS[stage];
  const end = STAGE_SECONDS[stage + 1];
  return { stage, local: (t - start) / (end - start), boardTime: Math.max(0, Math.min(14, t - 8)), typed: WALKTHROUGH_PROMPT.slice(0, Math.floor(Math.min(1, t / 2.7) * WALKTHROUGH_PROMPT.length)) };
}
/** Curved travel, then overlapping contact/settling; every value is reversible. */
export function cursorAt(progress: number) {
  const p = clampProgress(progress);
  const segment = Math.min(3, Math.floor(p * 4));
  const local = p === 1 ? 1 : p * 4 - segment;
  const targets = [[155, 175], [380, 175], [615, 175], [845, 175]];
  const from = segment ? targets[segment - 1] : [40, 340];
  const to = targets[segment];
  const travel = Math.min(1, local / .62);
  const eased = travel * travel * (3 - 2 * travel);
  return { x: from[0] + (to[0] - from[0]) * eased, y: from[1] + (to[1] - from[1]) * eased - Math.sin(Math.PI * travel) * 75, segment, contact: Math.max(0, Math.min(1, (local - .5) / .4)) };
}
