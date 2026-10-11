# Board repair loop implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline. Follow test-first checkpoints.

**Goal:** Give bounded writer retries the rejected board draft and actionable per-step timing measurements.

**Architecture:** The teaching-budget module owns timing diagnostics. The writer runner carries only the latest rejected draft into its next user prompt. Timing validation, exact speech anchors, mathematics checks and measured audio playback remain authoritative.

**Tech Stack:** TypeScript, Bun tests, existing compiler and durable job runner.

## Global constraints

No faster handwriting, artificial waits, narration rewriting, added services, hero changes or main deployment. Keep three writer attempts. Draft content is data, not instructions.

## Task: Targeted repair feedback

- [ ] Add a budget test that requires an overloaded step's actual ink and spoken slice in its error.
- [ ] Extend the durable job regression to require the rejected equation draft in the retry request; run both tests and observe failure.
- [ ] Compute all timing measurements before rejection. Include step number, spoken slice, board beats and required/available seconds in the error. Keep the existing error prefix for compatibility.
- [ ] In writeScene, retain the latest parsed sanitized draft only for timing failures. Pass it as JSON data alongside repair instructions; clear stale feedback for other failures. Never publish rejected drafts.
- [ ] Run focused and full Bun suites, ESLint on changed production files, production webpack build, and diff check.
- [ ] Commit the verified change. Hosted success remains a separate verification, not implied by tests.

Approved design: user approved targeted draft repair on 2026-10-11. Self-review: scope is limited to feedback quality; no fallback bypass or new synchronization model.

## Verification evidence

- Missing rejected-draft and spoken-slice regressions failed before implementation, then passed.
- Review found stale feedback on malformed JSON; the durable sequence overloaded draft → empty object → valid draft failed before the reset fix and passed afterward.
- Failed hosted verification narration is unchanged in the fixture: the verbose check line is rejected, while `3 + 2 = 5` fits at the original handwriting pace.
- Full suite: 157 passed, 1 skipped (real Postgres requires TEST_DATABASE_URL), 0 failed. Changed production files pass ESLint; diff check passes.
- Read-only review: no remaining critical or important findings.
- Hosted generation/playback on this revision is not yet verified; do not infer success from deterministic tests.
