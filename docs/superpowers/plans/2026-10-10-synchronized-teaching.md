# Synchronized Teaching Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task inline, with a read-only review before integration.

**Goal:** Match measured spoken steps with readable board actions, without premature answers or dead-air scene tails.

**Architecture:** Keep existing job-stage checkpoints. Add pure speech-step planning and WAV validation modules, persist step recordings, and expand reviewed scenes into measured playback steps. Legacy scenes retain their original path; new steps use a dedicated timing policy and per-step audio rate.

**Tech Stack:** TypeScript, Bun tests, Next.js, Prisma/Neon, Inngest, existing Gemini TTS.

## Global Constraints

- No hero changes, paid services, Python deployment, auth changes, or production rollout.
- Keep saved recording references immutable and preserve interrupted-job recovery.
- Reject invalid timing/anchors rather than silently estimating synchronized playback.

### Task 1: Ordered step contract

Files: create `src/lib/video/teaching-steps.ts`, `tests/teaching-steps.test.ts`; modify prompts and video types.

Interface: `planTeachingSteps(scene: SolveScene): TeachingStep[]`, each with exact narration, board beats, and kind `work|explain|ask`.

- [ ] Write failing fixture: `{narration:'Subtract two. What is five minus two? It is three.',beats:[{type:'write',text:'5 - 2 = 3',say:'It is three.'}]}`. Assert the question has no answer strokes and precedes the result.
- [ ] Run `bun test tests/teaching-steps.test.ts`; inspect red failures.
- [ ] Implement monotonic exact anchors; reject missing/backward/cross-question anchors; retain all narration exactly once. Convert titles to regular writes for new lessons and suppress title decoration.
- [ ] Run contract tests. Update director/transcript/writer prompts to short operation-sized scenes, immediate equation setup, exact anchor fragments, and optional separate questions.

### Task 2: Durable measured recordings

Files: create `src/lib/video/wav.ts`, `src/lib/jobs/step-audio.ts`, `tests/step-audio.test.ts`; modify `src/lib/video-jobs.ts`, recording reference types, recovery fixtures.

Interface: `ensureStepAudio(scene, store, synthesize, assignedKey)` returns scene WAV plus recorded step references with measured duration. Every clip uses `ensureRecordedAudio` and its exact narration as cache identity.

- [ ] Write failing WAV fixtures with 24kHz mono PCM, including odd unknown chunks, truncated data, incompatible formats, and cache reuse after interruption.
- [ ] Run `bun test tests/step-audio.test.ts`; inspect red failures.
- [ ] Implement strict WAV parsing/joining, exact duration calculation, versioned scene identity, and checkpoint saved clip identities before completing the scene voice. No successful voice count before durable storage.
- [ ] Integrate only jobs with the new delivery version; legacy persisted jobs retain the old synth path. Publish expanded scripts only after recorded-step validation.
- [ ] Run durable job, stored audio and worker restart tests using valid generated WAV fixtures.

### Task 3: Measured playback timing

Files: create `src/lib/video/step-timing.ts`, `tests/step-timing.test.ts`; modify compiler, audio manager, player and timing tests.

Interface: `stepTiming(naturalWriteEnd:number, rawAudioDuration:number, kind)` returns speech rate and total duration, allowing only 0.65–0.9x natural speech and a short 0.15s transition (0.6s for explicit prediction).

- [ ] Red tests: no estimated 30s tail for a measured 8s explanation; an answer step starts after the question; short audio cannot accelerate ink; impossible pairing fails explicitly; repeated measurements are idempotent.
- [ ] Implement independent step policy, per-step speech-rate mapping for seek/drift/duration, and buffering at scene entry from the first frame. Remove automatic silent continuation for measured steps; surface failure via existing playback feedback.
- [ ] Run targeted tests, then `bun test tests --timeout 60000`, changed-file ESLint and application build. Request read-only review, fix important findings and rerun tests.
- [ ] Commit scoped code with the repository co-author footer. Report measured test-project rollout and listening limitations separately.

## Implementation and verification record

All three implementation tasks are implemented. New jobs persist exact speech slices and real WAV durations, publish only validated measured steps, and use the audio clock for board playback. Reviewer and solver corrections cannot change recorded speech partitions. Terminal audio failures pause the board and display a retry message. Existing jobs retain legacy delivery; no database migration or hero changes were made.

Read-only review identified two issues (speech-partition drift and terminal playback failures); both were fixed with regression tests. Full suite: 151 passing, one real-Postgres test skipped without a configured test database. Changed production files pass ESLint. Next.js webpack production build succeeds using already-generated Prisma clients; project build configuration skips TypeScript validation.

Hosted rollout and audible listening verification are pending. Automated tests verify step order, timing, audio-master seeking, failure behavior, durable recording reuse, and worker recovery, not perceptual word-by-word alignment. Existing saved lessons are intentionally not regenerated.
