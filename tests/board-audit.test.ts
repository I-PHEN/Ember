import { expect, test } from "bun:test";
import { auditBoardScore } from "../src/lib/video/board-audit";
import { normalizeLessonPlan, normalizeNarrationScore, normalizeBoardScore } from "../src/lib/lesson/contracts";
import { matrixArtifacts } from "./fixtures/matrix-lesson";
function score() {
  const f = matrixArtifacts(); const l = normalizeLessonPlan(f.lesson)!;
  return normalizeBoardScore(f.board, l, normalizeNarrationScore(f.narration, l)!)!;
}
test("matrix persists while row and column are selected", () => expect(auditBoardScore(score())).toEqual([]));
test("persistent representation cannot disappear", () => {
  const s = score(); s.states[1].visibleIds = ["row-index", "column-index"];
  expect(auditBoardScore(s).map(v => v.kind)).toContain("persistence");
});
test("cannot add already visible or silently introduce landmarks", () => {
  const s = score(); s.states[1].add = ["matrix-a"];
  expect(auditBoardScore(s).filter(v => v.kind === "state-transition").length).toBe(3);
});
test("cannot remove nonexistent items", () => {
  const s = score(); s.states[0].remove = ["row-index"];
  expect(auditBoardScore(s).map(v => v.kind)).toContain("state-transition");
});
test("operations require visible context", () => {
  const s = score(); s.landmarks[0].role = "operation";
  expect(auditBoardScore(s).map(v => v.kind)).toContain("missing-context");
});
test("index color roles must both exist and be distinct", () => {
  const s = score(); delete s.visualGrammar.colorRoles["column-index"];
  expect(auditBoardScore(s).map(v => v.kind)).toContain("color-role");
  s.visualGrammar.colorRoles["column-index"] = " BLUE ";
  expect(auditBoardScore(s).map(v => v.kind)).toContain("color-role");
});
test("non-index lesson does not need index colors", () => {
  const s = score(); s.visualGrammar.colorRoles = {};
  expect(auditBoardScore(s)).toEqual([]);
});

