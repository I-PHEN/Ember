import { describe, expect, test } from "bun:test";
import { sanitizeSceneBeats } from "../src/lib/solve-schema";

const NARRATION = "so two x equals eight and we are nearly done";

describe("sanitizeSceneBeats", () => {
  test("cleans beats exactly like the merge would", () => {
    const beats = sanitizeSceneBeats(
      [
        { type: "write", text: "2x = 8", color: "green" },
        { type: "box", color: "yellow" },
      ],
      NARRATION
    );
    expect(beats).toHaveLength(2);
    expect(beats[0]).toMatchObject({ type: "write", text: "2x = 8" });
  });
  test("drops prose into the collector", () => {
    const stats = { proseDropped: 0 };
    const beats = sanitizeSceneBeats(
      [
        { type: "write", text: "Energy is conserved in this system" },
        { type: "write", text: "2x = 8" },
      ],
      NARRATION,
      stats
    );
    expect(beats).toHaveLength(1);
    expect(stats.proseDropped).toBe(1);
  });
  test("an all-prose fix returns empty (caller rejects it)", () => {
    expect(
      sanitizeSceneBeats([{ type: "write", text: "We subtract five because we want x alone" }], NARRATION)
    ).toHaveLength(0);
  });
  test("non-array input returns empty", () => {
    expect(sanitizeSceneBeats(null, NARRATION)).toHaveLength(0);
  });
});
