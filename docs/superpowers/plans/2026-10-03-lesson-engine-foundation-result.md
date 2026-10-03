# Lesson foundation implementation result — 2026-10-03

Implemented on branch **codex/lesson-foundation**, isolated from the working checkout's ongoing UI/refinement edits.

## Delivered

- Validated LessonPlan, NarrationScore and BoardScore artifacts. Cross-reference checks reject duplicate IDs, nonexistent landmarks, hidden emphasis, invalid relationships and phrases bound to a different segment.
- Board ownership auditing checks persistent context, explicit state changes, visible context for operations/results, and distinct row/column color semantics.
- Pure timeline metrics report ink pace, unresolved audio and end-of-writing offset relative to known audio. This offset is **not** phrase-level synchronization error.
- Numeric scene observations are retained in ephemeral job stats and exposed by the existing status endpoint. The new timing route validates duration/index bounds and replaces repeated observations by scene.
- The player reports once after audio metadata resolves. Reports belong to the exact generated script; history/refined scripts do not inherit a stale job ID. A failed timing request does not interrupt playback.

## Verification

| Check | Result |
| --- | --- |
| Baseline unit suite | 79 passed |
| Completed unit/route suite | 115 passed, 0 failed |
| ESLint on all changed application/test files | Passed |
| Browser regression, deterministic lesson and WAV audio | Passed twice; two reports, no duplicate reports after rerender, zero history reports, zero page errors |
| Browser visual inspection | Player mounted, controls visible, clock advanced to 0:02 |
| Offline Webpack production build | Passed, including the new timing route |
| Repository-wide TypeScript | Blocked by existing errors in gallery route and video/render.ts |
| Repository-wide ESLint | Blocked by existing window.location mutations in gallery/page.tsx |
| Default production build | Blocked by Turbopack's shared dependency junction restriction; Webpack without offline fixtures also hit Google Fonts network timeouts |
| Live model/TTS generation | Not exercised; browser generation/audio were deterministic fixtures |

The existing Next configuration skips type validation during builds, so the successful offline build is not presented as a clean repository type-check. Files with the reported TypeScript/lint errors are unchanged from the branch base.

## Corrections made during implementation

- Reused existing Zod for structural validation rather than adding bespoke parsing helpers or dependencies.
- Used PathStroke.dur (the actual type), not nonexistent start/end properties.
- Stabilized onVoiced with a ref; including its changing callback identity in narration-fetch dependencies would repeatedly restart the fetch loop.
- Bound telemetry to script identity instead of assuming watchedJobId always refers to the displayed lesson.
- Allowed zero write duration for narrated pauses; audio duration must still be positive.
- Added route integration tests using an ephemeral store fixture without calling generation providers.
- Added an offline browser harness and optional font fixture. Neither is enabled in production.
- Kept the screenshot output under the ignored .next directory.

## Reproduce the browser check on Windows

From this worktree, start a separate terminal:

    $env:NEXT_FONT_GOOGLE_MOCKED_RESPONSES = (Resolve-Path tests/fixtures/offline-fonts.cjs).Path
    node node_modules/next/dist/bin/next dev --webpack -p 3017

Then:

    node tests/player-timing.browser.mjs http://localhost:3017

CHROME_PATH can override the default Chrome executable. The harness intercepts generation, narration and timing requests, and tests the real page/player. The timing route itself is exercised separately by tests/timing-route.test.ts against the real job-recording function.

Offline production compilation:

    $env:NEXT_FONT_GOOGLE_MOCKED_RESPONSES = (Resolve-Path tests/fixtures/offline-fonts.cjs).Path
    node node_modules/next/dist/bin/next build --webpack

## Next implementation slice

Audio-first timing compilation: phrase anchors, measured speech timing, immutable scene scheduling and feasible ink windows. The current writing speed and post-hoc schedule behavior remain in place; this foundation makes those failures measurable and gives the next agents a validated semantic board representation.

