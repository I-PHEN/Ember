import { expect, test } from "bun:test";
import { reviewSceneWithRetry, sceneReviewIssues, acceptSceneReview } from "../src/lib/video/review";
import fs from "node:fs";
import { DIRECTOR_PROMPT } from "../src/lib/prompts";
test("preserves original givens and requires symbolic missing friction", () => {
  expect(DIRECTOR_PROMPT).toContain("Never invent missing parameters");
  expect(DIRECTOR_PROMPT).toContain("use symbolic mu");
  expect(fs.readFileSync("src/lib/video-jobs.ts", "utf8")).toContain("return { ...outline, question: job.question }");
});
test("retries only a failed review with validation feedback", async () => {
  const calls: string[] = [];
  const value = await reviewSceneWithRetry(async feedback => {
    calls.push(feedback);
    return calls.length === 1 ? { accepted: null, issues: ["Math error"] } : { accepted: { beats: [] }, issues: [] };
  });
  expect(value).toEqual({ beats: [] });
  expect(calls).toEqual(["", "Math error"]);
});
test("successful reviews do not make another provider call", async () => {
  let count = 0;
  expect(await reviewSceneWithRetry(async () => { count++; return { accepted: "valid", issues: [] }; })).toBe("valid");
  expect(count).toBe(1);
});
test("provider errors and invalid reviews remain fail-closed after bounded retries", async () => {
  let count = 0;
  expect(await reviewSceneWithRetry(async () => { count++; throw new Error("upstream"); })).toBeNull();
  expect(count).toBe(2);
  expect(await reviewSceneWithRetry(async () => ({ accepted: null, issues: ["bad"] }))).toBeNull();
});
test("a pass verdict cannot bypass incorrect math and produces actionable feedback", () => {
  const beats = [{ type: "write", text: "2 + 2 = 5", color: "white" }];
  expect(acceptSceneReview({ verdict: "pass" }, beats, "Arithmetic", "two plus two", 0)).toBeNull();
  expect(sceneReviewIssues({ verdict: "pass" }, beats, "Arithmetic", "two plus two", 0).join(" ")).toContain("Math check");
  expect(sceneReviewIssues(null, beats, "Arithmetic", "", 0)[0]).toContain("Invalid reviewer JSON");
});
