# Ember

Paste any problem — Professor Ember plans the lesson, a marker hand
writes the board, a calm voice teaches it. A real, seekable video.

## Commands

- Dev: `npm run dev` (port 3000 — keep it running; the user checks the app after every piece of work)
- Tests: `bun test` (bun:test, tests/ is tracked; tsconfig excludes it)
- Watch-page screenshot: `node scripts/drive-watch.mjs [out.png]` (puppeteer-core + headless chromium)
- Live eval: `bun scripts/eval/run-eval.ts [fixtureId]` (needs dev server + quota; asserts prose/say/overlap/layout gates)
- `scripts/` is gitignored by project convention (local tooling); `docs/` is tracked

## AI provider (no z-ai — removed)

`src/lib/ai/gemini.ts` — plain REST to Google AI Studio. Keys in `.env`
(never committed): GEMINI_API_KEY (required), GROQ_/OPENROUTER_ (spare).
Routing: `gemini-3.8-flash` = reason tier (director/planner);
`gemini-3.5-flash-lite` = fast tier (writers); `gemini-3.8-flash-lite-tts`
= Professor Ember's voice (prebuilt voice **Aoede**; legacy "jam" normalizes).
The 3.x family REJECTS thinkingBudget 0 — all calls use dynamic (-1).

## Brand (frozen unless the user asks)

Warm charcoal studio, base #111315 (never change the background color),
one accent amber #e6b784, Geist Sans/Mono + BoardHand on boards only,
glassy header/composer, the spark-swash mark. Atmosphere = surface only
(grain + light pool + 26s breathing lamp at z-index:-1) — never floating
objects. Full tokens: docs/superpowers/specs/2026-09-28-ember-rebrand-finish-design.md

## Engine (the product)

`src/lib/video-jobs.ts`: director → transcript planner → writers×3 →
voice queue (playback order) → merge/sanitize/compile → deliver at
"voicing". Streaming contract is sacred: nothing serializes the pipeline.
Deterministic before LLM; every failure has a fallback. Prompts:
`src/lib/prompts.ts` (WRITER_SYSTEM is a static prefix — keep dynamic
content in the user turn). Board discipline: `isBoardProse` +
`stats.proseDropped/overlapPct/layoutViolations`. Canvas integrity:
`layout-audit.ts` + clearance in `compile.ts`. Pen pace: 165 px/s
professor chalk (tests/pen-pacing.test.ts pins it — do not speed up).

## Working rhythm the user expects

Plan before code (brainstorm → spec → plan → execute, one phase at a
time); build a piece → user checks the running app → move on; commit
per task with clear messages ending `Co-Authored-By: Claude Code
<noreply@anthropic.com>`; verify with real screenshots/drives, not
assumptions.
