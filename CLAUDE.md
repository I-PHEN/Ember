# Ember

Paste any problem — Professor Ember plans the lesson, a marker hand
writes the board, a calm voice teaches it. A real, seekable video.

## Commands

- Dev: `npm run dev` (port 3000 — keep it running; the user checks the app after every piece of work)
- Tests: `bun test` (bun:test, tests/ is tracked; tsconfig excludes it)
- Watch-page screenshot: `node scripts/drive-watch.mjs [out.png]` (puppeteer-core + headless chromium)
- Live eval: `bun scripts/eval/run-eval.ts [fixtureId]` (needs dev server + quota; asserts prose/say/overlap/layout gates)
- `scripts/` is gitignored by project convention (local tooling); `docs/` is tracked

## AI provider (Gemini primary, Groq fallback)

`src/lib/ai/chat.ts` — ONE entry point (`chatComplete`) with the tier
routing table + failover ladder: reason = gemini-3.8-flash ×2 →
gemini-3.7-flash → Groq `openai/gpt-oss-120b`; fast = gemini-3.5-flash-lite
×2 → Groq `qwen/qwen3.8-27b`. Short delays only — never long backoffs.
`src/lib/ai/gemini.ts` (REST) + `src/lib/ai/groq.ts` (OpenAI-compatible,
json_object mode — the word "json" is guaranteed in the prompt, Groq 400s
without it). Keys in `.env` (never committed): GEMINI_API_KEY (required),
GROQ_API_KEY (fallback), OPENROUTER_ (spare). Voice: `gemini-3.8-flash-lite-tts`,
prebuilt **Aoede** (legacy "jam" normalizes) — no fallback by design.
The 3.x family REJECTS thinkingBudget 0 — all calls use dynamic (-1).
nerdamer (`Algebra.js` side-load for `.simplify()`) does symbolic answer
comparison; board `^{…}` groups convert to parens first.

## Brand (frozen unless the user asks)

Warm charcoal studio, base #111315 (never change the background color),
one accent amber #e6b784, Geist Sans/Mono + BoardHand on boards only,
glassy header/composer, the spark-swash mark. Atmosphere = surface only
(grain + light pool + 26s breathing lamp at z-index:-1) — never floating
objects. Full tokens: docs/superpowers/specs/2026-09-28-ember-rebrand-finish-design.md

## Engine (the product)

`src/lib/video-jobs.ts`: director → transcript planner → writers×3 →
merge/sanitize/compile → deliver at "voicing"; voice queue flushes in
playback order the moment a writer lands. Streaming contract is sacred:
nothing serializes the pipeline. Verification rides alongside: a BLIND
SOLVER (t0, question only, reason tier), a pure-Node CHECKER
(`checker.ts`, constant-identity equation checks per scene at
writer-land), and a REVIEWER (`review.ts` + `REVIEWER_SYSTEM`, async
per-scene review-and-fix for EVERY scene, collected at merge with a 30s
deadline; failed/timed-out reviews block delivery and offer regeneration.
Accepted beats must pass sanitize + checker + layout checks; late results
cannot mutate shipped scenes. Solver-triggered rewrites are reviewed again).
At merge: solver vs script-answer compare (`solver.ts`, conservative —
murky = "incomparable"); high-confidence mismatch → ONE rerun of the
solve-chain scenes with the discrepancy note; a remaining mismatch or final
layout violation blocks delivery. Voice generation remains parallel.
Prompts: `src/lib/prompts.ts` (WRITER_SYSTEM is a static prefix — keep
dynamic content in the user turn). Board discipline: `isBoardProse` +
`stats.proseDropped/overlapPct/layoutViolations`. Canvas integrity:
`layout-audit.ts` + clearance in `compile.ts`. Pen pace uses the deterministic
`kinematics.ts` profile in canonical board coordinates; preserve the regression
window in tests/pen-pacing.test.ts. These are Ember calibration values, not
experimentally validated biological constants. Measured speech timing remains
owned by timeline-timing.ts; do not reintroduce a second retiming pass.
Stats worth knowing: `watchableMs` (delivery), `providerHops` (failovers),
`reviewedScenes/fixedScenes/unreviewedScenes`, `checkerChecked/checkerFlags`,
`verification {verdict, solverAnswer, scriptAnswer, rerun}`. Progress %
for the UI is server-computed (`progress.ts`), monotonic, never 100
before ready. Reviewer drill: `touch scripts/plant-bad-beat.flag` plants
a wrong beat the reviewer must catch.

## Working rhythm the user expects

Plan before code (brainstorm → spec → plan → execute, one phase at a
time); build a piece → user checks the running app → move on; commit
per task with clear messages ending `Co-Authored-By: Claude Code
<noreply@anthropic.com>`; verify with real screenshots/drives, not
assumptions.
