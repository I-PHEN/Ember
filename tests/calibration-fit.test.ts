import { describe, expect, test } from "bun:test";
import { fitConstants, fitGamma0 } from "../src/lib/calibration/fit";
import type { HandwritingMetrics } from "../src/lib/calibration/analyze";
import { KinematicStrokeSynthesizer } from "../src/lib/video/kinematics";

function metrics(partial: Partial<HandwritingMetrics>): HandwritingMetrics {
  return {
    fps: 10,
    frameW: 640,
    frameH: 360,
    totalFrames: 1000,
    writingFrames: 200,
    capHeightPx: 12,
    dutyCycle: 0.22,
    speedsPxPerSec: new Array(50).fill(0).map((_, i) => 60 + i), // 60..109 px/s
    pauses: [
      { t: 1, dur: 0.4, kind: "hold" },
      { t: 5, dur: 0.6, kind: "hold" },
      { t: 9, dur: 1.4, kind: "line" },
      { t: 13, dur: 0.5, kind: "hold" },
    ],
    ...partial,
  };
}

function referenceStroke(): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= 40; i++) {
    const x = 100 + (i / 40) * 160;
    const y = 200 + 28 * Math.sin(((i / 40) * Math.PI * 2) / 1);
    pts.push({ x, y });
  }
  return pts;
}

describe("fitGamma0", () => {
  test("binary-searches gamma0 so the real synthesizer hits the target speed", () => {
    const g = fitGamma0(160); // 160 px/s at cap 38
    expect(g).toBeGreaterThan(20);
    expect(g).toBeLessThan(600);
    const synth = new KinematicStrokeSynthesizer();
    synth.gamma0 = g;
    // reference stroke speed ≈ target (±6%)
    const prof = synth.synthesize(referenceStroke(), 3.6, undefined, 38);
    const speed = prof.totalLength / prof.duration;
    expect(Math.abs(speed - 160) / 160).toBeLessThan(0.06);
  });
});

describe("fitConstants", () => {
  const f = fitConstants(metrics({}));
  test("speeds normalize to Ember board px/s via cap heights", () => {
    // p50 of 60..109 ≈ 84.5 px/s at capHeight 12 → 7.04 capH/s → ×38 ≈ 267 px/s
    expect(f.speedCapHeightsPerSec).toBeCloseTo(84.5 / 12, 1);
    expect(f.speedCapHeightsPerSec * 38).toBeGreaterThan(200);
    expect(f.speedCapHeightsPerSec * 38).toBeLessThan(300);
  });
  test("hesitations derive from hold-pause percentiles and stay clamped", () => {
    expect(f.hesitations.charStart).toBeGreaterThanOrEqual(0.03);
    expect(f.hesitations.charStart).toBeLessThanOrEqual(0.12);
    expect(f.hesitations.wordStart).toBeGreaterThan(f.hesitations.charStart);
    expect(f.hesitations.operator).toBeGreaterThan(f.hesitations.wordStart);
  });
  test("duty band brackets the observed duty cycle", () => {
    expect(f.dutyCycle.min).toBeLessThanOrEqual(0.22);
    expect(f.dutyCycle.max).toBeGreaterThanOrEqual(0.22);
  });
  test("fitts constants fall back when samples are too few", () => {
    const few = fitConstants(metrics({ pauses: [{ t: 1, dur: 0.4, kind: "hold" }] }));
    expect(few.fittsA).toBe(0.11);
    expect(few.fittsB).toBe(0.09);
  });
});
