import { describe, expect, test } from "bun:test";
import { REVIEWER_SYSTEM, reviewerUser } from "../src/lib/prompts";
import { normalizeReviewFix, shouldReview } from "../src/lib/video/review";

describe("reviewer prompt layout", () => {
  test("static prefix: checklist present, no dynamic content", () => {
    expect(REVIEWER_SYSTEM).toContain("CHECKLIST");
    expect(REVIEWER_SYSTEM).toContain("verdict");
    expect(REVIEWER_SYSTEM).not.toContain("Step 3"); // no scene data leaked in
  });
  test("dynamic turn carries chapter, narration and beats", () => {
    const u = reviewerUser("Step 3", "so two x equals eight", '[{"type":"write","text":"2x = 8"}]');
    expect(u).toContain("Step 3");
    expect(u).toContain("so two x equals eight");
    expect(u).toContain('"2x = 8"');
  });
});

describe("normalizeReviewFix", () => {
  test("pass verdict", () => {
    expect(normalizeReviewFix({ verdict: "pass" })).toEqual({ verdict: "pass" });
  });
  test("fixed verdict returns the beats", () => {
    const out = normalizeReviewFix({ verdict: "fixed", beats: [{ type: "write", text: "x = 4" }] });
    expect(out).toEqual({ verdict: "fixed", beats: [{ type: "write", text: "x = 4" }] });
  });
  test("garbage / missing beats / wrong verdict → null (original ships)", () => {
    expect(normalizeReviewFix(null)).toBeNull();
    expect(normalizeReviewFix("pass")).toBeNull();
    expect(normalizeReviewFix({ verdict: "fixed" })).toBeNull();
    expect(normalizeReviewFix({ verdict: "fixed", beats: [] })).toBeNull();
    expect(normalizeReviewFix({ verdict: "maybe" })).toBeNull();
  });
});

describe("shouldReview (429 cost control)", () => {
  test("healthy: everything is reviewed", () => {
    expect(shouldReview(false, false, 0.99)).toBe(true);
  });
  test("pressure: flagged scenes still reviewed", () => {
    expect(shouldReview(true, true, 0.99)).toBe(true);
  });
  test("pressure: unflagged reviewed only in the 30% sample", () => {
    expect(shouldReview(true, false, 0.29)).toBe(true);
    expect(shouldReview(true, false, 0.31)).toBe(false);
  });
});
