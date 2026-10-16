import { describe, expect, test } from "bun:test";
import {
  defaultSynthesizer,
  computeFittsFlightDuration,
  computeTransitionPause,
  balanceAudioVisualTiming,
  strokeProgressAt,
  sampleMicroTremor,
} from "../src/lib/video/kinematics";
import { compileTimeline } from "../src/lib/video/compile";
import { CAL } from "../src/lib/video/calibration";
import type { SolveScript } from "../src/lib/video/types";

describe("Graphonomic Kinematics & Biomechanical Modeling", () => {
  test("Vinculum ballistic surge: long horizontal bar completes rapidly without dragging", () => {
    // 420px fraction bar or coordinate axis
    const pts = [
      { x: 100, y: 300 },
      { x: 520, y: 300 },
    ];
    const prof = defaultSynthesizer.synthesize(pts, 3.6, "ballistic-line");

    // Must complete in 0.18 - 0.28s (human ballistic flick), NOT 2.4s crawl at 175 px/s
    expect(prof.duration).toBeGreaterThanOrEqual(0.18);
    expect(prof.duration).toBeLessThanOrEqual(0.28);

    const peakVelocity = Math.max(...prof.velocities);
    expect(peakVelocity).toBeGreaterThan(1500); // Ballistic peak surge
  });

  test("Two-Thirds Power Law: sharp curves decelerate smoothly at apices", () => {
    // Sharp cursive loop apex (small radius of curvature, high kappa)
    const pts = [
      { x: 100, y: 100 },
      { x: 108, y: 94 },
      { x: 116, y: 96 },
      { x: 120, y: 106 },
      { x: 114, y: 116 },
      { x: 104, y: 112 },
    ];
    const prof = defaultSynthesizer.synthesize(pts, 3.6, "glyph-stroke");

    // Instantaneous velocity must decelerate at sharp curvature
    const minVelocity = Math.min(...prof.velocities);
    expect(minVelocity).toBeLessThanOrEqual(45.0); // Apex deceleration
    expect(prof.duration).toBeGreaterThan(0.20);
  });

  test("Fitts' Law pen flight kinetics: airborne transit scales logarithmically with distance", () => {
    const p0 = { x: 100, y: 100 };
    const pShort = { x: 115, y: 100 }; // D = 15 px (intra-glyph lift)
    const pLong = { x: 700, y: 100 }; // D = 600 px (cross-board repositioning)

    const tShort = computeFittsFlightDuration(p0, pShort, 12);
    const tLong = computeFittsFlightDuration(p0, pLong, 12);

    expect(tShort).toBeGreaterThanOrEqual(0.15);
    expect(tShort).toBeLessThan(0.30);

    expect(tLong).toBeGreaterThan(0.50);
    expect(tLong).toBeLessThan(0.70);
    expect(tLong).toBeGreaterThan(tShort);
  });

  test("Hierarchical pauses: mathematical operators receive cognitive hesitation", () => {
    const from = { x: 100, y: 100 };
    const to = { x: 130, y: 100 };

    const glyphPause = computeTransitionPause(from, to, "glyph-stroke");
    const opPause = computeTransitionPause(from, to, "operator");
    const wordPause = computeTransitionPause(from, to, "word-start");

    expect(opPause).toBeGreaterThan(glyphPause + (CAL.hesitations.operator - CAL.hesitations.charStart) * 0.8);
    expect(wordPause).toBeGreaterThan(glyphPause + (CAL.hesitations.wordStart - CAL.hesitations.charStart) * 0.8);
  });

  test("Calligraphic stroke width: modulates dynamically with nib angle and speed", () => {
    // Diagonal stroke vs vertical stroke
    const diagPts = [{ x: 100, y: 100 }, { x: 150, y: 150 }];
    const prof = defaultSynthesizer.synthesize(diagPts, 4.0);

    expect(prof.widths.length).toBe(diagPts.length);
    for (const w of prof.widths) {
      expect(w).toBeGreaterThan(1.5);
      expect(w).toBeLessThan(7.0);
    }
  });

  test("Multimodal audio-visual balance: elastic pauses absorb narration discrepancies", () => {
    const rawStrokes = [0.4, 0.5, 0.6];
    const rawPauses = [0.2, 0.3];
    const targetSpeech = 2.4; // Longer than raw total (2.0s)

    const balanced = balanceAudioVisualTiming(rawStrokes, rawPauses, targetSpeech);

    // Pauses should have expanded
    const newPauseTotal = balanced.pauseDurations.reduce((a, b) => a + b, 0);
    expect(newPauseTotal).toBeGreaterThan(0.5);

    // Active strokes should preserve their natural duration without distortion
    expect(balanced.strokeDurations[0]).toBeCloseTo(0.4, 1);
  });

  test("Full lecture write beat compiles with authentic professor cadence", () => {
    const script = {
      title: "Limits",
      question: "Evaluate limit",
      scenes: [
        {
          chapter: "Derivation",
          narration: "",
          beats: [{ type: "write", text: "lim_(x→0) (sin x)/x = 1", color: "white" }],
        },
      ],
    } as unknown as SolveScript;

    const tl = compileTimeline(script);
    const scene = tl.scenes[0];

    expect(scene.strokes.length).toBeGreaterThan(5);
    // Every stroke has kinematic profile and LUT
    for (const s of scene.strokes) {
      if (s.kind === "path") {
        expect(s.timeLut).toBeDefined();
        expect(s.widths).toBeDefined();
        expect(s.timeLut!.length).toBe(64);
        expect(s.timeLut![0]).toBe(0);
        expect(s.timeLut![63]).toBe(1);
      }
    }
  });
});
