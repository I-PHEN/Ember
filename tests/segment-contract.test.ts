import { describe, expect, test } from "bun:test";
import { sanitizeSegments, sanitizeScript } from "../src/lib/solve-schema";
import {
  compileTimeline,
  computeSegmentGaps,
  deriveSegmentMode,
  SAY_T0,
  splitNarrationIntoSegments,
} from "../src/lib/video/compile";
import { mergeScript } from "../src/lib/engine/merger";
import type { SolveScript } from "../src/lib/video/types";

describe("Segment Contract ({say, ink})", () => {
  test("sanitizeSegments normalizes segments and binds say to each ink beat", () => {
    const rawSegments = [
      {
        say: "First, let's write down the quadratic equation.",
        ink: [
          { type: "write", text: "ax^2 + bx + c = 0", color: "yellow" },
        ],
      },
      {
        say: "Now we identify our known coefficients.",
        ink: [
          { type: "write", text: "a = 1, b = -5, c = 6", color: "white" },
        ],
      },
    ];

    const segs = sanitizeSegments(rawSegments);
    expect(segs.length).toBe(2);
    expect(segs[0].say).toBe("First, let's write down the quadratic equation.");
    expect(segs[0].ink?.length).toBe(1);
    expect(segs[0].ink?.[0].say).toBe("First, let's write down the quadratic equation.");

    expect(segs[1].say).toBe("Now we identify our known coefficients.");
    expect(segs[1].ink?.length).toBe(1);
    expect(segs[1].ink?.[0].say).toBe("Now we identify our known coefficients.");
  });

  test("sanitizeScript derives narration and beats from segments when omitted", () => {
    const rawScript = {
      title: "Solving Quadratics",
      question: "Solve x^2 - 5x + 6 = 0",
      scenes: [
        {
          chapter: "Setup",
          segments: [
            {
              say: "Step one is writing the standard form.",
              ink: [{ type: "write", text: "x^2 - 5x + 6 = 0", color: "white" }],
            },
            {
              say: "We factor into two binomials.",
              ink: [{ type: "write", text: "(x - 2)(x - 3) = 0", color: "green" }],
            },
          ],
        },
      ],
    };

    const script = sanitizeScript(rawScript);
    expect(script).not.toBeNull();
    const scene = script!.scenes[0];
    expect(scene.segments).toBeDefined();
    expect(scene.segments?.length).toBe(2);
    // Narration joined from segment says
    expect(scene.narration).toBe(
      "Step one is writing the standard form. We factor into two binomials."
    );
    // Beats flattened from segment ink
    expect(scene.beats.length).toBe(2);
    expect(scene.beats[0].text).toBe("x² - 5x + 6 = 0");
    expect(scene.beats[1].text).toBe("(x - 2)(x - 3) = 0");
  });

  test("compileTimeline paces ink within segment time boundaries", () => {
    const script: SolveScript = {
      title: "Factoring Demo",
      question: "Factor x^2 - 4",
      scenes: [
        {
          chapter: "Factoring",
          narration: "Here is the difference of squares formula. Notice how the middle terms cancel out completely.",
          segments: [
            {
              say: "Here is the difference of squares formula.",
              ink: [{ type: "write", text: "a^2 - b^2 = (a-b)(a+b)", color: "white" }],
            },
            {
              say: "Notice how the middle terms cancel out completely.",
              ink: [{ type: "write", text: "(x - 2)(x + 2) = 0", color: "green" }],
            },
          ],
          beats: [
            { type: "write", text: "a^2 - b^2 = (a-b)(a+b)", color: "white" },
            { type: "write", text: "(x - 2)(x + 2) = 0", color: "green" },
          ],
        },
      ],
    };

    const timeline = compileTimeline(script);
    expect(timeline.scenes.length).toBe(1);
    const scene = timeline.scenes[0];

    // Total scene duration should cover the full narration
    expect(scene.dur).toBeGreaterThan(3);

    // Segment 1 groups should be born early, segment 2 group born after segment 1
    const g1 = scene.groups.find((g) => g.text?.includes("a^2 - b^2"));
    const g2 = scene.groups.find((g) => g.text?.includes("(x - 2)"));

    expect(g1).toBeDefined();
    expect(g2).toBeDefined();
    expect(g2!.born).toBeGreaterThan(g1!.born);
  });

  test("legacy scripts without segments continue to compile with backwards compatibility", () => {
    const script: SolveScript = {
      title: "Legacy Script",
      question: "2 + 2",
      scenes: [
        {
          chapter: "Legacy Step",
          narration: "Two plus two equals four.",
          beats: [
            { type: "title", text: "Simple Math", color: "yellow" },
            { type: "write", text: "2 + 2 = 4", color: "white" },
          ],
        },
      ],
    };

    const timeline = compileTimeline(script);
    expect(timeline.scenes.length).toBe(1);
    expect(timeline.scenes[0].groups.length).toBeGreaterThan(0);
    expect(timeline.scenes[0].strokes.length).toBeGreaterThan(0);
    expect(timeline.scenes[0].dur).toBeGreaterThan(0);
  });

  test("mergeScript passes segments through to compiled timeline", () => {
    const outline = {
      title: "Merge Test",
      question: "Test question",
      scenes: [
        { chapter: "Step 1", goal: "Intro", summary: "First step" },
        { chapter: "Step 2", goal: "Solve", summary: "Second step" },
      ],
    };

    const results = [
      {
        narration: "We begin by stating the problem clearly.",
        beats: [{ type: "write", text: "x = 42", color: "white" }],
        segments: [
          {
            say: "We begin by stating the problem clearly.",
            ink: [{ type: "write", text: "x = 42", color: "white" }],
          },
        ],
      },
      {
        narration: "Next we verify the solution in the original equation.",
        beats: [{ type: "write", text: "42 = 42", color: "green" }],
        segments: [
          {
            say: "Next we verify the solution in the original equation.",
            ink: [{ type: "write", text: "42 = 42", color: "green" }],
          },
        ],
      },
    ];

    const merged = mergeScript(outline, results);
    expect(merged).not.toBeNull();
    expect(merged!.script.scenes[0].segments).toBeDefined();
    expect(merged!.script.scenes[0].segments?.length).toBe(1);
    expect(merged!.timeline.scenes[0].segments).toBeDefined();
  });
});

describe("sanitizeSegments v2 fields", () => {
  test("keeps valid mode and clamps pauseAfter", () => {
    const segs = sanitizeSegments([
      { say: "Now we write the formula.", ink: [{ type: "write", text: "u = x" }], mode: "parallel", pauseAfter: 9 },
      { say: "Let that land.", mode: "pause", pauseAfter: 0.3 },
      { say: "Bad mode.", mode: "karaoke", pauseAfter: "no" },
    ]);
    expect(segs.length).toBe(3);
    expect(segs[0].mode).toBe("parallel");
    expect(segs[0].pauseAfter).toBe(2.5); // clamped
    expect(segs[1].mode).toBe("pause");
    expect(segs[1].pauseAfter).toBe(0.3);
    expect(segs[2].mode).toBeUndefined();
    expect(segs[2].pauseAfter).toBeUndefined();
  });
});

describe("Sync V2 M2 — segment-anchored compiler, gap sizing, and sentence-split fallback", () => {
  test("anchors each segment beat group t0 to measured cue.t0 + SAY_T0 and preserves calibrated stroke durations", () => {
    const script: SolveScript = {
      title: "Anchored Sync Demo",
      question: "Solve 2x + 5 = 13",
      scenes: [
        {
          chapter: "Step 1",
          narration:
            "First let us frame the linear equation. We write two x plus five equals thirteen. Subtracting five gives x equals four.",
          segments: [
            {
              say: "First let us frame the linear equation.",
              ink: [],
            },
            {
              say: "We write two x plus five equals thirteen.",
              ink: [{ type: "write", text: "2x + 5 = 13", color: "white" }],
            },
            {
              say: "Subtracting five and dividing by two gives x equals four.",
              ink: [{ type: "write", text: "x = 4", color: "green" }],
            },
            {
              say: "Let that result land.",
              ink: [],
              pauseAfter: 2.0,
            },
          ],
          beats: [
            { type: "write", text: "2x + 5 = 13", color: "white" },
            { type: "write", text: "x = 4", color: "green" },
          ],
          audio: {
            key: "stitched-key",
            dur: 16.5,
            segments: [
              { i: 0, t0: 0, t1: 2.4 },
              { i: 1, t0: 2.75, t1: 6.2 },
              { i: 2, t0: 9.1, t1: 14.5 },
              { i: 3, t0: 14.85, t1: 16.0 },
            ],
          },
        },
      ],
    };

    const tl = compileTimeline(script);
    const scene = tl.scenes[0];

    const gEq = scene.groups.find((g) => g.text === "2x + 5 = 13");
    const gAns = scene.groups.find((g) => g.text === "x = 4");
    expect(gEq).toBeDefined();
    expect(gAns).toBeDefined();

    // Beat t0 == segment cue.t0 + SAY_T0
    expect(gEq!.born).toBeCloseTo(2.75 + SAY_T0, 3);
    expect(gEq!.strokes[0].t0).toBeCloseTo(2.75 + SAY_T0, 3);
    expect(gAns!.born).toBeCloseTo(9.1 + SAY_T0, 3);
    expect(gAns!.strokes[0].t0).toBeCloseTo(9.1 + SAY_T0, 3);

    // Derived modes populated: speak_ahead, write_ahead (ink > 3.45s speech), parallel (ink < 4.4s speech), pause
    expect(scene.segments?.[0].mode).toBe("speak_ahead");
    expect(scene.segments?.[1].mode).toBe("write_ahead");
    expect(scene.segments?.[2].mode).toBe("parallel");
    expect(scene.segments?.[3].mode).toBe("pause");
  });

  test("computeSegmentGaps sizes write_ahead gaps by penDeficit", () => {
    const segments = [
      { say: "Short speech, long equation.", ink: [{ type: "write" as const, text: "I² = [∫ e^{-x²} dx] · [∫ e^{-y²} dy]" }] },
      { say: "Closing thought.", ink: [] },
    ];
    // Speech is 1.5s, calibrated ink takes 3.2s -> penDeficit = 0.08 + 3.2 - 1.5 = 1.78s
    const gaps = computeSegmentGaps(segments, [1.5, 2.0], [3.2, 0]);
    expect(gaps.length).toBe(1);
    expect(gaps[0]).toBeCloseTo(1.78, 2);
    expect(deriveSegmentMode(segments[0], 1.5, 3.2)).toBe("write_ahead");
  });

  test("splitNarrationIntoSegments splits legacy scenes on sentence boundaries and binds beats", () => {
    const narration =
      "Let us introduce the problem first. Next we write down the linear equation. Finally we isolate x to get four.";
    const beats = [
      { type: "write" as const, text: "2x + 5 = 13", color: "white" as const },
      { type: "write" as const, text: "x = 4", color: "green" as const },
      { type: "box" as const, target: "text:x = 4", color: "yellow" as const },
    ];
    const segs = splitNarrationIntoSegments(narration, beats);
    expect(segs.length).toBe(3);
    expect(segs[0].say).toBe("Let us introduce the problem first.");
    // Sentence 0 is left as spoken lead-in because 3 sentences > 2 beat groups
    expect(segs[0].ink).toBeUndefined();
    expect(segs[1].ink?.length).toBe(1);
    expect(segs[1].ink?.[0]).toMatchObject({ type: "write", text: "2x + 5 = 13" });
    expect(segs[2].ink?.length).toBe(2); // write + trailing box
    expect(segs[2].ink?.[1]).toMatchObject({ type: "box" });
  });
});
