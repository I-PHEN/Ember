import { sanitizeSceneBeats } from "../solve-schema";
import { compileTimeline } from "./compile";
import { auditTimeline } from "./layout-audit";
import { checkSceneLines } from "./checker";

export type ReviewOutcome =
  | { verdict: "pass" }
  | { verdict: "fixed"; beats: unknown[] }
  | null; // unusable output blocks delivery

export function acceptSceneReview(outcome: ReviewOutcome, beats: unknown[], chapter: string, narration: string, index: number) {
  if (!outcome) return null;
  try {
    const candidate = outcome.verdict === "fixed" ? outcome.beats : beats;
    const cleaned = sanitizeSceneBeats(candidate, narration);
    if (cleaned.length !== candidate.length) return null;
    if (checkSceneLines(index, cleaned).flags.length) return null;
    const tl = compileTimeline({title:chapter,question:chapter,scenes:[{chapter,narration,beats:cleaned}]});
    if (auditTimeline(tl).length) return null;
    return {beats:cleaned,fixed:outcome.verdict === "fixed"};
  } catch { return null; }
}

export function normalizeReviewFix(raw: unknown): ReviewOutcome {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.verdict === "pass") return { verdict: "pass" };
  if (o.verdict === "fixed" && Array.isArray(o.beats) && o.beats.length && o.beats.length <= 22) {
    return { verdict: "fixed", beats: o.beats };
  }
  return null;
}

/** Legacy sampling helper, not used by the mandatory delivery gate.
    Historical spec §5: review everything while healthy; under 429
    pressure review only flagged scenes + a 30% random sample. */
export function shouldReview(
  pressure: boolean,
  flagged: boolean,
  roll: number
): boolean {
  if (!pressure) return true;
  return flagged || roll < 0.3;
}
