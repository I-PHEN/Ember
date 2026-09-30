import { describe, expect, test } from "bun:test";
import { buildGroqBody } from "../src/lib/ai/groq";

describe("buildGroqBody", () => {
  test("system + user turns, JSON mode, deterministic shape", () => {
    const body = buildGroqBody("SYS", "USR", "model-x") as {
      model: string;
      messages: Array<{ role: string; content: string }>;
      temperature: number;
      response_format: { type: string };
    };
    expect(body.model).toBe("model-x");
    expect(body.messages).toEqual([
      { role: "system", content: "SYS" },
      { role: "user", content: "USR" },
    ]);
    expect(body.response_format).toEqual({ type: "json_object" });
  });
});
