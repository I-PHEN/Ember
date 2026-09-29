import { describe, expect, test } from "bun:test";
import { fitBlockLabel } from "../src/lib/video/compile";

/* the freebody block is hw=24, hh=16 → 48×32 px */
describe("fitBlockLabel", () => {
  test("the reported bug: '5 kg' must fit INSIDE at a reduced cap, not overflow", () => {
    const r = fitBlockLabel("5 kg", 24, 16);
    expect(r.mode).toBe("inside");
    if (r.mode === "inside") expect(r.cap).toBeLessThanOrEqual(18);
  });
  test("single symbols stay full size", () => {
    const r = fitBlockLabel("m", 24, 16);
    expect(r).toEqual({ mode: "inside", cap: 20 });
  });
  test("labels that cannot fit even shrunk go outside", () => {
    expect(fitBlockLabel("MMMM", 24, 16).mode).toBe("outside");
    expect(fitBlockLabel("m₁ m₂", 24, 16).mode).toBe("outside");
  });
});
