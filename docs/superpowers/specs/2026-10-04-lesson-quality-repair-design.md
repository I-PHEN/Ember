# Lesson quality repair

## Scope and approved direction

Repair the observed matrix lesson: stale chapter navigation, flat matrix notation,
and delivery of scenes whose review has not completed. Keep Gemini narration,
the installed alignment model, current visual brand, and natural pen-speed bounds.
No additional model download, public publishing, or main-checkout merge.

The user approved holding playback and offering retry when review fails or times
out. This supersedes the previous ship-original-on-timeout policy for new jobs.
Review is a quality gate, not a guarantee of mathematical correctness.

## Evidence

- The page recompiles an estimated timeline for chapters, while the player mutates
  its own timeline using measured audio. The observed practice chapter sought into
  the answer; the last chapter label exceeded the displayed video duration.
- The generated board rendered A as a one-line nested list. The beat union has
  tables but no dedicated matrix primitive.
- Review dispatch can skip scenes; collection races an eight-second timer and
  delivers originals for unfinished or invalid reviews.

## Design

### One playback timeline

The player publishes an immutable chapter snapshot from its actual timeline after
initial compilation and every accepted timing update. The page displays that
snapshot instead of recompiling. Chapter requests carry scene identity, resolved
against the current player timeline at seek time. This avoids stale timestamps
even if audio arrives between rendering a button and clicking it. Reset snapshots
on script/version changes; preserve existing manual time seeking.

### Structured matrices

Add a matrix beat containing a stable board ID, optional label, rectangular cell
strings, marker style, speech anchor, and persistence flag. Validate nonempty,
rectangular rows and bounded dimensions/cell lengths before compiling. Lay out
cells in aligned rows and columns with square brackets and optional label, using
existing handwriting paths and timing. Never silently truncate entries to fit.
Oversized or malformed matrices must yield a diagnosable validation failure.

Expose deterministic row, column, and cell targets under the matrix ID so existing
point/highlight actions can trace row 2, column 3, and their intersection. Preserve
the matrix through later scenes when marked persistent. Update writer/reviewer
instructions and validation together; prompt-only formatting is insufficient.
Existing scripts and non-matrix beats remain compatible.

### Mandatory review before delivery

Dispatch review for every generated scene while writing and voice work continue
in parallel. Track explicit per-scene pending, passed, failed, and timed-out
outcomes. A correction counts as passed only after sanitization, math checks,
and layout validation accept it. Rejected fixes cannot count as successful review.

Use a bounded review deadline and expose an actionable error if any scene does
not pass; never expose the job's script as watchable/ready in that condition.
Ignore late results after the attempt is finalized. Accurate terminal counters
must not be overwritten by late promises. Any later scene regeneration must also
pass review before delivery.

The error UI offers an explicit retry of the original question using the existing
job creation flow. Explain that retry regenerates the lesson and may incur normal
generation costs. Do not auto-retry indefinitely or publish failed output.

## Alternatives and trade-offs

- Recompute chapters separately with guessed durations: smaller patch, but retains
  two timing authorities and races. Rejected in favor of player-owned timing.
- Ask writers to use multiline text: cheaper than a primitive, but does not provide
  reliable cell alignment or targeting. Rejected for matrix teaching.
- Extend review timeout and still ship unchecked: faster eventual delivery, but
  violates the user's approved fail-closed requirement. Rejected. Mandatory review
  increases latency and provider usage; parallel voice work remains intact.

## Verification and implementation order

1. Reproduce stale chapter timestamps with audio retiming; test scene-based seeks,
   script changes, and late timing updates. Implement and verify in the browser.
2. Test matrix validation, geometry, cell targets, persistence, and bounded ink
   speed. Visually verify the exact 2-by-3 reference matrix at narrow and wide sizes.
3. Test review success, timeout, rejected fix, provider failure, late completion,
   regenerated scenes, and retry. No failed/unreviewed job may become watchable.
4. Run existing regressions and a fresh complete matrix lesson. Confirm a23=5,
   a12=7, retained matrix, correct chapter destinations, and a real practice pause.

The previously observed blank opening needs separate timing evidence; do not
claim these three repairs automatically fix it. Subjective voice naturalness also
requires listening, not just screenshots or passing alignment tests.
