import { expect, test } from "bun:test";
import { compileTimeline, setSceneAudio } from "../src/lib/video/compile";
import { chapterSnapshot, chapterSeekTime } from "../src/lib/video/chapters";
import type { SolveScript } from "../src/lib/video/types";

const script: SolveScript = { title: "Matrices", question: "Find the entry", scenes: [
  { chapter: "Practice", narration: "Find row one column two.", beats: [] },
  { chapter: "Answer", narration: "The answer is seven.", beats: [] },
] };

test("chapters follow measured audio and previous snapshots stay detached", () => {
  const tl = compileTimeline(script);
  setSceneAudio(tl, 0, 10);
  const before = chapterSnapshot(tl);
  // The timing compiler adds a half-second scene tail after narration.
  expect(before[1]).toEqual({ sceneIndex: 1, t: 10.5, label: "Answer" });
  setSceneAudio(tl, 0, 20);
  expect(chapterSnapshot(tl)[1].t).toBe(20.5);
  expect(before[1].t).toBe(10.5);
  expect(chapterSeekTime(tl, before[1].sceneIndex)).toBe(20.51);
});

test("hidden intros contribute time without renumbering scene identities", () => {
  const tl = compileTimeline(script);
  tl.scenes[0].intro = true;
  setSceneAudio(tl, 0, 10);
  expect(chapterSnapshot(tl)).toEqual([{ sceneIndex: 1, t: 10.5, label: "Answer" }]);
});

test("invalid scene targets cannot seek outside the timeline", () => {
  const tl = compileTimeline(script);
  for (const idx of [-1, 2, 0.5, NaN, Infinity]) expect(chapterSeekTime(tl, idx)).toBeNull();
  tl.scenes = [];
  expect(chapterSnapshot(tl)).toEqual([]);
  expect(chapterSeekTime(tl, 0)).toBeNull();
});
