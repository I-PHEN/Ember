import { expect, test } from "bun:test";
import { compileBeatTiming, matchSpeechAnchors } from "../src/lib/video/timing";
const beats = [
  { id: "a", t0: 0.7, t1: 2.7, say: "row two" },
  { id: "b", t0: 2.7, t1: 4.7, say: "column three" },
];
test("anchors match whole Unicode words, in order, including repeats", () => {
  const repeated = [0, 1, 2].map(i => ({ id: String(i), t0: i, t1: i + 1, say: "row two" }));
  expect(matchSpeechAnchors("row two then row two", repeated).map(a => a.wordStart)).toEqual([0, 3]);
  expect(matchSpeechAnchors("arrow two", repeated)).toHaveLength(0);
  expect(matchSpeechAnchors("línea dos", [{ ...beats[0], say: "LÍNEA dos" }])).toHaveLength(1);
});
test("aligned phrase intervals are authoritative when feasible", () => {
  const plan = compileBeatTiming(beats, "row two then column three", {
    duration: 10, phrases: [{ id: "a", start: 1, end: 3 }, { id: "b", start: 6, end: 8 }],
  });
  expect(plan.source).toBe("aligned");
  expect(plan.windows.map(w => w.start)).toEqual([1, 6]);
  expect(plan.windows[0].scale).toBe(1);
  expect(plan.issues).toEqual([]);
});
test("duration-only timing is estimated; long explanations do not slow ink", () => {
  const p = compileBeatTiming(beats, "row two then column three", { duration: 60 });
  expect(p.source).toBe("duration");
  expect(p.windows.every(w => w.scale <= 1)).toBe(true);
  expect(p.windows[0].start).toBeLessThan(1);
});
test("infeasible audio preserves bounded ink speed and reports overflow", () => {
  const p = compileBeatTiming(beats, "row two column three", { duration: 0.2 });
  expect(p.windows.every(w => w.scale >= 0.4)).toBe(true);
  expect(p.issues.some(i => i.kind === "overflow")).toBe(true);
  expect(p.writeEnd).toBeGreaterThan(0.2);
});
test("bad measured marks fail closed rather than claiming alignment", () => {
  expect(() => compileBeatTiming(beats, "row two column three", { duration: NaN })).toThrow();
  expect(() => compileBeatTiming(beats, "row two column three", {
    duration: 3, phrases: [{ id: "a", start: 2, end: 1 }],
  })).toThrow();
  expect(() => compileBeatTiming(beats, "row two column three", {
    duration: 3, phrases: [{ id: "unknown", start: 0, end: 1 }],
  })).toThrow();
});
test("missing anchors are explicit and beat order stays monotonic", () => {
  const p = compileBeatTiming(beats, "unrelated explanation", { duration: 4 });
  expect(p.issues.filter(i => i.kind === "missing-anchor")).toHaveLength(2);
  expect(p.windows[1].start).toBeGreaterThanOrEqual(p.windows[0].end);
});
test("authored pauses keep their duration even under tight speech budgets", () => {
  const p = compileBeatTiming([{ id: "wait", t0: 0, t1: 2, fixed: true }], "pause", { duration: 1 });
  expect(p.windows[0].end - p.windows[0].start).toBe(2);
  expect(p.issues[0].kind).toBe("overflow");
});

