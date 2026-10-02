import { describe, expect, test } from "bun:test";
import {
  compareAnswers,
  extractScriptAnswer,
  normalizeSolver,
} from "../src/lib/video/solver";

describe("normalizeSolver", () => {
  test("keeps a clean answer and steps", () => {
    const r = normalizeSolver({ answer: "x = 4", keySteps: ["subtract 5", "divide by 2"] });
    expect(r).toEqual({ answer: "x = 4", keySteps: ["subtract 5", "divide by 2"] });
  });
  test("no answer → null", () => {
    expect(normalizeSolver({ keySteps: [] })).toBeNull();
    expect(normalizeSolver("junk")).toBeNull();
  });
});

describe("extractScriptAnswer", () => {
  const script = {
    title: "t",
    question: "q",
    scenes: [
      { chapter: "Understand", narration: "", beats: [{ type: "write", text: "2x + 5 = 13", color: "blue", keep: true }] },
      { chapter: "Answer", narration: "", beats: [{ type: "write", text: "x = 4", color: "green", keep: true }, { type: "box", target: "text:x = 4" }] },
      { chapter: "Check", narration: "", beats: [{ type: "write", text: "Check: 2(4) + 5 = 13" }] },
    ],
  };
  test("prefers the boxed line in the answer scene", () => {
    const r = extractScriptAnswer(script as never);
    expect(r).toEqual({ answer: "x = 4", scene: 1 });
  });
  test("falls back to the last keep:true write when no answer scene", () => {
    const noAnswerScene = { ...script, scenes: script.scenes.slice(0, 1) };
    expect(extractScriptAnswer(noAnswerScene as never)).toEqual({ answer: "2x + 5 = 13", scene: 0 });
  });
  test("nothing answer-like → null", () => {
    expect(extractScriptAnswer({ ...script, scenes: [{ chapter: "Solve", narration: "", beats: [{ type: "write", text: "work" }] }] } as never)).toBeNull();
  });
});

describe("compareAnswers", () => {
  test("x = 4 matches 4", () => {
    expect(compareAnswers("x = 4", "4")).toBe("match");
  });
  test("units stripped before comparing", () => {
    expect(compareAnswers("a = 3.2 m/s²", "3.2")).toBe("match");
  });
  test("symbolic equivalence: 1/e² matches e^{-2}", () => {
    expect(compareAnswers("1/e²", "e^{-2}")).toBe("match");
  });
  test("plain numeric disagreement is a mismatch", () => {
    expect(compareAnswers("x = 4", "5")).toBe("mismatch");
    expect(compareAnswers("4", "4.5")).toBe("mismatch");
  });
  test("multi-part answers compare pairwise, order-sensitive", () => {
    expect(compareAnswers("x = 4, y = 7", "x = 4, y = 7")).toBe("match");
    expect(compareAnswers("x = 4, y = 7", "x = 7, y = 4")).toBe("mismatch");
  });
  test("part counts differ → incomparable", () => {
    expect(compareAnswers("x = 4, y = 7", "4")).toBe("incomparable");
  });
  test("non-mathematical wording → incomparable", () => {
    expect(compareAnswers("the series converges", "0.135")).toBe("incomparable");
  });
});
