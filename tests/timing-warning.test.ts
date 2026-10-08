import { expect, test } from "bun:test";
import { compileTimeline, setSceneAudio } from "../src/lib/video/compile";
import { timingWarning } from "../src/lib/video/timing-warning";

test("warning separates measured provenance from feasible scheduling", () => {
  const tl = compileTimeline({ title: "T", question: "Q", scenes: [{ chapter: "Matrix", narration: "matrix", beats: [{ type: "write", text: "A = 123", say: "matrix" }] }] });
  setSceneAudio(tl, 0, .1, [{ id: "s0b1", start: 0, end: .1 }]);
  expect(tl.scenes[0].timing!.source).toBe("aligned");
  expect(timingWarning(tl)).toContain("Scene 1 (Matrix)");
  expect(timingWarning(tl)).toContain("s0b1");
  expect(timingWarning(tl)).toContain("over");
  setSceneAudio(tl, 0, 60, [{ id: "s0b1", start: 0, end: 60 }]);
  expect(timingWarning(tl)).toBeNull();
});
