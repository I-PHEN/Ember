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

export function sceneReviewIssues(outcome: ReviewOutcome, beats: unknown[], chapter: string, narration: string, index: number): string[] {
  if (!outcome) return ["Invalid reviewer JSON: return a pass verdict or a full corrected beats list."];
  try {
    const candidate = outcome.verdict === "fixed" ? outcome.beats : beats;
    const cleaned = sanitizeSceneBeats(candidate, narration);
    if (cleaned.length !== candidate.length) return ["Some beats failed schema validation. Return valid supported beat types and required fields."];
    const math = checkSceneLines(index, cleaned).flags.map(flag => `Math check: ${flag.text} (${flag.detail})`);
    const layout = auditTimeline(compileTimeline({ title: chapter, question: chapter, scenes: [{ chapter, narration, beats: cleaned }] })).map(issue => `Board ${issue.kind}: ${issue.a}${issue.b ? ` conflicts with ${issue.b}` : ""}. Simplify or reposition the affected ink.`);
    return [...math, ...layout].slice(0, 8);
  } catch { return ["Scene compilation failed. Return a simpler valid board while preserving the mathematics."]; }
}

/** Retry only the scene review, never silently approve or regenerate the whole lesson. */
export async function reviewSceneWithRetry<T>(attempt: (feedback: string, attempt: number) => Promise<{ accepted: T | null; issues: string[] }>, maxAttempts = 2): Promise<T | null> {
  let feedback = "";
  for (let index = 0; index < Math.min(3, Math.max(1, maxAttempts)); index++) {
    try {
      const result = await attempt(feedback, index);
      if (result.accepted !== null) return result.accepted;
      feedback = result.issues.join("\n") || "The previous review was unusable. Return a valid corrected scene.";
    } catch { feedback = "The previous review request failed. Review this scene and return valid JSON only."; }
  }
  return null;
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
