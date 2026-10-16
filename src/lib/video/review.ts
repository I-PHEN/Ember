/* Phase B — the REVIEWER's deterministic half: verdict parsing and the
   429 cost-control sampling rule. The LLM call itself lives in
   video-jobs (it needs the chat ladder and job state). */

export type ReviewOutcome =
  | { verdict: "pass" }
  | { verdict: "fixed"; beats: unknown[]; segments?: unknown[] }
  | null; // unusable output → the original beats ship

export function normalizeReviewFix(raw: unknown): ReviewOutcome {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.verdict === "pass") return { verdict: "pass" };
  if (o.verdict === "fixed") {
    const segs = Array.isArray(o.segments) && o.segments.length ? o.segments.slice(0, 20) : undefined;
    const rawBeats = Array.isArray(o.beats) && o.beats.length
      ? o.beats.slice(0, 22)
      : segs
      ? segs.flatMap((s) => (s && typeof s === "object" && Array.isArray((s as { ink?: unknown[] }).ink) ? (s as { ink: unknown[] }).ink : [])).slice(0, 22)
      : [];
    if (rawBeats.length) {
      return segs
        ? { verdict: "fixed", beats: rawBeats, segments: segs }
        : { verdict: "fixed", beats: rawBeats };
    }
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
