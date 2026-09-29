import { describe, expect, test } from "bun:test";
import { compileTimeline } from "../src/lib/video/compile";
import { auditTimeline } from "../src/lib/video/layout-audit";
import type { SolveScript } from "../src/lib/video/types";

/* Regression: a long title wraps to two lines at cap-title size; the
   flow cursor must clear the WRAPPED title's real bottom, not a fixed
   one-line step — else the first write lands on the second title line
   (live defect caught by the layout audit, 2026-09-29). */
describe("title clearance", () => {
  test("a wrapping title leaves clean room for the next write", () => {
    const script = {
      title: "t",
      question: "q",
      scenes: [
        {
          chapter: "c",
          narration: "",
          beats: [
            {
              type: "title",
              text: "Solving a Linear Equation: 2x + 5 = 13",
              color: "yellow",
            },
            { type: "write", text: "2x + 5 = 13", color: "blue" },
          ],
        },
      ],
    } as unknown as SolveScript;
    const tl = compileTimeline(script);
    expect(auditTimeline(tl)).toEqual([]);
  });
});
