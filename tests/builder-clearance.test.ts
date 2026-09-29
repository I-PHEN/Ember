import { describe, expect, test } from "bun:test";
import { compileTimeline } from "../src/lib/video/compile";
import type { SolveScript, Timeline } from "../src/lib/video/types";

function overlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): number {
  const xo = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const yo = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return xo > 0 && yo > 0 ? xo * yo : 0;
}

function groupsOf(tl: Timeline, sceneIdx = 0) {
  return tl.scenes[sceneIdx].groups;
}

const BASE = {
  title: "t",
  question: "q",
};

describe("numberline never draws through kept ink", () => {
  test("positioned write at mid-board, then a numberline", () => {
    const script = {
      ...BASE,
      scenes: [
        {
          chapter: "c",
          narration: "",
          beats: [
            { type: "write", text: "result = 42", x: 0.5, y: 0.45, color: "green" },
            { type: "numberline", min: -5, max: 5, points: [{ at: 3, label: "x" }] },
          ],
        },
      ],
    } as unknown as SolveScript;
    const tl = compileTimeline(script);
    const gs = groupsOf(tl);
    expect(gs.length).toBeGreaterThanOrEqual(2);
    for (const a of gs) for (const b of gs) {
      if (a === b) continue;
      expect(overlap(a.bbox, b.bbox)).toBe(0);
    }
  });
});

describe("fraction clears a positioned label above", () => {
  test("positioned write low on the board, then a fraction at flow", () => {
    const script = {
      ...BASE,
      scenes: [
        {
          chapter: "c",
          narration: "",
          beats: [
            { type: "write", text: "note: a = 5", x: 0.3, y: 0.6, color: "yellow" },
            { type: "fraction", prefix: "x =", num: "−b + √(b²−4ac)", den: "2a", color: "green" },
          ],
        },
      ],
    } as unknown as SolveScript;
    const tl = compileTimeline(script);
    const gs = groupsOf(tl);
    for (const a of gs) for (const b of gs) {
      if (a === b) continue;
      expect(overlap(a.bbox, b.bbox)).toBe(0);
    }
  });
});
