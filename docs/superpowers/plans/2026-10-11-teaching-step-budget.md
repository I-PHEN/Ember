# Teaching Step Budget Repair

> Execute inline with superpowers:executing-plans; preserve the existing isolated workspace.

**Goal:** Prevent the reproduced 8.16-second answer recording from failing because its emphasis box adds 16.3 seconds of motion.

**Approved design:** Preserve readable symbol-writing speed and real-audio validation. Use independent, natural motion for measured-step emphasis marks. Compile planned steps without recording-dependent timing to check their ink budget before synthesis. Retry overfull writer output with concrete simplification feedback; never alter saved narration or pad audio with silence.

**Constraints:** No main-project deployment, paid services, database writes/migrations, hero changes, or saved-recording rewrites.

## Task 1: Emphasis pacing

- [ ] Add regression in `tests/measured-playback.test.ts` with the exact failed answer narration, `x = 3` large write, box, and 8.16-second audio; assert compilation succeeds, box finishes within three seconds, and writing stroke timings match the unboxed version.
- [ ] Observe failure with `bun test tests/measured-playback.test.ts`.
- [ ] Add an explicit gesture speed to `addPaths` for measured-step emphasis only; preserve legacy timing and handwriting speed.

## Task 2: Pre-recording budget

- [ ] Add `tests/teaching-budget.test.ts`: reject a long equation with two spoken words; accept the reproduced answer; return concrete required ink seconds and available speech seconds.
- [ ] Add an explicit compiler measurement mode, without fake audio durations or persistent mutations, and a pure budget check for planned speech slices.
- [ ] Call the budget check before accepting step-mode writer output. Feed its diagnostic into the next existing bounded writer attempt; narration remains verbatim.
- [ ] Run budget, playback, durable-job, and worker recovery tests, then full suite, changed-file ESLint and production build.
- [ ] Commit and push the scoped fix to `codex/synchronized-teaching`; verify the test-project deployment and one fresh lesson. Report any listening limitations honestly.

## Verification notes

The exact failed hosted script and original recording durations now compile without regeneration: its boxed answer needs 9.998 seconds of motion rather than 23.93 seconds, using 0.777x speech within the existing policy. The regression preserves every handwriting stroke's timing and limits added box motion to under three seconds.

Authoring preflight uses a 120-WPM estimate plus the existing bounded slowing range; it is advisory, not a replacement for actual WAV validation. Reviewer corrections must pass this check too. Exhausted new-step writer attempts fail safely before voice generation; legacy summary fallback remains unchanged. Integration tests cover retry feedback, overfull reviewer rejection, and no invalid fallback recordings. Read-only review found no remaining blockers after these changes.
