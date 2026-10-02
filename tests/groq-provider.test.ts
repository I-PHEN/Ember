import { describe, expect, test } from "bun:test";
import { buildGroqBody } from "../src/lib/ai/groq";

describe("buildGroqBody", () => {
  test("system + user turns, JSON mode, deterministic shape", () => {
    const body = buildGroqBody("Output JSON only.", "USR", "model-x") as {
      model: string;
      messages: Array<{ role: string; content: string }>;
      temperature: number;
      response_format: { type: string };
    };
    expect(body.model).toBe("model-x");
    expect(body.messages).toEqual([
      { role: "system", content: "Output JSON only." },
      { role: "user", content: "USR" },
    ]);
    expect(body.response_format).toEqual({ type: "json_object" });
  });
  test("guarantees the word json for json_object mode (Groq 400s without it)", () => {
    const without = buildGroqBody("You are a tutor.", "u", "m") as {
      messages: Array<{ content: string }>;
    };
    expect(/\bjson\b/i.test(without.messages[0].content)).toBe(true);
    expect(without.messages[0].content).toContain("You are a tutor.");
    // and does not double-append when the prompt already says JSON
    const withAlready = buildGroqBody("Output ONLY valid JSON.", "u", "m") as {
      messages: Array<{ content: string }>;
    };
    expect(withAlready.messages[0].content).toBe("Output ONLY valid JSON.");
  });
});
