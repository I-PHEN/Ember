# Teacher-paced hosted generation implementation plan

Approved scope: preserve Neon/Inngest durable generation, calm narration and readable writing; no hero or launch-video edits. Work in the isolated hosted branch and preserve the separate lesson-foundation branch.

## Design

Keep SQLite for local development and Postgres plus Inngest for hosted execution. Existing recordings remain immutable. A versioned narration direction requests a calm teacher, roughly 120 words per minute, no incidental sounds or music, and short natural pauses. This is a generation target, not an exact provider guarantee. New audio identities include the direction version. The timeline must never compress already-planned strokes to fit unexpectedly fast speech, and it must leave reading time after a step. Audio playback must not repeatedly restart a pending play request.

## Tasks

- [ ] Run the isolated baseline suite after installing locked dependencies.
- [ ] Add failing tests for fast audio leaving stroke durations intact and a reading hold after audio. Run `bun test tests/teacher-pacing.test.ts` before changing the compiler.
- [ ] Add failing transport-boundary tests proving TTS receives direction separately from the exact transcript. Version audio identity; preserve explicitly assigned old identities. Run targeted voice/audio tests.
- [ ] Add a pending-play regression with a controlled HTMLAudioElement fake; prevent repeated starts while a play promise is pending and preserve autoplay-block feedback.
- [ ] Implement the minimal pacing/audio corrections and run the entire suite, changed-file lint and build.
- [ ] Reconcile the non-hero lesson-foundation behavior with durable persistence without replacing stored audio with regenerated playback narration; report integration conflicts rather than deploying an incompatible branch.
- [ ] Commit task-scoped changes with the repository co-author footer. Test-project rollout only, production unchanged.

## Verification limits

No assertion that unwanted sounds are removed until an actual recording is reviewed. No exact word/symbol synchronization claim without measured timing. A passed build is not evidence of audible browser playback.

## Implementation checkpoint

Implemented calm speech metadata for Gemini 3.8 using the documented Interactions REST transport, directed legacy fallback, WAV preservation, versioned audio identities, 55px/s measured handwriting with 0.18s stroke lifts, no short-audio acceleration, a two-second hold after the later of speech/writing, and pending-play deduplication. Existing assigned recording references remain immutable.

Fresh verification: `bun test tests --timeout 60000` — 126 passed, zero failed, one live-Postgres test skipped (no test database configured). Changed-file ESLint passed. `next build --webpack` passed with existing generated Prisma clients; repository configuration skips TypeScript validation. `npm run build` could not regenerate Prisma because Windows locked the shared native client DLL. The isolated npm installation failed, so local checks reused the original checkout's dependencies through a junction; locked-install build remains a deployment check.

Read-only code review found the hold-after-speech omission; regression test failed first and the corrected compiler passes. No hero or launch-video files changed. The separate lesson-foundation branch is preserved, not wholesale merged: its in-memory jobs and synthesis-on-playback conflict with hosted durability. Integration and live test-project rollout remain separate follow-up work; no production deployment changed.

Provider contract reference: https://ai.google.dev/gemini-api/docs/speech-generation — exact transcript in input, style in speech_metadata, modern WAV output, raw REST audio in steps[].content[].data.
