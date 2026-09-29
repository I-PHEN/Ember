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
