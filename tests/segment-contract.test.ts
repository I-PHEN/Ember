import { describe, expect, test } from "bun:test";
import { sanitizeSegments, sanitizeScript } from "../src/lib/solve-schema";
import { compileTimeline } from "../src/lib/video/compile";
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
