import { describe, expect, test } from "bun:test";
import { scriptOverlap } from "../src/lib/video/overlap";

/* The stats wiring itself is inside runJob (needs live LLM calls); the
   deterministic half — the value that gets stored — is what we test. */
describe("the value stored in stats.overlapPct", () => {
  test("disjoint boards produce 0", () => {
    const script = {
      title: "t", question: "q",
      scenes: [
        { chapter: "a", narration: "so two x equals eight", beats: [{ type: "write", text: "2x = 8" }] },
      ],
    };
    expect(Math.round(scriptOverlap(script as never) * 100)).toBe(0);
  });
});
