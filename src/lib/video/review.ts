/* Phase B — the REVIEWER's deterministic half: verdict parsing and the
   429 cost-control sampling rule. The LLM call itself lives in
   video-jobs (it needs the chat ladder and job state). */

export type ReviewOutcome =
  | { verdict: "pass" }
  | { verdict: "fixed"; beats: unknown[] }
  | null; // unusable output → the original beats ship

export function normalizeReviewFix(raw: unknown): ReviewOutcome {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.verdict === "pass") return { verdict: "pass" };
  if (o.verdict === "fixed" && Array.isArray(o.beats) && o.beats.length) {
    return { verdict: "fixed", beats: o.beats.slice(0, 22) };
  }
  return null;
}

/** spec §5 cost control: review everything while healthy; under 429
    pressure review only flagged scenes + a 30% random sample. */
export function shouldReview(
  pressure: boolean,
  flagged: boolean,
  roll: number
): boolean {
  if (!pressure) return true;
  return flagged || roll < 0.3;
}
