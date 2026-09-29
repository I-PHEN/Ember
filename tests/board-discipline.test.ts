import { describe, expect, test } from "bun:test";
import { isBoardProse } from "../src/lib/solve-schema";

describe("isBoardProse — prose that must be dropped", () => {
  test("6-word claim, no math, no connective", () => {
    expect(isBoardProse("Energy is conserved in this system")).toBe(true);
  });
  test("prose with an equals sign no longer bypasses", () => {
    expect(isBoardProse("because a = F/m the block speeds up")).toBe(true);
    expect(isBoardProse("notice that x = 4 is a solution")).toBe(true);
  });
  test("article-heavy medium lines are prose", () => {
    expect(isBoardProse("The total mechanical energy stays constant")).toBe(true);
  });
  test("classic explanation sentences", () => {
    expect(isBoardProse("We subtract 5 because we want x alone")).toBe(true);
    expect(isBoardProse("Notice that the twos cancel out")).toBe(true);
  });
});

describe("isBoardProse — board work that must survive", () => {
  test("equations and values", () => {
    expect(isBoardProse("2x + 5 = 13")).toBe(false);
    expect(isBoardProse("v₀ = 0, a = 3 m/s²")).toBe(false);
    expect(isBoardProse("KE = ½mv²")).toBe(false);
    expect(isBoardProse("Check: 2(4) + 5")).toBe(false);
  });
  test("short labels and operation tags", () => {
    expect(isBoardProse("− 5 both sides")).toBe(false);
    expect(isBoardProse("GIVEN")).toBe(false);
    expect(isBoardProse("Find: acceleration")).toBe(false);
  });
  test("audience-facing pause-and-predict questions", () => {
    expect(isBoardProse("Your turn: what's next?")).toBe(false);
    expect(isBoardProse("Quick check: what is v at t = 2?")).toBe(false);
  });
  test("mathy multi-part lines", () => {
    expect(isBoardProse("x = 4 and y = 7")).toBe(false);
    expect(isBoardProse("W = F·d·cosφ = 12 J")).toBe(false);
  });
});
