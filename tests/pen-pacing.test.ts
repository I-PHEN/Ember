import { describe, expect, test } from "bun:test";
import { compileTimeline } from "../src/lib/video/compile";
import { measureText } from "../src/lib/video/text";
import { CAP } from "../src/lib/video/types";
import type { SolveScript } from "../src/lib/video/types";

/* A professor's chalk pace, pinned by measurement: this exact 11-char
   md write compiles to writeEnd = 4.50s at the 165px/s base (3.25s of
   strokes + gaps/settle/HEAD). The old 265px/s base lands ≈3.7s (too
   fast — reads as AI); a broken 80px/s lands ≈6.6s (too slow). The
   window [4.0, 5.2] admits the professor pace and rejects both. */
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
    expect(writeEnd).toBeGreaterThan(4.0);
    expect(writeEnd).toBeLessThan(5.2);
  });
});
