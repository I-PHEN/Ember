# Required review implementation plan

> Execute inline using executing-plans and test-driven-development.

**Goal:** No newly generated lesson becomes watchable unless every delivered scene passes review.
**Architecture:** Dispatch all reviews alongside writers/voice; collect immutable accepted results under a bounded deadline. Only collection applies results. Rewritten scenes require a second gate. No late promise can mutate delivered beats or terminal counters.
**Tech stack:** TypeScript, existing Gemini/Groq call wrapper, Bun tests, existing retry UI.

## Task 1: Immutable collection boundary

Create `src/lib/video/review-gate.ts`, `tests/review-gate.test.ts`.
Interface: `collectSceneReviews<T>(tasks: readonly Promise<T|null>[], timeoutMs:number): Promise<{passed:boolean; results:(T|null)[]; statuses:('passed'|'failed'|'timed-out')[]}>`.

- [ ] Test success, rejection/null, bounded timeout, empty list rejection, and late completion leaving the returned snapshot unchanged. Observe red.
```ts
const result = await collectSceneReviews([Promise.resolve(null)], 20);
expect(result.passed).toBe(false);
```
- [ ] Collect resolved values by index, catch rejection, clear deadline timers, return copied arrays. Deadline marks only unresolved tasks timed-out. Do not accept an empty batch.

## Task 2: Enforce the gate in generation

Modify `src/lib/video-jobs.ts`, `src/lib/video/review.ts`, and `src/app/page.tsx`.

- [ ] Replace review sampling/counters with indexed promises returning accepted sanitized beats or null. Require zero deterministic checker flags and zero standalone layout violations for pass/fix; invalid or rejected fixes fail review.
- [ ] After writers finish, collect with a 30-second deadline. On any failure: phase error, script null, accurate per-scene counts, actionable review failure text. Apply results only after all pass. Voice remains parallel.
- [ ] Any solver-triggered rewrite gets a fresh review promise and a second bounded gate. Update final unique-scene fixed/reviewed counts, not cumulative attempt counts. Block delivery if merged layout fails or a high-confidence solver mismatch remains. Do not overwrite review counters when voices finish.
- [ ] Keep existing explicit Try again workflow; tell users it regenerates the lesson and may incur normal generation costs. No automatic retry loop.
- [ ] Run focused and full tests, lint, build, and baseline typecheck. Inspect every job.script assignment and late callback for a bypass. Document limits; commit separately from matrix work.

## Implemented and verified

- All-scene review is mandatory; accepted results are collected before mutating scene output. Thirty-second collection deadline, failed results, malformed fixes, checker flags, and layout violations block delivery.
- Solver reruns are reviewed again. Final merged layout and remaining high-confidence solver mismatch block delivery. API snapshots independently require all-scene approval and a deliverable phase.
- Tests cover success, failure/null/rejection, deadline, late-result immutability, wrong arithmetic, malformed matrices, discarded/excess correction beats, and actual job snapshot delivery. Full suite: 163 passing tests, 427 assertions. Focused lint and diff whitespace checks pass.
- Existing retry button regenerates the original question; UI now discloses normal generation costs.
- No live-provider success/failure run or browser retry exercise yet. The final build failed because shared node_modules/ai and node_modules/@ai-sdk/google lack package files. Both directories are empty; two install-related Node processes were observed. Do not repair or replace the shared dependency tree while another install may be active. Typecheck also reports those two missing modules, plus the four established gallery/renderer errors.
- Production preview has NOT been restarted onto this review-gate change. Rebuild and restart after the dependency install completes, then validate a fresh end-to-end lesson before curating the three judge-facing starters.
