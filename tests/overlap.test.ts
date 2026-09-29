import { describe, expect, test } from "bun:test";
import { contentWords, contentWordOverlap, scriptOverlap } from "../src/lib/video/overlap";

describe("contentWords", () => {
  test("lowercases, strips stopwords and punctuation", () => {
    expect(contentWords("The quick, brown fox!")).toEqual(["quick", "brown", "fox"]);
  });
});

describe("contentWordOverlap", () => {
  test("disjoint board and narration → 0", () => {
    expect(contentWordOverlap(["2x = 8"], "so two x equals eight and we are nearly done")).toBe(0);
  });
  test("identical words → 1", () => {
    expect(contentWordOverlap(["energy conserved system"], "energy is conserved in the system")).toBe(1);
  });
  test("partial overlap is between 0 and 1", () => {
    const v = contentWordOverlap(["given mass five kg"], "the mass is five kilograms today");
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
  });
  test("empty inputs → 0", () => {
    expect(contentWordOverlap([], "some narration")).toBe(0);
    expect(contentWordOverlap(["x = 1"], "")).toBe(0);
  });
});

describe("scriptOverlap", () => {
  test("weights scenes by length", () => {
    const script = {
      title: "t",
      question: "q",
      scenes: [
        { chapter: "a", narration: "energy is conserved in the system", beats: [{ type: "write", text: "energy conserved system" }] },
        { chapter: "b", narration: "so two x equals eight", beats: [{ type: "write", text: "2x = 8" }] },
      ],
    };
    expect(scriptOverlap(script as never)).toBe(0.5);
  });
});
