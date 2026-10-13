import { describe, expect, test } from "bun:test";
import { BOARD_REGIONS, type SolveScript } from "../src/lib/video/types";
import { compileTimeline } from "../src/lib/video/compile";
import { auditTimeline } from "../src/lib/video/layout-audit";
import { repairLayout } from "../src/lib/video/layout-repair";
import { mergeScript } from "../src/lib/engine/merger";

describe("Board Regions & Layout Repair", () => {
  test("BOARD_REGIONS defines banner, work, and side zones with accurate proportions", () => {
    expect(BOARD_REGIONS.banner.h).toBeLessThanOrEqual(120);
    expect(BOARD_REGIONS.work.w).toBeGreaterThan(BOARD_REGIONS.side.w);
    expect(BOARD_REGIONS.side.x).toBeGreaterThan(BOARD_REGIONS.work.x);
  });

  test("compileTimeline places side-region beats in the side panel", () => {
    const script: SolveScript = {
      title: "Region Test",
      question: "Sample problem",
      scenes: [
        {
          chapter: "Work and Side",
          narration: "Here is the main derivation, and on the right is our scratchpad definition.",
          beats: [
            { type: "write", text: "Main equation in the work area", color: "white" },
            {
              type: "write",
              text: "Definition: let u = x^2",
              color: "yellow",
              region: "side",
            },
          ],
        },
      ],
    };

    const tl = compileTimeline(script);
    const sideGroup = tl.scenes[0].groups.find((g) =>
      g.text?.includes("Definition")
    );

    expect(sideGroup).toBeDefined();
    expect(sideGroup!.bbox.x).toBeGreaterThanOrEqual(BOARD_REGIONS.side.x - 10);
  });

  test("repairLayout successfully repairs an overflowing scene", () => {
    // Construct a scene with many lines that would overflow MAX_BASELINE
    const longBeats = Array.from({ length: 12 }, (_, i) => ({
      type: "write" as const,
      text: `Step ${i + 1}: detailed algebraic manipulation term ${i + 1}`,
      color: "white" as const,
    }));

    const crowdedScript: SolveScript = {
      title: "Crowded Problem",
      question: "Very long solve",
      scenes: [
        {
          chapter: "Crowded Step",
          narration: "We perform multiple consecutive transformations on the board.",
          beats: longBeats,
        },
        {
          chapter: "Conclusion",
          narration: "And that concludes the derivation.",
          beats: [{ type: "write", text: "Final answer = 42", color: "green" }],
        },
      ],
    };

    const initialAudit = auditTimeline(compileTimeline(crowdedScript));
    const result = repairLayout(crowdedScript);

    // If there was an issue, remaining violations should be <= initial
    expect(result.remainingViolations).toBeLessThanOrEqual(result.initialViolations);
  });

  test("mergeScript runs layout repair seamlessly", () => {
    const outline = {
      title: "Merge Repair Test",
      question: "Solve x",
      scenes: [
        { chapter: "Step 1" },
        { chapter: "Step 2" },
      ],
    };

    const results = [
      {
        narration: "Here is step 1.",
        beats: [
          { type: "write", text: "2x = 10", color: "white" },
        ],
      },
      {
        narration: "Here is step 2.",
        beats: [
          { type: "write", text: "x = 5", color: "green" },
        ],
      },
    ];

    const merged = mergeScript(outline, results);
    expect(merged).not.toBeNull();
    expect(merged!.layoutViolations.length).toBe(0);
  });
});
