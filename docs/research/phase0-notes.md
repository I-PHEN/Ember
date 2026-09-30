# Phase 0 findings — Gemini provider (2026-09-29)

Provider swapped: z-ai-web-dev-sdk removed; all chat + TTS now via
`src/lib/ai/gemini.ts` (plain REST, zero new deps). Keys live in `.env`
(GEMINI_API_KEY; GROQ_/OPENROUTER_ kept for future tiers).

Probe results (live key):

| Model | Thinking | Result |
|---|---|---|
| gemini-3.8-flash | budget 0 | 503 (rejected) |
| gemini-3.8-flash | dynamic (-1) | OK, ~5.5s |
| gemini-flash-latest / 3.7-flash | budget 0 | 503 |
| gemini-3.7-flash | dynamic (-1) | OK, ~5.7s |
| gemini-3.5-flash-lite | budget 0 | 400 (rejected) |
| gemini-3.5-flash-lite | dynamic (-1) | OK, ~1.0s |
| gemini-3.8-flash-lite (chat) | — | 404 — does not exist as a chat model (3.8 "lite" is TTS-only) |
| gemini-3.8-flash-lite-tts | — | OK — 58KB audio for "Hello." |

Routing table (baked into gemini.ts):
- **reason tier** (director / planner / future solver): `gemini-3.8-flash`
- **fast tier** (writers / future reviewer): `gemini-3.5-flash-lite`
- **voice**: `gemini-3.8-flash-lite-tts`, prebuilt voice `Aoede`
  (legacy "jam" from the client normalizes to it)

Key constraint discovered: the 3.x family REJECTS thinkingBudget 0 —
every call runs thinking. Latency is acceptable (lite ≈ 1s) and matches
the spec's intent (thinking on for reasoning steps).

## Groq fallback (2026-09-30 probe, live key)

`scripts/probe-groq.mjs` against the account's GROQ_API_KEY. Available
chat models: gpt-oss-120b, gpt-oss-20b, qwen3.8-27b, allam-2-7b (+ tts/
whisper models). `llama-3.1-8b-instant` does NOT exist on this account.

Chosen defaults (baked into `src/lib/ai/groq.ts`, env-overridable):
- **reason tier**: `openai/gpt-oss-120b` — OK, ~500ms
- **fast tier**: `qwen/qwen3.8-27b` — OK, ~290ms (3× faster than
  gpt-oss-20b's ~1s; writers fan out 3-concurrent on failover, so the
  quickest capable model wins)

All engine chat calls are JSON agents, so Groq calls run with
`response_format: json_object`.

## Thinking-budget probe, lite tier (2026-09-30)

`scripts/probe-thinking.mjs`, gemini-3.5-flash-lite, 3 runs per budget
(trivial 1-word call): dynamic (-1) median 1035ms; 2048 → 1091ms;
1024 → 935ms; 512 → 818ms; 256 → 972ms; 0 → rejected (400/429), as
before. Best case (512) is ~21% faster than dynamic — below the 30%
adoption bar on a call that barely thinks. **No-go: the dynamic budget
(-1) stays everywhere.** Writer latency is dominated by retries and
rate-limit contention, not thinking — which is what the failover
ladder fixes.
