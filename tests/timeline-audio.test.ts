import { expect, test } from "bun:test";
import { compileTimeline, setSceneAudio, lockScene } from "../src/lib/video/compile";
import type { SolveScript } from "../src/lib/video/types";
import { captureTimelineTiming, applySceneTiming } from "../src/lib/video/timeline-timing";
import type { Timeline, SceneTime, PathStroke } from "../src/lib/video/types";
const script: SolveScript = { title: "T", question: "Q", scenes: [
  { chapter: "Row", narration: "Let us write row two and keep it visible.", beats: [{ type: "write", text: "2x + 5 = 13", say: "row two", keep: true }] },
  { chapter: "Column", narration: "Now column three follows.", beats: [{ type: "erase" }, { type: "write", text: "x = 4", say: "column three" }] },
] };
test("shorter audio recompiles from baseline; repeated attachments are idempotent", () => {
  const tl = compileTimeline(script);
  setSceneAudio(tl, 0, 20);
  setSceneAudio(tl, 0, 5);
  const after = JSON.stringify(tl);
  setSceneAudio(tl, 0, 5);
  expect(JSON.stringify(tl)).toBe(after);
  const fresh = compileTimeline(script); setSceneAudio(fresh, 0, 5);
  expect(JSON.stringify(tl)).toBe(JSON.stringify(fresh));
  expect(tl.scenes[0].strokes[0].t0).toBeLessThan(4);
});
test("late audio cannot change locked timeline clocks or later chapter starts", () => {
  const tl = compileTimeline(script);
  lockScene(tl, 0);
  const before = JSON.stringify(tl);
  setSceneAudio(tl, 0, 80);
  expect(JSON.stringify(tl)).toBe(before);
});
test("all timed events remain finite and group birth follows strokes", () => {
  const tl = compileTimeline(script);
  setSceneAudio(tl, 1, 2);
  for (const s of tl.scenes) {
    for (const g of s.groups) {
      if (g.strokes.length) expect(g.born).toBeCloseTo(g.strokes[0].t0);
    }
    for (const st of s.strokes) {
      expect(st.t0).toBeGreaterThanOrEqual(0);
      expect(st.dur).toBeGreaterThanOrEqual(0);
      for (const move of st.moves ?? []) expect(Number.isFinite(move.at)).toBe(true);
    }
  }
});
test("invalid audio does not mutate a timeline", () => {
  const tl = compileTimeline(script); const before = JSON.stringify(tl);
  for (const value of [NaN, Infinity, 0, -1]) setSceneAudio(tl, 0, value);
  expect(JSON.stringify(tl)).toBe(before);
});

test("erasures and survivor slides stored on older ink use the target scene clock", () => {
  const old: PathStroke = { kind: "path", pts: [], cum: [], len: 10, width: 2, color: "white", t0: 0, dur: 1,
    eraseScene: 1, eraseAt: 1, moves: [{ scene: 1, at: 1, dx: 0, dy: -30 }] };
  const ink: PathStroke = { kind: "path", pts: [], cum: [], len: 10, width: 2, color: "white", t0: 1, dur: 1 };
  const base = (): SceneTime => ({ chapter: "C", narration: "then two", head: 0, writeEnd: 3, dur: 4,
    locked: false, strokes: [], groups: [], erases: [] });
  const first = base(); first.strokes = [old]; first.locked = true;
  const second = base(); second.strokes = [ink];
  second.groups = [{ id: "g", scene: 1, born: 1, keep: false, bbox: { x: 0, y: 0, w: 1, h: 1 }, strokes: [ink] }];
  second.erases = [{ scene: 1, at: 1, region: { x: 0, y: 0, w: 1, h: 1 } }];
  const timeline: Timeline = { title: "T", question: "Q", scenes: [first, second] };
  captureTimelineTiming(timeline, [[], [{ id: "b", t0: 1, t1: 3, say: "two" }]]);
  applySceneTiming(second, { duration: 8 });
  expect(ink.t0).toBe(4);
  expect(old.eraseAt).toBe(4);
  expect(old.moves![0].at).toBe(4);
  expect(second.erases[0].at).toBe(4);
  expect(second.groups[0].born).toBe(4);
  expect(first.dur).toBe(4);
  applySceneTiming(second, { duration: 4 });
  expect(old.eraseAt).toBe(2);
  expect(old.moves![0].at).toBe(2);
});

