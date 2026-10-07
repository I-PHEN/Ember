# Pause-first audio scheduling

## Approved direction

The user approved pause-first scheduling with bounded handwriting adjustment,
preserving readable handwriting and flagging scenes that cannot fit their
narration. This precedes production safeguards. No visual redesign, new voice
provider, model download, or automatic paid regeneration is included.

## Goal

Fit board actions to measured speech by adjusting expendable waiting before
changing ink speed. Long explanations must not produce slow-motion writing.
An infeasible schedule must remain readable, deterministic, and honestly marked
as needing revision rather than being presented as successfully synchronized.

## Timing contract

Each authored beat retains its existing ID and speech anchor. The compiler also
records ordered, non-overlapping timing spans in canonical scene seconds:

- Ink: natural stroke duration and its existing normalized kinematic profile.
- Travel: necessary pen-up motion, using the existing distance-based flight
  duration. This duration is protected from compression.
- Elastic pause: optional hesitation or settle time, with an explicit lower
  bound and upper bound.
- Fixed action: deliberate wait/point, erasure choreography, highlights, and
  other actions not explicitly identified as elastic or ink.

Unknown gaps are protected by default. Do not infer that every interval without
ink is disposable. In particular, preserve the erasure/reflow ordering and
student-thinking waits.

The current combined transition is max(flight, hesitation). Decompose it into
flight plus max(0, combined - flight), not flight plus the full hesitation.
This must not reintroduce the previously repaired double-counting.

Initial calibration for this implementation:

- Ink speed-up ceiling: 1.25 times natural speed (duration floor 0.8 times
  natural duration), replacing the current 2.5-times ceiling for lesson timing.
- No ink slow-down to fill narration.
- Explicitly optional hesitation/settle spans may shrink to zero.
- Existing elastic spans may grow by at most 0.5 seconds each and never above
  max(their natural duration, 1.2 seconds).
- Authored waits, pointing holds, and required travel keep their natural duration.

These are product calibration settings, not biological measurements. The
existing intro's separate baseline compression remains unchanged; the new
ceiling is relative to the captured baseline.

## Scheduling algorithm

Use the existing validated measured phrase windows when available. Keep the
current estimated/duration-only fallback clearly labeled approximate; never
invent measured timestamps.

For each speech-anchor group in authored order:

1. Start no earlier than its speech anchor or the previous group's completion.
2. Compute its natural duration and available speech window.
3. If time is short, reduce elastic pauses proportionally to their available
   compression capacity. Preserve all ink until that capacity is exhausted.
4. If still short, apply a common bounded speed-up to ink only. Preserve its
   normalized progress curve, geometry, and stroke ordering.
5. If time remains short, keep the bounded readable schedule and report the
   overflow duration against the original speech deadline. Do not move audio
   timestamps, discard strokes, or silently shorten teaching pauses.
6. If speech is longer, keep natural ink speed and distribute slack among
   existing elastic pauses up to their caps. Place any remaining slack as a
   pen-up hold after the group, without inventing extra writing.

Overflow may push subsequent groups later. Report their resulting deadline
misses too; a measured input is not evidence that all board actions fitted it.
The scene duration includes all retained board actions and audio.

## Architecture and rendering

- compile.ts authors span metadata at the point where strokes, transitions,
  and pauses are created. No model-facing beat-schema changes are required.
- timing.ts owns the pure allocation algorithm, validation, and piecewise
  mapping from baseline clocks to scheduled clocks.
- timeline-timing.ts remains the sole timing applicator. Capture immutable
  baseline metadata and rebuild from it for every audio attachment.
- Map stroke start and end independently; a single beat-wide scale can no
  longer describe a beat containing protected travel and adjustable ink.
- Map group births, erasures, highlights, survivor slides, and scene boundaries
  using the same piecewise plan. Define boundary ownership consistently.
- Render pen-up holds separately from required travel. The cursor should remain
  lifted while holding, then follow its explicit travel interval, rather than
  crawling across the board throughout an expanded pause.
- Preserve scene locking: late audio cannot move a scene after playback or
  seeking commits it. Chapter snapshots continue to come from the player.

Reject malformed span arrays, nonfinite clocks, overlapping spans, invalid
bounds, and spans outside their owning beat. Reject invalid measured timing
without partially mutating the live timeline. Compatibility callers without
span metadata use conservative ink/fixed classification, not guessed pauses.

## Revision signal

Separate timing provenance (estimated, duration-only, measured phrases) from
schedule feasibility. Expose a needs-revision result with scene/beat identity,
overflow seconds, and missing-anchor reasons.

Show a compact warning in the existing player when timing cannot fit. Playback
may remain available for inspection, but the warning must not claim the lesson
is fully synchronized. No automatic rewriting, TTS regeneration, or new delivery
gate is added in this phase; those belong to the later safeguard work.

## Acceptance checks

- A shortfall covered by optional pauses changes no ink or travel durations.
- Greater shortfalls exhaust optional capacity before accelerating ink, never
  past 1.25 times natural speed.
- Impossible windows report overflow; authored waits and travel remain intact.
- Long speech preserves natural ink duration, respects pause caps, and ends
  with an explicit hold rather than stretched writing.
- Zero-duration optional pauses and exact boundaries remain finite and ordered.
- Reattaching identical audio is idempotent; attaching different durations
  rebuilds from baseline rather than accumulating drift.
- Invalid inputs leave the live timeline unchanged.
- Matrix persistence, highlight targeting, erase/reflow, hidden intro offsets,
  chapter seeking, and scene locks retain their current behavior.
- Deterministic renderer checks cover ink, lifted hold, travel, and seeked frames.
- Use short matrix, fraction, and physics-diagram fixtures; no paid calls are
  required for algorithm tests. Listening/visual assessment remains separate
  from numerical test success.

## Scope exclusions

Durable job storage, the refinement review gate, institutional APIs, curated
starter recordings, automatic scene repair, and visual redesign are deferred.

## Review status

Concept approved by the user. Written contract self-reviewed for timing-bound
consistency, scope, and explicit failure behavior; awaiting user review before
the implementation plan and code.
