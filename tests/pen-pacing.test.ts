import { describe, expect, test } from "bun:test";
import { compileTimeline } from "../src/lib/video/compile";
import type { SolveScript } from "../src/lib/video/types";

/* Initial Ember calibration, not a claim about any teacher's measured handwriting.
   Curvature-dependent ink and distance-aware pen lifts must not bring back
   the imported engine's twelve-second crawl for this short equation. */
describe("pen pacing", () => {
  test("a mid-size write lands in the professor pace window", () => {
    const script = {
      title: "t",
      question: "q",
      scenes: [
        {
          chapter: "c",
          narration: "",
          beats: [{ type: "write", text: "2x + 5 = 13", color: "white" }],
        },
      ],
    } as unknown as SolveScript;
    const tl = compileTimeline(script);
    const writeEnd = tl.scenes[0].writeEnd;
    expect(writeEnd).toBeGreaterThan(5.5);
    expect(writeEnd).toBeLessThan(8.5);
  });
});
