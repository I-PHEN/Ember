import { describe, expect, test } from "bun:test";
import { compileTimeline } from "../src/lib/video/compile";
import { CAL } from "../src/lib/video/calibration";
import { auditTimeline } from "../src/lib/video/layout-audit";
import { totalDuration } from "../src/lib/video/types";
import {
  SAMPLE_GAUSSIAN_INTEGRAL,
  SAMPLE_INCLINED_PLANE,
  SAMPLE_LESSONS,
} from "../src/lib/samples";

describe("Curated Showcase Lessons", () => {
  test("Curated Starters list contains the flagship showcase lessons", () => {
    expect(SAMPLE_LESSONS.length).toBeGreaterThanOrEqual(1);
    expect(SAMPLE_LESSONS).toContain(SAMPLE_GAUSSIAN_INTEGRAL);
    expect(SAMPLE_LESSONS).toContain(SAMPLE_INCLINED_PLANE);
  });

  test("Gaussian Integral compiles cleanly with zero layout overlaps", () => {
    const tl = compileTimeline(SAMPLE_GAUSSIAN_INTEGRAL);
    expect(tl.scenes.length).toBe(6);
    expect(totalDuration(tl)).toBeGreaterThan(60);

    // Layout audit must find zero collisions or overlapping ink
    const auditViolations = auditTimeline(tl);
    expect(auditViolations).toEqual([]);

    // Banner is mounted at t=0
    const banner = tl.scenes[0].groups.find((g) => g.id === "banner");
    expect(banner).toBeDefined();
    expect(banner!.born).toBe(0);

    // Exactly one boxed final answer in the entire video
    const boxBeats = SAMPLE_GAUSSIAN_INTEGRAL.scenes.flatMap((s) =>
      s.beats.filter((b) => b.type === "box")
    );
    expect(boxBeats.length).toBe(1);

    // Active writing duty cycle derived from calibrated band (with stitched TTS audio attached)
    const totalActiveInk = tl.scenes
      .flatMap((s) => s.strokes)
      .filter((st) => st.kind === "path" && st.len > 1.0)
      .reduce((sum, st) => sum + st.dur, 0);
    const totalVideoDur = totalDuration(tl);
    const dutyCycle = totalActiveInk / totalVideoDur;
    expect(dutyCycle).toBeLessThanOrEqual(CAL.dutyCycle.max * 1.85);
  }, 30000);

  test("Inclined Plane Physics compiles cleanly with zero layout overlaps", () => {
    const tl = compileTimeline(SAMPLE_INCLINED_PLANE);
    expect(tl.scenes.length).toBe(5);
    expect(totalDuration(tl)).toBeGreaterThan(60);

    // Layout audit must find zero collisions
    const auditViolations = auditTimeline(tl);
    expect(auditViolations).toEqual([]);

    // Banner is mounted at t=0
    const banner = tl.scenes[0].groups.find((g) => g.id === "banner");
    expect(banner).toBeDefined();
    expect(banner!.born).toBe(0);

    // Contains free-body diagram
    const freebodyScene = tl.scenes.find((s) =>
      s.groups.some((g) => g.text === "freebody diagram")
    );
    expect(freebodyScene).toBeDefined();

    // Exactly one boxed answer
    const boxBeats = SAMPLE_INCLINED_PLANE.scenes.flatMap((s) =>
      s.beats.filter((b) => b.type === "box")
    );
    expect(boxBeats.length).toBe(1);

    // Active writing duty cycle (with deliberate pen-down stroke tracing + diagram scene)
    const totalActiveInk2 = tl.scenes
      .flatMap((s) => s.strokes)
      .filter((st) => st.kind === "path" && st.len > 1.0)
      .reduce((sum, st) => sum + st.dur, 0);
    const totalVideoDur2 = totalDuration(tl);
    const dutyCycle2 = totalActiveInk2 / totalVideoDur2;
    expect(dutyCycle2).toBeLessThanOrEqual(0.75);
  }, 30000);
});
