import { describe, expect, test } from "bun:test";
import {
  formatMathUnicode,
  formatMathTitle,
  formatMathQuestion,
} from "../src/lib/format-math";
import { thumbnailTime } from "../src/lib/video/thumbnail";
import { compileTimeline } from "../src/lib/video/compile";
import {
  SAMPLE_GAUSSIAN_INTEGRAL,
  SAMPLE_INCLINED_PLANE,
  SAMPLE_CALCULUS,
} from "../src/lib/samples";

describe("Math Typography Formatting", () => {
  test("cleans LaTeX and converts to readable Unicode mathematical typography", () => {
    // Gaussian Integral title with raw LaTeX
    const rawGaussian = "The Gaussian Integral: $\\int_{-\\infty}^\\infty e^{-x^2} dx = \\sqrt{\\pi}$";
    const cleanGaussian = formatMathTitle(rawGaussian);
    expect(cleanGaussian).not.toContain("$");
    expect(cleanGaussian).not.toContain("\\int");
    expect(cleanGaussian).not.toContain("\\sqrt");
    expect(cleanGaussian).toContain("∫_{-∞}^∞");
    expect(cleanGaussian).toContain("√π");

    // Integration by parts title with \cdot and e^(...)
    const rawIbp = "Integration by Parts: $\\int x \\cdot e^{2x} \\, dx$";
    const cleanIbp = formatMathTitle(rawIbp);
    expect(cleanIbp).not.toContain("$");
    expect(cleanIbp).not.toContain("\\cdot");
    expect(cleanIbp).toBe("Integration by Parts: ∫ x · e^(2x) dx");

    // Inclined Plane with Greek letters and subscripts
    const rawPhysics = "Block on Incline: Critical Angle tan(\\theta_c) = \\mu_s";
    const cleanPhysics = formatMathTitle(rawPhysics);
    expect(cleanPhysics).not.toContain("\\theta");
    expect(cleanPhysics).not.toContain("\\mu");
    expect(cleanPhysics).toBe("Block on Incline: Critical Angle tan(θ_c) = μ_s");

    // Question cleanup
    const rawQuestion = "Evaluate the Gaussian integral: I = \\int_{-\\infty}^\\infty e^{-x^2} dx by squaring and transforming to polar coordinates.";
    const cleanQuestion = formatMathQuestion(rawQuestion);
    expect(cleanQuestion).not.toContain("\\int");
    expect(cleanQuestion).toContain("∫_{-∞}^∞");
  });
});

describe("Whiteboard Thumbnail Blueprint Frame Selection", () => {
  test("Inclined Plane selects the Free-Body Diagram scene for thumbnail", () => {
    const tl = compileTimeline(SAMPLE_INCLINED_PLANE);
    const t = thumbnailTime(tl);
    expect(t).toBeGreaterThan(0);

    // Should NOT pick the early empty intro (< 3s)
    expect(t).toBeGreaterThan(5);

    // Find the scene that contains the freebody diagram
    const fbIdx = tl.scenes.findIndex((s) =>
      s.groups.some((g) => g.text === "freebody diagram")
    );
    expect(fbIdx).toBeGreaterThanOrEqual(0);
    const fbStart = tl.scenes.slice(0, fbIdx).reduce((acc, s) => acc + s.dur, 0);
    const fbEnd = fbStart + tl.scenes[fbIdx].dur;
    expect(t).toBeGreaterThanOrEqual(fbStart);
    expect(t).toBeLessThanOrEqual(fbEnd);
  });

  test("Gaussian Integral thumbnail selects settled mathematical derivation rather than empty intro", () => {
    const tl = compileTimeline(SAMPLE_GAUSSIAN_INTEGRAL);
    const t = thumbnailTime(tl);
    expect(t).toBeGreaterThan(0);
    // Bypasses the 0-5s intro where almost nothing has been written
    expect(t).toBeGreaterThan(5);
  });
});
