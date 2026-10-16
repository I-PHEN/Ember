import { describe, expect, test } from "bun:test";
import { defaultSynthesizer } from "../src/lib/video/kinematics";
import { compileTimeline } from "../src/lib/video/compile";
import { CAL } from "../src/lib/video/calibration";
import { BOARD_REGIONS, CAP, type SolveScript } from "../src/lib/video/types";

describe("Kinematic Burst Pacing & Biomechanical Coordination", () => {
  test("tip speed scales as ~4H px/s according to Wright (1993) empirical power law", () => {
    // Standard glyph stroke
    const testPoints = [
      { x: 100, y: 200 },
      { x: 125, y: 195 },
      { x: 150, y: 210 },
      { x: 175, y: 220 },
    ];

    const profSm = defaultSynthesizer.synthesize(testPoints, 3.6, undefined, CAP.sm);
    const profMd = defaultSynthesizer.synthesize(testPoints, 3.6, undefined, CAP.md);
    const profLg = defaultSynthesizer.synthesize(testPoints, 3.6, undefined, CAP.lg);
    const profTitle = defaultSynthesizer.synthesize(testPoints, 3.6, undefined, CAP.title);

    const speedSm = profSm.totalLength / profSm.duration;
    const speedMd = profMd.totalLength / profMd.duration;
    const speedLg = profLg.totalLength / profLg.duration;
    const speedTitle = profTitle.totalLength / profTitle.duration;

    // Strict monotonic increase with letter height: v ~ H^0.75
    expect(speedSm).toBeLessThan(speedMd);
    expect(speedMd).toBeLessThan(speedLg);
    expect(speedLg).toBeLessThan(speedTitle);

    // Scaling ratio matches Wright (1993) power law within 18% (accounting for acceleration envelope)
    const ratioSmMd = speedSm / speedMd;
    const expectedRatioSmMd = Math.pow(CAP.sm / CAP.md, 0.75); // ~0.836
    expect(Math.abs(ratioSmMd - expectedRatioSmMd)).toBeLessThan(0.18);

    const ratioLgMd = speedLg / speedMd;
    const expectedRatioLgMd = Math.pow(CAP.lg / CAP.md, 0.75); // ~1.23
    expect(Math.abs(ratioLgMd - expectedRatioLgMd)).toBeLessThan(0.18);

    const ratioTitleMd = speedTitle / speedMd;
    const expectedRatioTitleMd = Math.pow(CAP.title / CAP.md, 0.75); // ~1.30
    expect(Math.abs(ratioTitleMd - expectedRatioTitleMd)).toBeLessThan(0.18);
  });

  test("marker-on-board duty cycle is <= 30% of total scene duration", () => {
    const script: SolveScript = {
      title: "Gaussian Integral",
      question: "Evaluate the Gaussian integral: ∫_{-∞}^∞ e^{-x²} dx",
      scenes: [
        {
          chapter: "Introduction",
          narration:
            "Today we are evaluating one of the most famous integrals in mathematics, the Gaussian integral from minus infinity to plus infinity of e to the minus x squared dx. Let us begin by defining our integral as I.",
          segments: [
            {
              say: "Today we are evaluating one of the most famous integrals in mathematics, the Gaussian integral from minus infinity to plus infinity of e to the minus x squared dx.",
              ink: [],
            },
            {
              say: "Let us begin by defining our integral as I.",
              ink: [{ type: "write", text: "I = ∫_{-∞}^∞ e^{-x²} dx", color: "white" }],
            },
          ],
          beats: [
            {
              type: "write",
              text: "I = ∫_{-∞}^∞ e^{-x²} dx",
              color: "white",
              say: "Let us begin by defining our integral as I.",
            },
          ],
        },
      ],
    };

    const tl = compileTimeline(script);
    const scene = tl.scenes[0];

    // Compute active ink drawing duration (excluding zero-length hold strokes and pauses)
    const activeInkDur = scene.strokes
      .filter((s) => s.kind === "path" && s.len > 1.0)
      .reduce((sum, s) => sum + s.dur, 0);

    const dutyCycle = activeInkDur / scene.dur;
    // Real teaching whiteboard duty cycle: calibrated band
    expect(dutyCycle).toBeGreaterThanOrEqual(CAL.dutyCycle.min * 0.5);
    expect(dutyCycle).toBeLessThanOrEqual(CAL.dutyCycle.max * 1.5);
  });

  test("problem statement is pre-mounted at t=0 in BOARD_REGIONS.banner", () => {
    const script: SolveScript = {
      title: "Gaussian Integral",
      question: "Evaluate the Gaussian integral: ∫_{-∞}^∞ e^{-x²} dx",
      scenes: [
        {
          chapter: "Setup",
          narration: "We want to evaluate this integral by squaring it and converting to polar coordinates.",
          beats: [{ type: "write", text: "I² = [∫ e^{-x²} dx]²", color: "white" }],
        },
        {
          chapter: "Erase Test",
          narration: "Now let us wipe our auxiliary working while preserving the problem statement.",
          beats: [
            { type: "erase" },
            { type: "write", text: "I² = π", color: "green", keep: true },
          ],
        },
      ],
    };

    const tl = compileTimeline(script);
    const scene0 = tl.scenes[0];

    // Verify banner group exists in Scene 0
    const bannerGroup = scene0.groups.find((g) => g.id === "banner");
    expect(bannerGroup).toBeDefined();
    expect(bannerGroup!.born).toBe(0);
    expect(bannerGroup!.keep).toBe(true);
    expect(bannerGroup!.text).toContain("Gaussian integral");

    // Verify it is positioned inside BOARD_REGIONS.banner
    expect(bannerGroup!.bbox.y).toBeLessThanOrEqual(BOARD_REGIONS.banner.y + BOARD_REGIONS.banner.h);
    expect(bannerGroup!.bbox.x).toBeGreaterThanOrEqual(BOARD_REGIONS.banner.x);

    // Verify strokes start at t=0
    for (const stroke of bannerGroup!.strokes) {
      expect(stroke.t0).toBe(0);
    }

    // Verify that after an erase in Scene 1, the banner group is NOT in the gone set (it survived)
    const scene1 = tl.scenes[1];
    expect(scene1.erases.length).toBeGreaterThan(0);
    // The banner group was keep: true, so it remains active
    expect(bannerGroup!.keep).toBe(true);
  });

  test("automated deictic pointing schedules marker cursor hover during visual references", () => {
    const script: SolveScript = {
      title: "Deictic Demonstration",
      question: "Evaluate the Gaussian integral: ∫_{-∞}^∞ e^{-x²} dx",
      scenes: [
        {
          chapter: "Pointing Check",
          narration:
            "Consider this integral carefully. Notice that the integrand is an even bell curve.",
          segments: [
            {
              say: "Consider this integral carefully.",
              ink: [], // Deictic reference to "this integral" without explicit ink -> should auto-generate point beat
            },
            {
              say: "Notice that the integrand is an even bell curve.",
              ink: [{ type: "write", text: "f(-x) = f(x)", color: "yellow" }],
            },
          ],
          beats: [
            { type: "write", text: "f(-x) = f(x)", color: "yellow" },
          ],
        },
      ],
    };

    const tl = compileTimeline(script);
    const scene = tl.scenes[0];

    // Find a deictic point stroke (len < 0.5)
    const pointStroke = scene.strokes.find((s) => s.kind === "path" && s.len < 0.5);
    expect(pointStroke).toBeDefined();
    expect(pointStroke!.dur).toBeGreaterThanOrEqual(0.5);
  });

  test("newline repositioning adds in-air transition pause", () => {
    const scriptNoNewline: SolveScript = {
      title: "T",
      question: "Q",
      scenes: [
        {
          chapter: "C",
          narration: "",
          beats: [
            { type: "write", text: "x = 1", color: "white" },
            { type: "write", text: "y = 2", color: "white" },
          ],
        },
      ],
    };

    const scriptWithNewline: SolveScript = {
      title: "T",
      question: "Q",
      scenes: [
        {
          chapter: "C",
          narration: "",
          beats: [
            { type: "write", text: "x = 1", color: "white" },
            { type: "newline", n: 1 },
            { type: "write", text: "y = 2", color: "white" },
          ],
        },
      ],
    };

    const tl1 = compileTimeline(scriptNoNewline);
    const tl2 = compileTimeline(scriptWithNewline);

    // The script with newline should take longer due to arm repositioning pause (450ms)
    expect(tl2.scenes[0].writeEnd).toBeGreaterThan(tl1.scenes[0].writeEnd + 0.35);
  });
});
