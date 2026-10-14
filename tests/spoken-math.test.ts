import { describe, expect, test } from "bun:test";
import { normalizeSpokenMath } from "../src/lib/ai/spoken-math";

describe("SpokenMathNormalizer", () => {
  test("normalizes integrals into ear-ready phrases", () => {
    const raw = "We evaluate \\int_{-\\infty}^\\infty e^{-x^2} dx today.";
    const spoken = normalizeSpokenMath(raw);
    expect(spoken).toContain("the integral from negative infinity to infinity");
    expect(spoken).toContain("e to the negative x squared");
    expect(spoken).not.toContain("\\");
  });

  test("normalizes derivatives and fractions", () => {
    const raw = "The rate of change is \\frac{dy}{dx} = \\frac{a}{b}.";
    const spoken = normalizeSpokenMath(raw);
    expect(spoken).toContain("d y over d x");
    expect(spoken).toContain("a over b");
    expect(spoken).not.toContain("\\frac");
  });

  test("normalizes Greek letters and subscripts", () => {
    const raw = "At static equilibrium, \\tan\\theta = \\mu_s and F_{\\text{net}} = 0.";
    const spoken = normalizeSpokenMath(raw);
    expect(spoken).toContain("tangent theta");
    expect(spoken).toContain("mu sub s");
    expect(spoken).toContain("F net");
    expect(spoken).not.toContain("\\mu_s");
  });

  test("normalizes powers and roots", () => {
    const raw = "We find x^2 + y^3 = \\sqrt{z}.";
    const spoken = normalizeSpokenMath(raw);
    expect(spoken).toContain("x squared");
    expect(spoken).toContain("y cubed");
    expect(spoken).toContain("the square root of z");
  });
});
