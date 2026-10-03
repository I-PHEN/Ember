import { expect, test } from "bun:test";
import type { PathStroke, SceneTime, Timeline } from "../src/lib/video/types";
import { measureTimeline } from "../src/lib/video/timeline-metrics";
const stroke = (len: number, dur: number): PathStroke => ({ kind: "path", len, dur, t0: 0, pts: [], cum: [], color: "white", width: 2 });
const scene = (strokes: PathStroke[], audioDur?: number): SceneTime => ({
  chapter: "c", narration: "Words", strokes, groups: [], erases: [], head: 0, writeEnd: 1.5, dur: 2, locked: false, audioDur,
});
test("measures seconds as milliseconds and missing audio as null", () => {
  const tl: Timeline = { title: "T", question: "Q", scenes: [scene([stroke(100, 1)], 2), scene([stroke(200, 2)])] };
  const metrics = measureTimeline(tl);
  expect(metrics.totalInkStrokes).toBe(2);
  expect(metrics.medianInkPxPerSec).toBe(100);
  expect(metrics.scenes[0].writeVsAudioMs).toBe(-500);
  expect(metrics.scenes[1].audioDurationMs).toBeNull();
  expect(metrics.pendingAudioScenes).toBe(1);
});
test("ignores invalid pace and avoids counting inherited stroke references twice", () => {
  const inherited = stroke(100, 1);
  const tl: Timeline = { title: "T", question: "Q", scenes: [
    scene([inherited, stroke(5, 0), stroke(Infinity, 1)], NaN),
    scene([inherited, stroke(300, 1)]),
  ] };
  const m = measureTimeline(tl);
  expect(m.totalInkStrokes).toBe(2);
  expect(m.medianInkPxPerSec).toBe(200);
  expect(m.scenes[0].audioDurationMs).toBeNull();
  expect(m.scenes[1].strokeCount).toBe(1);
});
test("silent scenes do not wait for audio", () => {
  const s = scene([]); s.narration = "";
  const m = measureTimeline({ title: "T", question: "Q", scenes: [s] });
  expect(m.pendingAudioScenes).toBe(0);
  expect(m.medianInkPxPerSec).toBeNull();
});

