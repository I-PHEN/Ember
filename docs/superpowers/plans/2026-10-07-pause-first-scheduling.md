# Pause-first Scheduling Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for the user's selected inline execution.

**Goal:** Preserve human-like handwriting while fitting optional pauses to speech first.

**Architecture:** Compiler-authored timing spans feed the existing pure timing planner.
The immutable-baseline applicator maps all scene clocks through one piecewise plan.
The renderer distinguishes holds from travel; the player exposes revision warnings.

**Tech Stack:** TypeScript, Canvas, React, Bun tests, Next.js.

## Global Constraints

- Ink speed-up ceiling: 1.25 times natural speed; no ink slow-down.
- Travel, authored waits, pointing, and unknown gaps are protected.
- Optional pauses shrink to zero and expand by at most 0.5 seconds each,
  with a ceiling of max(natural duration, 1.2 seconds).
- Measured timing provenance is independent of schedule feasibility.
- Keep scene locks, deterministic seeking, matrix state, and baseline idempotence.
- No paid generation, UI redesign, production safeguard expansion, or main edits.

## Task 1: Pure pause-first planner

Files: src/lib/video/timing.ts, tests/pause-first.test.ts,
tests/audio-timing.test.ts.

Interfaces: TimingSpan {kind: ink|travel|pause|fixed,t0,t1,minDuration?,maxDuration?};
BeatTiming.spans?: TimingSpan[]; TimingPlan.feasibility: fits|needs-revision;
TimingWindow.kind and per-span mapping; mapTimingTime(plan,time,edge=start|end).

- [x] Write failing allocation tests using a literal 4-second beat: ink 0..2,
  pause 2..3, travel 3..4. With a 3.5-second phrase, expect 2-second ink,
  0.5-second pause, and 1-second travel. With a 2-second phrase, expect
  1.6-second ink, zero pause, 1-second travel, and 0.6-second overflow.
- [x] Run bun test tests/pause-first.test.ts and confirm behavioral failures.
- [x] Validate span order, ownership, finite clocks and bounds; fill unknown
  intervals with fixed spans. Compatibility beats remain ink or fixed.
- [x] Allocate shortage to pause capacity, then ink duration floor; allocate
  surplus to capped pause capacity, then an explicit terminal hold.
  Preserve source-space endpoints and distinct left/right boundary mapping.
- [x] Add malformed input, long narration, zero-length pause, missing-anchor,
  and boundary tests. Run timing tests; include planner in the feature commit.

## Task 2: Compiler and immutable timeline integration

Files: src/lib/video/compile.ts, src/lib/video/types.ts,
src/lib/video/timeline-timing.ts, tests/pause-first-integration.test.ts.

Interfaces: PathStroke.travel?: {t0:number,dur:number}; Ctx records explicit spans.
Captured beats deep-copy span metadata; baseline strokes capture travel clocks.

- [x] Compile a silent equation and compare it against a long measured window:
  expect identical ink/travel durations and unchanged normalized profiles.
  Reattach shorter then longer audio and compare with a fresh timeline.
- [x] Run failing tests before implementation.
- [x] In addPaths record optional hesitation before protected flight, then ink,
  then optional settle. Compute excess hesitation as max(0,gap-flight).
  Each beat receives only its recorded spans; unspecified intervals remain fixed.
- [x] Scale span/travel baseline clocks consistently with the intro baseline.
  Map stroke start with the right boundary and end with the left boundary;
  map travel similarly. Keep geometry and LUTs unchanged.
- [x] Test wait/point preservation, invalid attachments, erasure/reflow clocks,
  matrix identity, chapter snapshots and locks. Include in the feature commit.

## Task 3: Pen holds and revision feedback

Files: src/lib/video/render.ts, src/components/player/SolvePlayer.tsx,
src/lib/video/timing-warning.ts, tests/pause-first-render.test.ts.

Interfaces: timingWarning(timeline): string|null summarizes revision scene count.
Renderer consumes PathStroke.travel and distinguishes lifted rest from flight.

- [x] Render a fixture with a long gap and a final one-second travel interval.
  At two preflight times the pen position must be unchanged; during travel it
  must move. Use the real renderer with a recording canvas test double.
- [x] Run failing test, then render explicit holds without full-gap interpolation.
  Keep compatibility behavior for strokes lacking travel metadata.
- [x] Add warning aggregation tests; show a compact role=status message in the
  existing player, based on timing plans after each audio update.
- [x] Run full bun test, focused ESLint, TypeScript check and webpack build.
  Record pre-existing gallery errors separately. Run independent code review,
  inspect diffs, update spec review status and commit.

## Review

Checked coverage against the approved spec. Zero-duration optional spans may
collapse without becoming nonfinite; no positive-duration motion is discarded.
Expanded holds are explicit output intervals, not silently stretched source ink.
Execution remains on codex/lesson-foundation.

## Execution notes

- Consolidated the three implementation tasks into one reviewed feature commit.
- Kept the intro's 0.5 baseline compression, but removed its 0.04-second duration
  floor: that floor could extend a stroke beyond the next scaled span boundary.
  Intro endpoint consistency now has a regression test.
- Review caught unknown gaps across speech groups. They are now fixed intervals;
  synthetic terminal holds may make room for them, never authored waits or ink.
- Full tests: 194 passed, 0 failed, 2022 assertions. No paid calls or models added.
- Focused ESLint passed; Next.js webpack production build passed. The project
  configuration skips type validation during build, so the separate check below
  is still relevant.
- TypeScript reports only the three existing gallery route errors (subject at
  line 44; question twice at line 53). They are outside this change.
- Real-audio listening and subjective handwriting realism are not established by
  these tests. Curated ready-to-play starters and production safeguards remain
  separate tasks.
- Restored the existing empty HTML visual-QA harness and added a synthetic
  40-second window to its matrix fixture. Browser navigation to the existing
  local QA server was blocked with ERR_BLOCKED_BY_CLIENT; no visual playback
  verification is claimed. Build the harness with the command in its TS header.
