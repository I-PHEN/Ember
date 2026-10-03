import { expect, test } from "bun:test";
import { normalizeLessonPlan, normalizeNarrationScore, normalizeBoardScore } from "../src/lib/lesson/contracts";
import { matrixArtifacts } from "./fixtures/matrix-lesson";

function parse(f = matrixArtifacts()) {
  const lesson = normalizeLessonPlan(f.lesson)!;
  const narration = normalizeNarrationScore(f.narration, lesson)!;
  return normalizeBoardScore(f.board, lesson, narration);
}
test("matrix artifacts preserve semantic IDs and do not mutate inputs", () => {
  const f = matrixArtifacts(); const before = JSON.stringify(f);
  expect(parse(f)?.states[1].phraseIds).toEqual(["p-read"]);
  expect(JSON.stringify(f)).toBe(before);
});
test("reject duplicate segments, invalid enums and empty objectives", () => {
  const f = matrixArtifacts();
  f.lesson.segments[1].id = "orient";
  expect(normalizeLessonPlan(f.lesson)).toBeNull();
  expect(normalizeLessonPlan({ ...f.lesson, domain: "music" })).toBeNull();
  expect(normalizeLessonPlan(null)).toBeNull();
});
test("narration references existing segments and same lesson", () => {
  const f = matrixArtifacts(); const lesson = normalizeLessonPlan(f.lesson)!;
  f.narration.phrases[0].segmentId = "missing";
  expect(normalizeNarrationScore(f.narration, lesson)).toBeNull();
  expect(normalizeNarrationScore({ ...f.narration, lessonId: "other" }, lesson)).toBeNull();
});
for (const [name, mutate] of [
  ["duplicate landmark", (f: ReturnType<typeof matrixArtifacts>) => { f.board.landmarks[1].id = "matrix-a"; }],
  ["unknown landmark", f => { f.board.states[1].visibleIds.push("missing"); }],
  ["hidden emphasis", f => { f.board.states[0].emphasize.push("row-index"); }],
  ["blank purpose", f => { f.board.landmarks[0].purpose = "  "; }],
  ["wrong lesson", f => { f.board.lessonId = "other"; }],
  ["wrong phrase segment", f => { f.board.states[1].phraseIds = ["p-orient"]; }],
  ["self relation", f => { f.board.landmarks[0].relationTo = ["matrix-a"]; }],
  ["duplicate list entry", f => { f.board.states[0].visibleIds.push("matrix-a"); }],
] as const) {
  test(name, () => { const f = matrixArtifacts(); mutate(f); expect(parse(f)).toBeNull(); });
}

