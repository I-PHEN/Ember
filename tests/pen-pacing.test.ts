import { describe, expect, test } from "bun:test";
import { compileTimeline } from "../src/lib/video/compile";
import { measureText } from "../src/lib/video/text";
import { CAP } from "../src/lib/video/types";
import type { SolveScript } from "../src/lib/video/types";

/* Natural blackboard pace: this 11-char write compiles to writeEnd ~ 8.8s
   at the ~180-240px/s kinematic speed with biomechanical hesitations.
   The window [7.0, 11.0] enforces brisk yet legible writing. */
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
    expect(writeEnd).toBeGreaterThan(7.0);
    expect(writeEnd).toBeLessThan(11.0);
  });
});
