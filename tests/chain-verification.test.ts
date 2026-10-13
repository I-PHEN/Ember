import { describe, expect, test } from "bun:test";
import { normalizeSolutionChain, verifyChain, type SolutionChain } from "../src/lib/engine/chain";

describe("normalizeSolutionChain", () => {
  test("normalizes valid structured steps and answer", () => {
    const raw = {
      answer: "x = 4",
      units: "m",
      steps: [
        { eq: "2x + 5 = 13", rule: "given", why: "setup problem" },
        { eq: "2x = 8", rule: "subtract 5", why: "isolate variable" },
        { eq: "x = 4", rule: "divide by 2" },
      ],
    };
    const chain = normalizeSolutionChain(raw);
    expect(chain).not.toBeNull();
    expect(chain!.answer).toBe("x = 4");
    expect(chain!.units).toBe("m");
    expect(chain!.steps.length).toBe(3);
    expect(chain!.steps[1].rule).toBe("subtract 5");
  });

  test("converts legacy keySteps into basic SolutionStep list", () => {
    const raw = {
      answer: "x = 4",
      keySteps: ["subtract 5", "divide by 2"],
    };
    const chain = normalizeSolutionChain(raw);
    expect(chain).not.toBeNull();
    expect(chain!.steps.length).toBe(2);
    expect(chain!.steps[0].eq).toBe("subtract 5");
  });

  test("returns null if answer is missing", () => {
    expect(normalizeSolutionChain({})).toBeNull();
    expect(normalizeSolutionChain(null)).toBeNull();
  });
});

describe("verifyChain", () => {
  test("accepts a valid mathematically sound chain", () => {
    const chain: SolutionChain = {
      answer: "x = 4",
      steps: [
        { eq: "2x + 5 = 13", rule: "given" },
        { eq: "2x = 8", rule: "subtract 5" },
        { eq: "x = 4", rule: "divide by 2" },
      ],
    };
    const res = verifyChain(chain);
    expect(res.valid).toBe(true);
    expect(res.flags.length).toBe(0);
  });

  test("flags chain where final step contradicts the final answer", () => {
    const chain: SolutionChain = {
      answer: "x = 5",
      steps: [
        { eq: "2x + 5 = 13", rule: "given" },
        { eq: "x = 4", rule: "solve" },
      ],
    };
    const res = verifyChain(chain);
    expect(res.valid).toBe(false);
    expect(res.flags.some((f) => f.includes("contradicts final answer"))).toBe(true);
  });

  test("flags chain with invalid algebraic contradiction between steps", () => {
    const chain: SolutionChain = {
      answer: "x = 4",
      steps: [
        { eq: "2 - 2 = 0", rule: "identity" },
        { eq: "5 = 0", rule: "invalid contradiction" },
      ],
    };
    const res = verifyChain(chain);
    expect(res.valid).toBe(false);
    expect(res.flags.some((f) => f.includes("introduces contradiction"))).toBe(true);
  });
});
