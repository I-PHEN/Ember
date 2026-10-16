import { describe, expect, test } from "bun:test";
import { compileTimeline } from "../src/lib/video/compile";
import { CAL } from "../src/lib/video/calibration";
import type { SolveScript } from "../src/lib/video/types";

/* The window is ENGINE-DERIVED from measured constants (see
   docs/research/handwriting-calibration.md) — ±15/20 % around the
   calibrated compile of this fixture. */
describe("pen pacing", () => {
  test("a mid-size write lands in the calibrated pace window", () => {
    const script = {
      title: "t",
      question: "q",
      scenes: [
        { chapter: "c", narration: "", beats: [{ type: "write", text: "2x + 5 = 13", color: "white" }] },
      ],
    } as unknown as SolveScript;
    const writeEnd = compileTimeline(script).scenes[0].writeEnd;
    expect(writeEnd).toBeGreaterThan(CAL.paceWindowSec[0]);
    expect(writeEnd).toBeLessThan(CAL.paceWindowSec[1]);
  });
});
