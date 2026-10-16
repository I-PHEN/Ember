# Sync V2 — Measured Speech, Bent Pen
## Natural voice↔board coordination + calibrated handwriting for Ember

Consolidates and refines `whiteboard_teaching_synchronization_master_plan.md`
(copy preserved at `docs/research/2026-10-15-whiteboard-sync-master-plan.md`).
Design approved in conversation 2026-10-15/16, including the planner-first
segmentation decision and the handwriting-calibration requirement.

---

## 1. Problem

The board and the voice are two independently generated clocks reconciled
only by clamped, after-the-fact approximations:

1. **The pen is choreographed against an estimated voice.** Pacing windows
   are char-count proportions of `estimateNarration` (0.54 s/word ≈ 111 WPM,
   `compile.ts:87`), while the planner budgets ~135 WPM (`prompts.ts:81`)
   and the audio layer claims 140–155 WPM (`audio.ts:7`). The real Aoede
   rate is never measured. The only real-audio adaptation is one scalar k
   clamped to [0.9, 1.35] (`setSceneAudio`, `compile.ts:2190`), so a voice
   that reads 25 % faster than the estimate leaves seconds of silent
   grinding per scene and progressive within-scene drift. This is the
   "voice too fast / nothing syncing" defect.
2. **Handwriting speed has no sweet spot because one knob controls two
   things.** Stroke speed and pause structure are coupled: the pinned
   7–11 s for an 11-char write (`tests/pen-pacing.test.ts`) is ~75 %
   inter-glyph hover overhead from invented hesitation constants (0.42 s
   before every operator, `kinematics.ts:193`), not ink time. Tuning
   "speed" moves both ink flow and hover feel, and sync pressure then
   forces a compromise. Faster strokes with wrong pauses reads AI; slower
   strokes reads sluggish and desyncs.
3. **Built-but-unwired research.** `balanceAudioVisualTiming`
   (`kinematics.ts:490`) and `parseSubtitleTimings` are never called;
   `appendTalkHold` is a no-op; the `WordTiming` arrays are computed and
   shipped but consumed by nothing; captions use their own char split.
4. **Brittle linkage.** `say` tags are matched by fuzzy string search and
   dropped entirely on failure (`cleanSay`, `solve-schema.ts:187`), and the
   tighter `segments` mechanism exists end-to-end but is never prompted
   for. Playback holds 3.5 s for a late voice then plays the scene silent
   (`SolvePlayer.tsx:57`).

## 2. Principles

- **Measure, never estimate, speech.** Any duration the timeline is paced
  against comes from synthesized audio, or the fallback is explicitly
  marked as an estimate.
- **Two dials, one job each.** Stroke kinematics are calibrated to
  measured human data and never bent for sync. All timing slack lives in
  silence buffers between segments.
- **One WAV per scene** — the player and MP4 export keep their shape.
- **The streaming contract is sacred.** Nothing waits for everything;
  per-segment TTS overlaps writer time; the final WAV is stitched at merge.
- **Deterministic engine.** Fixed fitted constants, seeded RNG, baked
  timeline. Calibration replaces invented numbers; it does not add
  randomness.

## 3. Architecture

```
transcript planner ──▶ scenes[].segments [{say, pauseHint?}]   (same LLM call as today)
        │
        ├─ per-segment TTS at transcript time (cached PCM, 429-resumable, queue as today)
        │
scene writers ──────▶ bind ink beats to segments (verbatim check, no fuzzy matching)
        │
merge/compile ──────▶ compileTimeline paced by MEASURED segment windows
        │              pen deficit per segment ──▶ gap sizes
        ▼
stitcher ───────────▶ segment PCMs + sized silences + loudness normalization
        │              ──▶ single scene WAV + audio.segments [{t0,t1}]
        ▼
player / export — scene.dur == WAV duration + tail, by construction
```

Stitch-last is the core mechanism: gaps are sized AFTER the pen schedule is
known (`max(default gap, pen deficit)`), so writing that outruns its spoken
window extends the following silence. The professor finishes the line in
quiet — never squashed ink, never a voice ahead of the board.

## 4. Workstream W1 — Handwriting Calibration Engine

Goal: replace invented kinematic constants with constants fitted to
measured reference handwriting, pinned by tests.

- **Ground truth.** Re-acquire reference footage: the prior source was
  Organic Chemistry Tutor "Intro to Matrices" (yt `yRwQ7A6jVLk`; prior
  frames + scripts in `scratch/organic_tutor_frames/`). Equivalent: user
  drops any clear single-tutor chalk/marker lecture mp4 into
  `scratch/calibration/`. Sample at ≥30 fps around writing bursts.
- **Measurement script** (`scripts/calibration/measure-handwriting.ts`,
  re-runnable, deterministic): pen-tip tracking per frame →
  - stroke velocity normalized by letter height (cap-heights/s),
  - pause distributions: within-word, within-line, between-line,
    before-operator, before-line-start,
  - pen-down duty cycle, burst length (chars per burst),
  - line height vs speed scaling (Wright exponent check).
- **Fit and replace constants**: `gamma0`, hesitation table
  (`computeTransitionPause`), Fitts `a`/`b`, settle times. Keep the
  two-thirds power law and min-jerk envelopes — they are correct; only the
  scalar constants were invented.
- **Pin with tests**: rewrite `pen-pacing.test.ts` to the calibrated
  window (evidence-based supersession of the current 7–11 s pin — see
  §10), extend `kinematic-burst-pacing.test.ts` duty-cycle bound to the
  measured band. Update CLAUDE.md's "do not speed up" line to "calibrated,
  test-pinned constants".
- **Deliverable**: `docs/research/handwriting-calibration.md` with the
  measured distributions and the fitted table, so future tuning is
  evidence against data, not vibes.

## 5. Workstream W2 — Segment contract (planner-first)

```typescript
export interface SceneSegment {
  say: string;
  ink?: Beat[];
  mode?: "speak_ahead" | "write_ahead" | "parallel" | "point" | "pause";
  pauseAfter?: number;            // seconds; hint, clamped 0.2–2.5
}
// scene.audio becomes:
audio?: {
  key: string;                    // stitched WAV identity
  narration: string;
  dur: number;                    // measured WAV duration
  segments?: Array<{ i: number; t0: number; t1: number }>; // WAV-relative, gaps included
}
```

- `TRANSCRIPT_PROMPT` emits thought-level segments (1–2 sentences) in the
  same call it makes today, with optional `pauseAfter` hints for moments
  that should land. Narration remains verbatim.
- Writers receive segments and **bind** ink beats to them (extend each
  segment's `ink`). `WRITER_SYSTEM` rewritten around binding; the `say`
  tag becomes unnecessary for new scripts. Verbatim guarantee moves to the
  sanitizer (join of segment `say` ≡ narration).
- `REVIEWER_SYSTEM` must preserve segment↔ink binding when replacing
  beats (new checklist item).
- Modes derive by default at compile (ink+fits → `parallel`; ink+overrun →
  `write_ahead`; no ink+board reference → `point`; no ink → `speak_ahead`;
  explicit `pauseAfter` → `pause`). Prompts only mark exceptions (boxed
  answer hold, pause-and-predict).
- Legacy scripts without segments keep a sentence-split fallback
  (`[.!?]` boundaries, greedy beat assignment) through the same stitcher.

## 6. Workstream W3 — Segment TTS + stitch-last audio engine

In `audio-assets.ts` (new sibling `stitch-audio.ts`):

- Per segment: `normalizeSpokenMath(seg.say)` → `geminiTTS` (existing
  serialized queue, individually cached by segment text) → exact duration
  from PCM length (`bytes / 48_000` at 24 kHz 16-bit mono).
- Loudness normalization per segment (peak/RMS) before stitching to avoid
  audible splices between independently synthesized sentences.
- Stitch at merge: `gap_i = clamp(max(defaultFor(mode_i), penDeficit_i,
  pauseAfter_hint), 0.25, 4.0)`; silence = PCM zeros; output = one RIFF
  WAV + `segments[]` manifest with cumulative t0/t1.
- Gap defaults (tunable constants): 0.35 s intra-thought, 0.9 s
  between-thought, write-ahead sized by pen deficit, 2.0 s boxed answer.
- Audio identity: version the key (`ember-audio-v2`) so old cached WAVs
  are not confused with stitched ones.
- **Voice cadence stays Aoede at rate 1.0** — the buffers do the calming
  (notes-to-video lesson: explicit gaps dropped effective 165→115 WPM).

## 7. Workstream W4 — Compiler pacing refactor

- `paceSceneToNarration` becomes segment-anchored: each beat group's `t0`
  = its segment's measured `t0` (+ `SAY_T0` 0.08 s); stroke durations keep
  their kinematic (calibrated) values; overshoot flows into the next gap
  via the stitcher (two-pass: compile → gap sizes → stitch).
- `setSceneAudio` reduced to attaching measured duration (no rescale —
  pacing already used real numbers). Delete `paced`/`pacedFor`.
- Delete dead code: unused `balanceAudioVisualTiming` import (its job is
  now gap sizing), `appendTalkHold` stub, `parseSubtitleTimings`,
  `estimateWordTimings` and the `words` field (dead end-to-end).
- Banner problem mount (`compile.ts:548`, instant ink at t0) stays, now a
  documented "pre-mounted board" intro choice rather than an accident.
- Fallback path (no segments): sentence-split + per-sentence synthesis
  through the same stitcher; if even that is unavailable (ancient stored
  audio), current clamped behavior remains as last resort.

## 8. Workstream W5 — Runtime

- `scene.dur = WAV dur + 0.4 s tail` by construction; wall clock and audio
  agree; the ±0.12 s slaving corrections in `SceneAudio.tick` stay as a
  no-op safety net.
- Captions switch from char-proportional chunks to real segment cues
  (sentence = segment).
- `VOICE_HOLD_MS` stays (pre-warmed stitched WAVs should make it
  near-always instant); silent fallback remains the last resort.
- MP4 export (`export-mp4.ts`) unchanged mechanically; verified against
  stitched WAVs (audio placed at scene start, zero drift by construction).
- `use-video-job.ts` / progress unaffected.

## 9. Workstream W6 — Verification gates

Machine gates (extend `scripts/eval/run-eval.ts` + `bun test`):

1. **Anchor audit**: every ink beat of every scene starts inside its
   segment's measured window (or a declared `write_ahead` overflow that is
   covered by the following gap).
2. **Silence audit**: stitched WAVs have RMS-silent spans at declared gap
   boundaries (amplitude < 0.001 in PCM terms).
3. **Pacing pins**: calibrated pen window + measured duty-cycle band
   (W1), monotonic stroke t0 across every scene.
4. **Stitch math unit tests**: PCM length ↔ duration, gap sizing with pen
   deficit, RIFF header correctness, loudness normalization bounds.
5. **Segment-anchored compile tests**: beat `t0` == segment `t0` ± SAY_T0;
   fallback sentence-splitter output shape.
6. **Golden flagship**: render frames at cue timestamps, assert ink-reveal
   state (extends the thumbnail/typography test approach).
7. Human audit (user, on the running app): speak-first-then-write cadence,
   pointer hovers, boxed-answer silence, MP4 export spot check.

## 10. Explicit supersessions

- `tests/pen-pacing.test.ts` window 7–11 s is replaced by the calibrated
  window once W1's measurement lands. Rationale: the old pin protected
  sync from a rushed pen; with stitch-last gaps, sync no longer depends on
  pen slowness, and the invented constants are replaced by measured ones.
  CLAUDE.md's "do not speed up" becomes "calibrated constants, pinned by
  tests — change only with new measurement data".
- `docs/superpowers/plans/…` engine v2 docs remain historical; this spec
  governs sync.

## 11. Milestones (build → user checks running app → commit)

- **M0 — Calibration**: measurement script + reference footage + fitted
  constants + rewritten pins + `docs/research/handwriting-calibration.md`.
  Product unchanged until params land.
- **M1 — Stitcher core**: `stitch-audio.ts` + schema extension + unit
  tests. No behavior change yet.
- **M2 — Compiler**: segment-anchored pacing + stitch-last gap sizing +
  legacy fallback + dead-code removal. Flagship renders through the new
  path with hand-authored segments.
- **M3 — Prompts**: planner segments, writer binding, reviewer
  preservation, `SAMPLE_CALCULUS` hand-segmented.
- **M4 — Pipeline**: `video-jobs.ts` per-segment TTS at transcript time,
  stitch at merge, flagship audio regeneration, key versioning.
- **M5 — Runtime + gates**: captions, `setSceneAudio` simplification,
  eval sync audit, full live regeneration + human audit.

## 12. Risks

| Risk | Mitigation |
| --- | --- |
| TTS 429 across more, smaller calls | Per-segment caching, existing adaptive queue, resume-friendly stitch; voices overlap writer time |
| Prosody discontinuity between segments | Loudness normalization; segments are whole thoughts, never clause fragments |
| Writers bind ink poorly to segments | Sanitizer verbatim check + reviewer checklist item + greedy fallback binding |
| Calibration footage unavailable | Re-pull reference (ID known) or user-supplied mp4; constants ship with confidence ranges |
| Sync regression during migration | Legacy path intact until M4; eval sync audit gates every run from M5 |
| Scene duration bloat from gaps | Gap clamps (0.25–4.0 s); duty-cycle band test; watchableMs gate stays ≤90 s |
