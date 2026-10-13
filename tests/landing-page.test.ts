import { describe, it, expect } from "bun:test";
import fs from "fs";
import path from "path";

describe("Landing Page Requirements", () => {
  const pageContent = fs.readFileSync(path.resolve("src/app/page.tsx"), "utf-8");
  const heroPlayerContent = fs.readFileSync(path.resolve("src/components/remotion/RemotionHeroPlayer.tsx"), "utf-8");
  const compositionContent = fs.readFileSync(path.resolve("src/components/remotion/EmberDemoComposition.tsx"), "utf-8");
  const toggleDemoContent = fs.readFileSync(path.resolve("src/components/landing/ToggleDemo.tsx"), "utf-8");

  it("removes comparison section and all invented stats", () => {
    // Check no invented stats remain
    const forbiddenStats = ["18.4%", "0.8x", "+3.4x", "24.70x", "100% CAS"];
    for (const stat of forbiddenStats) {
      expect(pageContent).not.toContain(stat);
      expect(heroPlayerContent).not.toContain(stat);
      expect(compositionContent).not.toContain(stat);
      expect(toggleDemoContent).not.toContain(stat);
    }

    // Check MultiAgentComparisonMatrix is not imported or used
    expect(pageContent).not.toContain("MultiAgentComparisonMatrix");
    expect(fs.existsSync(path.resolve("src/components/landing/MultiAgentComparisonMatrix.tsx"))).toBe(false);
    expect(fs.existsSync(path.resolve("src/components/landing/MultiAgentDeepDive.tsx"))).toBe(false);
    expect(fs.existsSync(path.resolve("src/components/landing/TelemetryProofGrid.tsx"))).toBe(false);
  });

  it("removes jargon labels from hero and tour", () => {
    const forbiddenJargon = [
      "30 FPS KINEMATICS",
      "DAG FORMAL VERIFICATION",
      "BLIND SOLVER",
      "PEDAGOGICAL DIRECTOR DAG",
      "Two-Thirds Power Law",
      "Chisel Nib",
      "GRAPHONOMIC v2.0",
      "PASSED",
      "PENDING",
    ];

    for (const jargon of forbiddenJargon) {
      expect(pageContent).not.toContain(jargon);
      expect(heroPlayerContent).not.toContain(jargon);
      expect(compositionContent).not.toContain(jargon);
    }
  });

  it("removes green accents from tour and page components", () => {
    // #34d399 was the green accent color
    expect(pageContent).not.toContain("#34d399");
    expect(heroPlayerContent).not.toContain("#34d399");
    expect(compositionContent).not.toContain("#34d399");
    expect(toggleDemoContent).not.toContain("#34d399");
  });

  it("includes correct hero headline, subline, starter chips and eyebrow", () => {
    expect(pageContent).toContain("Every problem,");
    expect(pageContent).toContain("a lesson.");
    expect(pageContent).toContain("Paste any STEM problem. Ember plans the lesson, writes it on the board by hand, and explains it aloud.");
    expect(pageContent).toContain("AI blackboard tutor");
    expect(pageContent).toContain("∫ x · e^(2x) dx");
    expect(pageContent).toContain("RLC Underdamped Response");
    expect(pageContent).toContain("Kinetic Theory Derivation");
  });

  it("has simplified tour phase pills in plain words", () => {
    expect(heroPlayerContent).toContain('"Problem"');
    expect(heroPlayerContent).toContain('"Plan"');
    expect(heroPlayerContent).toContain('"Blackboard"');
    expect(heroPlayerContent).toContain('"Ask questions"');
    // Ensure 01/02 prefixes removed from pill labels
    expect(heroPlayerContent).not.toContain("01 Problem Composer");
    expect(heroPlayerContent).not.toContain("02 Derivation Director");
    expect(heroPlayerContent).not.toContain("03 Kinematic Blackboard");
    expect(heroPlayerContent).not.toContain("04 Office Hours");
  });

  it("has the 4 step card titles and lesson title in composition", () => {
    expect(compositionContent).toContain("Ember plans the lesson step by step");
    expect(compositionContent).toContain("Identify parts");
    expect(compositionContent).toContain("Differentiate and integrate");
    expect(compositionContent).toContain("Apply the formula");
    expect(compositionContent).toContain("Finish the integral");
  });

  it("validates ToggleDemo copy, steps, accessibility, and link", () => {
    expect(toggleDemoContent).toContain("Same problem, two ways.");
    expect(toggleDemoContent).toContain("Typical AI chat");
    expect(toggleDemoContent).toContain("Ember");
    expect(toggleDemoContent).toContain("Everything at once. Hard to follow.");
    expect(toggleDemoContent).toContain("See how it works");
    expect(toggleDemoContent).toContain("/how-it-works");

    // Check exact 5 steps
    expect(toggleDemoContent).toContain("∫ x · e^(2x) dx");
    expect(toggleDemoContent).toContain("Pick u and dv.");
    expect(toggleDemoContent).toContain("u = x, dv = e^(2x) dx");
    expect(toggleDemoContent).toContain("Choose u so it gets simpler when differentiated.");
    expect(toggleDemoContent).toContain("du = dx, v = (1/2) e^(2x)");
    expect(toggleDemoContent).toContain("Differentiate u, integrate dv.");
    expect(toggleDemoContent).toContain("x · (1/2) e^(2x) − ∫ (1/2) e^(2x) dx");
    expect(toggleDemoContent).toContain("Apply the parts formula.");
    expect(toggleDemoContent).toContain("(1/2) x e^(2x) − (1/4) e^(2x) + C");
    expect(toggleDemoContent).toContain("Finish the last integral.");

    // Check accessibility attributes
    expect(toggleDemoContent).toContain('role="tablist"');
    expect(toggleDemoContent).toContain('role="tab"');
    expect(toggleDemoContent).toContain('role="tabpanel"');
    expect(toggleDemoContent).toContain('aria-selected');
    expect(toggleDemoContent).toContain('aria-live="polite"');
  });

  it("checks how-it-works placeholder page exists with Coming soon", () => {
    const howItWorksPath = path.resolve("src/app/how-it-works/page.tsx");
    expect(fs.existsSync(howItWorksPath)).toBe(true);
    const content = fs.readFileSync(howItWorksPath, "utf-8");
    expect(content).toContain("Coming soon.");
  });
});
