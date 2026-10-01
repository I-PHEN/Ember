import { describe, expect, test } from "bun:test";
import { checkSceneLines, checkScriptLines } from "../src/lib/video/checker";

describe("checkSceneLines", () => {
  test("the planted wrong equation is caught", () => {
    const r = checkSceneLines(0, [
      { type: "write", text: "Check: 2(4) + 5 = 14", color: "green" },
    ]);
    expect(r.checked).toBe(1);
    expect(r.flags).toHaveLength(1);
    expect(r.flags[0].scene).toBe(0);
    expect(r.flags[0].text).toContain("2(4) + 5");
  });
  test("correct constant arithmetic passes", () => {
    const r = checkSceneLines(1, [{ type: "write", text: "Check: 2(4) + 5 = 13" }]);
    expect(r.checked).toBe(1);
    expect(r.flags).toHaveLength(0);
  });
  test("rounded values within tolerance pass", () => {
    const r = checkSceneLines(0, [{ type: "write", text: "1/3 = 0.333" }]);
    expect(r.checked).toBe(1);
    expect(r.flags).toHaveLength(0);
  });
  test("conditional equations (free variable x) are skipped, not flagged", () => {
    const r = checkSceneLines(0, [{ type: "write", text: "2x = 8" }]);
    expect(r.checked).toBe(0);
    expect(r.skipped).toBe(1);
    expect(r.flags).toHaveLength(0);
  });
  test("unit-bearing lines are skipped naturally", () => {
    const r = checkSceneLines(0, [{ type: "write", text: "a = 3.2 m/s²" }]);
    expect(r.checked).toBe(0);
    expect(r.skipped).toBe(1);
  });
  test("non-equation writes and non-write beats are not counted", () => {
    const r = checkSceneLines(0, [
      { type: "write", text: "GIVEN" },
      { type: "title", text: "Solving together" },
      { type: "box" },
    ]);
    expect(r.checked).toBe(0);
    expect(r.skipped).toBe(0);
  });
});

describe("checkScriptLines", () => {
  test("aggregates across scenes", () => {
    const script = {
      title: "t",
      question: "q",
      scenes: [
        { chapter: "Solve", narration: "", beats: [{ type: "write", text: "2 + 2 = 5" }] },
        { chapter: "Check", narration: "", beats: [{ type: "write", text: "2(4) + 5 = 13" }] },
      ],
    };
    const r = checkScriptLines(script as never);
    expect(r.checked).toBe(2);
    expect(r.flags).toHaveLength(1);
    expect(r.flags[0].scene).toBe(0);
  });
});
