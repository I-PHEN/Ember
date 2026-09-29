import { describe, expect, test } from "bun:test";
import { WRITER_SYSTEM, writerUser } from "../src/lib/prompts";

describe("writer prompt layout (prefix-cache friendly)", () => {
  test("system contract is stable and substantial", () => {
    expect(WRITER_SYSTEM.length).toBeGreaterThan(2000);
    expect(WRITER_SYSTEM).toContain("BEAT TYPES");
    expect(WRITER_SYSTEM).not.toContain("scene 1 of"); // no dynamic content leaked in
  });
  test("identical prefix across different scenes — dynamic content lives in the user turn", () => {
    const u1 = writerUser('{"title":"T"}', 0, "some words", "a graph", "a balance scale");
    const u2 = writerUser('{"title":"T"}', 7, null);
    expect(u1).toContain("scene 1 of");
    expect(u2).toContain("scene 8 of");
    expect(u1).toContain("some words");
    expect(u2).toContain("write the scene's narration yourself");
  });
});
