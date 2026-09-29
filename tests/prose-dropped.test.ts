import { describe, expect, test } from "bun:test";
import { sanitizeScript } from "../src/lib/solve-schema";

const ONE_SCENE = (text: string) => ({
  title: "Test lesson",
  question: "q",
  scenes: [
    { chapter: "Step", narration: "so two x equals eight", beats: [{ type: "write", text: "2x = 8", say: "so two x equals eight" }] },
    { chapter: "Why", narration: "the words explain everything here", beats: [{ type: "write", text }] },
  ],
});

describe("sanitizeScript prose collection", () => {
  test("counts dropped prose beats into the collector", () => {
    const stats = { proseDropped: 0 };
    const script = sanitizeScript(ONE_SCENE("Energy is conserved in this system"), stats);
    expect(script).not.toBeNull();
    expect(stats.proseDropped).toBe(1);
    const why = script!.scenes.find((s) => s.chapter === "Why");
    expect(why).toBeUndefined(); // scene died with its only beat
  });
  test("no collector argument still works", () => {
    const script = sanitizeScript(ONE_SCENE("2x + 5 = 13"));
    expect(script!.scenes).toHaveLength(2);
  });
});
