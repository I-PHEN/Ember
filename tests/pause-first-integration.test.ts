import { expect, test } from "bun:test";
import { compileTimeline, setSceneAudio } from "../src/lib/video/compile";
import type { Beat, SolveScript } from "../src/lib/video/types";

const script: SolveScript = { title: "Timing", question: "Q", scenes: [{ chapter: "Equation", narration: "", beats: [{ type: "write", text: "2x + 5 = 13", say: "equation" }] }] };
test("compiler preserves natural ink and travel under long measured speech", () => {
  const tl = compileTimeline(script);
  const natural = structuredClone(tl.scenes[0].strokes);
  expect(natural.filter(s => s.kind === "path").every(s => s.travel !== undefined)).toBe(true);
  expect(setSceneAudio(tl, 0, 60, [{ id: "s0b1", start: 0, end: 60 }])).toBe(true);
  for (const [i, s] of tl.scenes[0].strokes.entries()) {
    expect(s.dur).toBeCloseTo(natural[i].dur, 8);
    const n = natural[i];
    if (s.kind === "path" && n.kind === "path") {
      expect(s.travel!.dur).toBeCloseTo(n.travel!.dur, 8);
      expect(s.timeLut).toEqual(n.timeLut);
      expect(s.pts).toEqual(n.pts);
    }
  }
  expect(tl.scenes[0].timing!.holds.length).toBe(1);
  const long = JSON.stringify(tl);
  setSceneAudio(tl, 0, 1, [{ id: "s0b1", start: 0, end: 1 }]);
  expect(tl.scenes[0].timing!.feasibility).toBe("needs-revision");
  setSceneAudio(tl, 0, 60, [{ id: "s0b1", start: 0, end: 60 }]);
  expect(JSON.stringify(tl)).toBe(long);
});

const fixtures: [string, Beat][] = [
  ["matrix", { type: "matrix", id: "A", label: "A", rows: [["2", "7", "-4"], ["6", "3", "5"]], say: "example" }],
  ["fraction", { type: "fraction", num: "x + 1", den: "2", say: "example" }],
  ["incline", { type: "freebody", angle: 30, block: "m", say: "example" }],
];
for (const [name, beat] of fixtures) test(`${name}: readable short-window bounds and exact long-window baseline`, () => {
  const tl = compileTimeline({ title: name, question: "Q", scenes: [{ chapter: name, narration: "", beats: [beat, { type: "wait", ms: 800 }, { type: "point", ms: 1000 }] }] });
  const natural = structuredClone(tl.scenes[0]);
  expect(setSceneAudio(tl, 0, 1, [{ id: "s0b1", start: 0, end: 1 }])).toBe(true);
  for (const [i, stroke] of tl.scenes[0].strokes.entries()) {
    expect(stroke.dur + 1e-8).toBeGreaterThanOrEqual(natural.strokes[i].dur * .8);
    if (stroke.kind === "path" && stroke.len < .5) expect(stroke.dur).toBeCloseTo(natural.strokes[i].dur, 8);
  }
  const fixed = tl.scenes[0].timing!.windows.filter(w => w.kind === "fixed");
  expect(fixed.length).toBeGreaterThan(0);
  for (const w of fixed) expect(w.end - w.start).toBeCloseTo(w.rawEnd - w.rawStart, 8);
  setSceneAudio(tl, 0, 120, [{ id: "s0b1", start: 0, end: 120 }]);
  tl.scenes[0].strokes.forEach((s, i) => expect(s.dur).toBeCloseTo(natural.strokes[i].dur, 8));
});

test("intro compression keeps stroke and span endpoints consistent", () => {
  const tl = compileTimeline({ ...script, scenes: [{ ...script.scenes[0], intro: true }] });
  const before = structuredClone(tl.scenes[0].strokes);
  expect(setSceneAudio(tl, 0, 60, [{ id: "s0b1", start: 0, end: 60 }])).toBe(true);
  tl.scenes[0].strokes.forEach((s, i) => expect(s.dur).toBeCloseTo(before[i].dur, 8));
});

test("invalid measured phrases leave all timeline clocks untouched", () => {
  const tl = compileTimeline(script);
  const before = JSON.stringify(tl);
  expect(setSceneAudio(tl, 0, 2, [{ id: "s0b1", start: 0, end: 3 }])).toBe(false);
  expect(JSON.stringify(tl)).toBe(before);
});
