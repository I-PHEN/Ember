import { describe, expect, test } from "bun:test";
import { ProviderError } from "../src/lib/ai/gemini";
import { buildLadder, chatComplete } from "../src/lib/ai/chat";

describe("buildLadder", () => {
  test("reason tier: gemini primary → gemini fallback → groq", () => {
    const l = buildLadder("reason", true);
    expect(l.map((e) => e.kind)).toEqual(["gemini", "gemini", "groq"]);
    expect(l[0].attempts).toBe(2);
  });
  test("fast tier: gemini lite → groq lite", () => {
    const l = buildLadder("fast", true);
    expect(l.map((e) => e.kind)).toEqual(["gemini", "groq"]);
  });
  test("without groq the ladder is gemini-only", () => {
    expect(buildLadder("reason", false).every((e) => e.kind === "gemini")).toBe(true);
  });
});

describe("chatComplete failover", () => {
  test("persistent gemini 503 → hops to the groq entry and succeeds", async () => {
    const seen: string[] = [];
    let hops = 0;
    const r = await chatComplete("s", "u", {
      tier: "reason",
      withGroq: true,
      onHop: () => { hops += 1; },
      transport: async (e) => {
        seen.push(`${e.kind}:${e.model}`);
        if (e.kind === "gemini") throw new ProviderError(503, "overloaded");
        return '{"ok":true}';
      },
    });
    expect(r.text).toBe('{"ok":true}');
    expect(r.hops).toBe(2); // two gemini entries failed first
    expect(hops).toBe(2);
    expect(seen[seen.length - 1].startsWith("groq:")).toBe(true);
  });
  test("429 fires on429 and still fails over", async () => {
    let saw429 = false;
    const r = await chatComplete("s", "u", {
      tier: "fast",
      withGroq: true,
      on429: () => { saw429 = true; },
      transport: async (e) => {
        if (e.kind === "gemini") throw new ProviderError(429, "quota");
        return "ok";
      },
    });
    expect(saw429).toBe(true);
    expect(r.text).toBe("ok");
  });
  test("non-retryable 400 bubbles without trying fallbacks", async () => {
    const seen: string[] = [];
    await expect(
      chatComplete("s", "u", {
        tier: "reason",
        withGroq: true,
        transport: async (e) => {
          seen.push(e.model);
          throw new ProviderError(400, "bad request");
        },
      })
    ).rejects.toThrow("status 400");
    expect(seen).toHaveLength(1);
  });
  test("empty completion counts as failure and fails over", async () => {
    const r = await chatComplete("s", "u", {
      tier: "fast",
      withGroq: true,
      transport: async (e) => (e.kind === "gemini" ? "  " : "real text"),
    });
    expect(r.text).toBe("real text");
    expect(r.hops).toBe(1);
  });
});
