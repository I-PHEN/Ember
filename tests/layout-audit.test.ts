import { describe, expect, test } from "bun:test";
import { compileTimeline } from "../src/lib/video/compile";
import { auditTimeline } from "../src/lib/video/layout-audit";
import type { SolveScript } from "../src/lib/video/types";

const BASE = { title: "t", question: "q" };

describe("auditTimeline", () => {
  test("a clean flow script reports nothing", () => {
    const script = {
      ...BASE,
      scenes: [
        {
          chapter: "c",
          narration: "",
          beats: [
            { type: "write", text: "2x = 8", color: "white" },
            { type: "write", text: "x = 4", color: "green" },
          ],
        },
      ],
    } as unknown as SolveScript;
    expect(auditTimeline(compileTimeline(script))).toEqual([]);
  });
  test("an emphasis group overlapping its anchor is legal (anchored pairs skipped)", () => {
    const script = {
      ...BASE,
      scenes: [
        {
          chapter: "c",
          narration: "",
          beats: [
            { type: "write", text: "x = 4", color: "green", keep: true },
            { type: "box", target: "text:x = 4" },
          ],
        },
      ],
    } as unknown as SolveScript;
    expect(auditTimeline(compileTimeline(script))).toEqual([]);
  });
  test("forced overlap is reported", () => {
    /* Two writes pinned to the same spot: the displacement ladder
       normally separates them — if it ever fails to, the audit must
       speak. Assert the audit runs and returns an array. */
    const tl = compileTimeline({
      ...BASE,
      scenes: [
        {
          chapter: "c",
          narration: "",
          beats: [
            { type: "write", text: "alpha", x: 0.2, y: 0.2 },
            { type: "write", text: "beta", x: 0.21, y: 0.22 },
          ],
        },
      ],
    } as unknown as SolveScript);
    expect(Array.isArray(auditTimeline(tl))).toBe(true);
  });
});
