import { describe, expect, test } from "bun:test";
import { advanceProgress, computeWatchProgress } from "../src/lib/video/progress";

const BASE = {
  phase: "directing" as const,
  createdAt: 0,
  scriptStartAt: null,
  boardingStartAt: null,
  scenesTotal: 6,
  scenesDone: 0,
  voicesTotal: 6,
  voicesDone: 0,
  script: null as null,
};

describe("computeWatchProgress", () => {
  test("starts near zero and always creeps forward within a phase", () => {
    const p10 = computeWatchProgress({ ...BASE }, 10_000);
    const p20 = computeWatchProgress({ ...BASE }, 20_000);
    expect(p10).toBeGreaterThanOrEqual(2);
    expect(p20).toBeGreaterThan(p10);
  });
  test("later phases never read lower than earlier bands", () => {
    expect(computeWatchProgress({ ...BASE, phase: "scripting", scriptStartAt: 25_000 }, 40_000)).toBeGreaterThanOrEqual(14);
  });
  test("boarding blends scene count with time creep", () => {
    const half = computeWatchProgress(
      { ...BASE, phase: "boarding", scriptStartAt: 25_000, boardingStartAt: 50_000, scenesDone: 3 },
      60_000
    );
    expect(half).toBeGreaterThanOrEqual(36 + 27 - 0.5); // 3/6 of the 54-point band
    expect(half).toBeLessThan(92);
  });
  test("boarding can never reach the delivered band", () => {
    const p = computeWatchProgress(
      { ...BASE, phase: "boarding", scriptStartAt: 25_000, boardingStartAt: 50_000, scenesDone: 6 },
      200_000
    );
    expect(p).toBeLessThan(92);
  });
  test("delivered (voicing) jumps past boarding and voices fill to 99", () => {
    const v = computeWatchProgress(
      { ...BASE, phase: "voicing", scriptStartAt: 25_000, boardingStartAt: 50_000, scenesDone: 6, voicesDone: 3, script: {} as never },
      120_000
    );
    expect(v).toBeGreaterThanOrEqual(92);
    expect(v).toBeLessThan(100);
  });
  test("only ready is 100", () => {
    expect(computeWatchProgress({ ...BASE, phase: "ready", scenesDone: 6, voicesDone: 6, script: {} as never }, 130_000)).toBe(100);
  });
});

describe("advanceProgress (monotonic guard)", () => {
  test("never decreases", () => {
    expect(advanceProgress(40, 38)).toBe(40);
    expect(advanceProgress(40, 55)).toBe(55);
  });
});
