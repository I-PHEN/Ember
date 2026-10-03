# Audio-first timing compiler implementation

Approved scope: the next timing-compiler slice of the STEM lesson architecture.

## Design

Replace character-proportional legacy pacing and cumulative rescaling with a pure beat scheduler. Stable beat IDs identify speech anchors. Match whole normalized word sequences monotonically; repeated phrases consume successive occurrences, never jump backward. Accept validated aligned phrase intervals or explicitly estimated intervals based on measured audio duration.

Use a calibrated base of 165 effective path units/second, short pen lifts and bounded acceleration (at most 2.5x per beat window). Do not stretch ink to fill long explanations: finish writing and leave a pause. Report infeasible windows instead of unbounded acceleration or silently claiming synchronization.

Capture raw geometry clocks once per timeline. Recompile from those immutable clocks before playback when real audio arrives. Apply the same mapping to stroke starts/durations, group birth, erasures and survivor slides, including events stored on earlier scenes' strokes. Repeated audio attachments are idempotent. Invalid durations are ignored. Once a scene is started or committed by seeking, timing is frozen.

The player must buffer before locking a narrated scene. Remove the 3.5-second silent fallback while the narration store is still retrying; a genuine exhausted fetch still permits silent playback. Seeking ahead freezes only the preceding timeline and waits at the selected scene boundary if its voice is pending.

## Tasks

- [x] Pure anchor matching and beat scheduling; aligned-input validation and feasibility diagnostics.
- [x] Immutable baseline integration in compileTimeline/setSceneAudio, including erase/slide/group clocks.
- [x] Player buffering/locking and seek handling.
- [x] Regression tests: repeats, missing/non-Latin anchors, invalid times, long explanations, impossible short audio, idempotent reattachment, late locked updates and scene boundary stability.
- [x] Browser regression with delayed audio; offline build and focused lint.

## Verification limits

Duration-only voice remains approximate within each scene. No provider or forced-aligner change is included here; the aligned timestamp interface is tested with fixtures. Calibration is an initial configurable engineering choice, not a claim of reproducing a particular teacher's handwriting.

## Implementation and results

Implemented on codex/lesson-foundation in a8d0682 and ed64833.

- Full suite: 127 passed, 0 failed.
- Focused ESLint: passed on all changed code and tests.
- Browser regression with TEST_AUDIO_DELAY_MS=5000: passed; clock stayed at zero beyond the former 3.5-second timeout, two scenes produced exactly two numeric reports, no duplicate reports after rerenders, no history reports and no page errors.
- Fixture comparison: with 2.0 seconds of audio, first-scene writing ended at 2.244 seconds, versus 10.735 seconds before the timing change. This fixture is deliberately too short for perfect fit and the compiler reports overflow.
- Quiet equation calibration: 2x + 5 = 13 completes in about 6.15 seconds at the base pace. Longer explanations produce pauses rather than proportionally slower strokes.
- Offline Webpack production build: passed. Font responses were fixture data; live TTS/forced alignment was not exercised.
- TypeScript: unchanged pre-existing failures remain in the gallery route and video/render.ts. The repository build configuration skips type validation, so the successful build is not a clean type-check claim.

The player now refreshes chapter markers when scheduled durations change and clears the previous lesson's audio/clock when switching scripts. Failed or late observations cannot rewrite committed history.

Next: connect measured word/phrase timing from TTS metadata or forced alignment, then feed infeasible windows back to board/narration planning. Until then, timing.source explicitly distinguishes estimated previews, measured duration with approximate phrase placement, and aligned phrase input.

