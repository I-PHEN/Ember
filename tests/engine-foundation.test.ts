import { describe, expect, test } from "bun:test";
import { createJobContext, createRng } from "../src/lib/engine/context";
import { mergeScript } from "../src/lib/engine/merger";
import {
  DIRECTOR_SCHEMA,
  PLANNER_SCHEMA,
  SOLVER_SCHEMA,
  REVIEWER_SCHEMA,
} from "../src/lib/engine/schemas";
import { STUDIO_PERSONA } from "../src/lib/engine/persona";

describe("engine foundation: JobContext and PRNG", () => {
  test("createRng produces identical sequence for identical seed", () => {
    const rng1 = createRng("job_12345");
    const rng2 = createRng("job_12345");
    const seq1 = [rng1(), rng1(), rng1()];
    const seq2 = [rng2(), rng2(), rng2()];
    expect(seq1).toEqual(seq2);
    expect(seq1[0]).toBeGreaterThanOrEqual(0);
    expect(seq1[0]).toBeLessThan(1);
  });

  test("createRng produces different sequence for different seed", () => {
    const rng1 = createRng("job_12345");
    const rng2 = createRng("job_99999");
    expect(rng1()).not.toEqual(rng2());
  });

  test("JobContext isolates rate-limit and provider state", () => {
    const ctxA = createJobContext("job_A");
    const ctxB = createJobContext("job_B");

    ctxA.rateLimits.saw429 = true;
    ctxA.providerHops += 2;

    expect(ctxB.rateLimits.saw429).toBe(false);
    expect(ctxB.providerHops).toBe(0);
  });
});

describe("engine foundation: STUDIO_PERSONA", () => {
  test("persona branding is Ember and Professor Ember", () => {
    expect(STUDIO_PERSONA.brandName).toBe("Ember");
    expect(STUDIO_PERSONA.tutorName).toBe("Professor Ember");
    expect(STUDIO_PERSONA.minScenes).toBe(6);
    expect(STUDIO_PERSONA.maxScenes).toBe(10);
  });
});

describe("engine foundation: structured output schemas", () => {
  test("schemas define object types with required fields", () => {
    expect(DIRECTOR_SCHEMA.type).toBe("object");
    expect(DIRECTOR_SCHEMA.required).toEqual(["title", "question", "scenes"]);

    expect(PLANNER_SCHEMA.type).toBe("object");
    expect(PLANNER_SCHEMA.required).toEqual(["scenes"]);

    expect(SOLVER_SCHEMA.type).toBe("object");
    expect(SOLVER_SCHEMA.required).toEqual(["answer", "keySteps"]);

    expect(REVIEWER_SCHEMA.type).toBe("object");
    expect(REVIEWER_SCHEMA.required).toEqual(["verdict"]);
  });
});

describe("engine foundation: mergeScript", () => {
  test("merges outline and results into a valid SolveScript and timeline", () => {
    const outline = {
      title: "Integral of x dx",
      question: "Evaluate int x dx",
      scenes: [{ chapter: "Setup" }, { chapter: "Answer" }],
    };
    const results = [
      {
        narration: "Let us evaluate the integral of x dx.",
        beats: [{ type: "write", text: "∫ x dx" }],
      },
      {
        narration: "The answer is one half x squared plus C.",
        beats: [{ type: "write", text: "½ x² + C" }, { type: "box" }],
      },
    ];
    const stats: { proseDropped?: number; overlapPct?: number | null; layoutViolations?: number | null } = {};
    const merged = mergeScript(outline, results, stats);

    expect(merged).not.toBeNull();
    expect(merged!.script.scenes.length).toBe(2);
    expect(merged!.script.title).toBe("Integral of x dx");
    expect(merged!.timeline.scenes.length).toBe(2);
    expect(typeof merged!.overlapPct).toBe("number");
    expect(stats.overlapPct).toBe(merged!.overlapPct);
  });

  test("rejects scripts with fewer than 2 scenes", () => {
    const outline = {
      title: "T",
      question: "Q",
      scenes: [{ chapter: "One" }],
    };
    const results = [
      { narration: "Only one", beats: [{ type: "write", text: "1" }] },
    ];
    const merged = mergeScript(outline, results);
    expect(merged).toBeNull();
  });
});
