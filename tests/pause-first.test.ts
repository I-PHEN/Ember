import { describe, expect, test } from "bun:test";
import { compileBeatTiming, mapTimingTime } from "../src/lib/video/timing";

const beats = [{ id: "b", t0: 0, t1: 4, say: "hello", spans: [
  { kind: "ink" as const, t0: 0, t1: 2 },
  { kind: "pause" as const, t0: 2, t1: 3 },
  { kind: "travel" as const, t0: 3, t1: 4 },
] }];
const plan = (end: number) => compileBeatTiming(beats, "hello", {
  duration: end, phrases: [{ id: "b", start: 0, end }],
});
describe("pause-first allocation", () => {
  test("unknown gaps across speech groups cannot disappear", () => {
    const p = compileBeatTiming([{ id: "a", t0: 0, t1: 1, say: "one" }, { id: "b", t0: 3, t1: 4, say: "two" }], "one two", {
      duration: 2, phrases: [{ id: "a", start: 0, end: 1 }, { id: "b", start: 1, end: 2 }],
    });
    const gap = p.windows.find(w => w.kind === "fixed");
    expect(gap).toBeDefined();
    expect(gap!.end - gap!.start).toBe(2);
    expect(p.feasibility).toBe("needs-revision");
  });
  test("uses optional pause capacity before changing ink or travel", () => {
    expect(plan(3.5).windows.map(w => w.end - w.start)).toEqual([2, .5, 1]);
  });
  test("protected gaps can occupy synthetic holds without rushing later ink", () => {
    const p = compileBeatTiming([{ id: "a", t0: 0, t1: 1, say: "one" }, { id: "b", t0: 3, t1: 4, say: "two" }], "one two", {
      duration: 8, phrases: [{ id: "a", start: 0, end: 4 }, { id: "b", start: 4, end: 8 }],
    });
    expect(p.windows.map(w => [w.start, w.end])).toEqual([[0, 1], [2, 4], [4, 5]]);
    expect(p.holds).toEqual([{ id: "a", start: 1, end: 2 }, { id: "b", start: 5, end: 8 }]);
    expect(p.feasibility).toBe("fits");
  });
  test("bounds ink speed and reports the original deadline overflow", () => {
    const p = plan(2);
    expect(p.windows.map(w => w.end - w.start)).toEqual([1.6, 0, 1]);
    expect(p.issues[0].seconds).toBeCloseTo(.6);
    expect(p.feasibility).toBe("needs-revision");
  });
  test("long speech expands pauses only to their cap then holds", () => {
    const p = plan(10);
    expect(p.windows[0].end).toBe(2);
    expect(p.windows[1].end - p.windows[1].start).toBeCloseTo(1.2);
    expect(p.holds).toEqual([{ id: "b", start: 4.2, end: 10 }]);
    expect(mapTimingTime(p, 4, "end")).toBeCloseTo(4.2);
    expect(p.writeEnd).toBe(10);
  });
  test("unknown intervals are fixed and malformed spans rejected", () => {
    const b = { id: "b", t0: 0, t1: 4, spans: [{ kind: "ink" as const, t0: 1, t1: 2 }] };
    const p = compileBeatTiming([b], "", { duration: 1 });
    expect(p.windows.map(w => w.kind)).toEqual(["fixed", "ink", "fixed"]);
    expect(() => compileBeatTiming([{ ...b, spans: [{ kind: "pause", t0: 0, t1: 5 }] }], "", { duration: 1 })).toThrow();
    expect(() => compileBeatTiming([{ ...b, spans: [{ kind: "pause", t0: 0, t1: 1, minDuration: 2 }] }], "", { duration: 1 })).toThrow();
  });
  test("zero pauses remain finite and boundary ownership preserves ink ends", () => {
    const p = compileBeatTiming([
      { id: "a", t0: 0, t1: 1, say: "one", spans: [{ kind: "pause", t0: 0, t1: 0 }, { kind: "ink", t0: 0, t1: 1 }] },
      { id: "b", t0: 1, t1: 2, say: "two" },
    ], "one two", { duration: 8, phrases: [{ id: "a", start: 0, end: 3 }, { id: "b", start: 5, end: 8 }] });
    expect(mapTimingTime(p, 1, "end")).toBe(1);
    expect(mapTimingTime(p, 1, "start")).toBe(5);
    expect(p.windows.every(w => Number.isFinite(w.scale))).toBe(true);
  });
});
