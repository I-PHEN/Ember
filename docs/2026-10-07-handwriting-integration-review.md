# Handwriting implementation and integration review

## Scope

Reviewed the supplied 26-page *Kinematic Synthesis and Biomechanical Modeling
of Natural Handwriting for Automated STEM Video Generation* against the
compiler, renderer, timing pipeline, and the other agent's uncommitted engine.
Integrated main through 3c130d9 into codex/lesson-foundation, plus a snapshot
of the handwriting changes, with the user's explicit approval.
The original main checkout and its uncommitted source files were not edited.
The unrelated uncommitted TTS fallback change was not imported.

This is a targeted integration review, not a security audit of the entire app.

## Assessment of the paper

The useful architectural separation is semantic lesson authoring → deterministic
stroke compilation → deterministic rendering, with real audio timing attached
after synthesis. Curvature-sensitive motion, variable marker widths, and
distance-aware pen lifts are reasonable techniques to evaluate.

Do not treat the document's claimed 89.6% human-realism score, benchmark table,
or “production-validated” parameters as measured Ember results. It supplies
no reproducible experiment, participant data, source trajectories, benchmark
implementation, or measured Ember build. The cited scientific foundations do
not, by themselves, validate this application's parameter choices.

There are internal numerical conflicts: pages 2 and 10 use different length
exponents for velocity gain; the example spline uses cumulative chord distance,
not exact spline arc length; the advertised ~0.23-second long line is incompatible
with the advertised acceleration bound. For a quintic minimum-jerk line,
peak speed is 1.875 L/T and peak acceleration is (10/sqrt(3)) L/T².
Regular strokes use a bounded curvature-based approximation, not a solved
minimum-jerk optimization or Sigma-Lognormal motor model.

## Reproduced defects and repairs

1. **P1: fabricated job recovery.** Unknown job IDs produced canned lessons,
   invented timing/review counters, and a ready result. Failed jobs could be
   changed to ready on polling. Removed these paths; missing jobs return 404,
   failed jobs remain failed, and the mandatory review gate remains authoritative.
   Restored opaque random job IDs instead of embedding the student's question
   into every polling URL.
2. **P1: inconsistent geometry indexing.** The synthesizer removed points but
   the compiler stored the original points beside filtered cumulative distances
   and widths. A three-point fixture became two cumulative-distance entries.
   Profiles now return canonical points and the compiler stores those points.
3. **P1: progress overshoot on tiny strokes.** The minimum duration was used to
   invert a shorter integrated trajectory. A 0.1-unit stroke produced progress
   above 16 before snapping back to 1. Coincident points exceeded 1,600.
   Normalization now uses integrated time; degenerate paths have finite
   zero-length geometry, and all LUTs remain monotonic within [0,1].
4. **P2: unbounded ballistic motion.** A 1,000-unit line exceeded 7,200 units/s
   despite a 2,400 configured ceiling. Duration now respects both the quintic
   peak-speed and peak-acceleration constraints. A 420-unit bar takes about
   0.87 seconds at the selected acceleration limit, rather than the unsupported
   quarter-second promise.
5. **P2: excessive cumulative pauses.** Flight time and semantic hesitation
   were added even though both described the same transition interval.
   They now overlap, with the larger duration governing the transition.
   Initial Ember calibration also shortens the boundary slowdown zone.
   The silent sample “2x + 5 = 13” fell from 12.07 to 7.79 seconds.
   The regression window is 5.5–8.5 seconds; this is a product pacing choice,
   not an experimentally established human-writing interval.
6. **P2: cursor and deposited ink disagreement.** Cursor-only tremor used the
   first velocity sample at every time; it detached the cursor from the ink.
   Both now use the same geometry (which already contains deterministic jitter).
   Partial segment widths no longer change as the segment is revealed.
7. **P2: Studio migration regression.** Chapters were independently recompiled
   from estimated narration, and array positions were confused with scene IDs.
   Restored player-owned chapter snapshots, scene-index seeks, and timing
   telemetry for both automatic and manual playback.

Invalid/nonfinite geometry now fails explicitly. Existing matrix identity,
cell targeting, persistence, reviewed delivery, immutable timing baselines,
audio attachment idempotence, and scene locking are preserved.

## Deliberate limits and follow-up work

- The unused elastic-pause helper was removed. It had no production caller and
  its passing unit test did not establish audiovisual synchronization. Existing
  measured-phrase timing remains the sole retiming authority. A pause-first
  scheduler requires an explicit model of flight, cognitive holds, ink, and
  authored waits; it is not implemented by this repair.
- Physical bounds apply to the natural stroke profile. Existing speech-window
  compression (up to 2.5×) and intro compression can increase displayed speed.
  Do not advertise biological speed/acceleration limits for final playback.
- Variable width is a per-segment Canvas approximation, not a continuous mesh
  ribbon. Dense boards still need performance profiling on student hardware.
- Fonts are deterministic vector glyphs with jitter, not learned human
  handwriting. Realism needs side-by-side video evaluation and student feedback.
- Jobs still live in process memory. Genuine serverless recovery needs a durable
  job store/worker system; honest expiry is safer than a fabricated replacement.
- The imported refinement endpoint still sanitizes edited scripts without the
  full multi-agent reviewer gate. This pre-existing separate delivery path needs
  its own review-gate integration before production quality claims cover edits.
- Ready-to-play starter recordings remain a separate unfinished deliverable.
  No new provider calls or paid lesson generation were used in this repair.

## Verification approach

Regression tests exercise malformed/subpixel/coincident paths, canonical point
indices, long-line bounds, audio retiming, stable ink and cursor geometry,
missing/failed job delivery, matrix rendering, and chapter timing.
Original failures were reproduced before their corresponding fixes.
An independent read-only review identified the auto-watch telemetry omission
and question-bearing job IDs; both were corrected.
Validation results: 179 tests passed (1,817 assertions); focused engine/API/test
ESLint finished without diagnostics. Production webpack build passed.
Standalone TypeScript checking still reports three pre-existing gallery-route
errors at lines 44 and 53. No new type errors remain in the integrated engine
or Studio page.

The browser reached the new Studio sign-in screen. Authenticated playback
was not verified. A silent test harness uses the real compiler and renderer:
build tests/kinematics-preview.ts with Bun to scratch/kinematics-preview.js,
then serve tests/kinematics-preview.html from the repository root. Browser
automation timed out before a visual board screenshot could be verified.
Do not count the harness as a reviewed starter lesson or a successful
end-to-end audio/video quality evaluation.
