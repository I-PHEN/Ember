import { describe, expect, test } from "bun:test";
import { compileTimeline } from "../src/lib/video/compile";
import { measureText } from "../src/lib/video/text";
import { CAP } from "../src/lib/video/types";
import type { SolveScript } from "../src/lib/video/types";

/* Readable classroom pace, pinned by measurement: this exact 11-char
   md write compiles to writeEnd ~ 13s at the 55px/s base with 0.18s
   air-travel gaps between strokes. The old AI speed (210px/s) rushed 
   through in 4.5s. The window [12.0, 15.0] enforces the methodical pace. */
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
    expect(writeEnd).toBeGreaterThan(12.0);
    expect(writeEnd).toBeLessThan(15.0);
  });
});
