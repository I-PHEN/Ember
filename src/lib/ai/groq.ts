/* ------------------------------------------------------------------
   Ember's FALLBACK chat provider — Groq (OpenAI-compatible REST).

   Gemini stays primary for every agent; when it 503s or the key is
   throttled, the engine fails over HERE fast instead of sleeping
   through long backoffs. Every engine chat call wants JSON, so
   json_object mode is on (a reliability win, not a constraint).

   Env (all optional; without a key the ladder simply skips Groq):
     GROQ_API_KEY      enables the fallback hop
     GROQ_MODEL        reason tier   (default from the 2026-09-29 probe)
     GROQ_MODEL_LITE   fast tier
------------------------------------------------------------------- */

import { ProviderError } from "./gemini";

const BASE = "https://api.groq.com/openai/v1/chat/completions";

export const GROQ_MODEL =
  process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";
export const GROQ_MODEL_LITE =
  process.env.GROQ_MODEL_LITE ?? "qwen/qwen3.8-27b";

export function groqEnabled(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

/** pure request-body builder — exported so tests assert shape, no network */
export function buildGroqBody(
  system: string,
  user: string,
  model: string
): Record<string, unknown> {
  return {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  };
}

export async function groqChat(
  system: string,
  user: string,
  model: string
): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new ProviderError(500, "GROQ_API_KEY is not set");
  }
  const r = await fetch(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(buildGroqBody(system, user, model)),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new ProviderError(r.status, text.slice(0, 300));
  }
  const data = (await r.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return (data.choices?.[0]?.message?.content ?? "").trim();
}
