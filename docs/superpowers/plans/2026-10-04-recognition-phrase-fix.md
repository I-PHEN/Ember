# Recognition-based phrase timing fix

User-approved scope: test and fix real-audio alignment using the installed model,
without waiting for another download. Keep Gemini's synthesized voice unchanged.

## Design and implementation

- [x] Replace the failing forced-alignment call with native Faster-Whisper
  recognition and word timestamps, using cached base.en, CPU int8, two threads.
  No initial transcript prompt and no runtime model download.
- [x] Introduce `recognized` candidates, distinct from legacy whole-track
  `aligned` timing. Preserve text, original intervals and token probability.
- [x] Require full transcript equivalence independently at the Node and browser
  boundaries. English zero–nineteen and their digits are equivalent; `2x` can
  match `two x` but remains one measured span. No fuzzy homophones, substitutions,
  omissions, missing math signs, or invented word intervals.
- [x] Match authored action phrases monotonically. Every included candidate must
  have positive duration and probability >= 0.15. Uncertain words outside action
  phrases need not discard valid actions. If any authored anchor fails, retain
  the existing whole-scene duration fallback, not a mixed estimated/aligned plan.
- [x] Preserve compound boundaries and apply player speed exactly once.
- [x] Test process transport, browser caching, numeric edge cases, repeated
  phrases, invalid candidates and real audio. Keep legacy binary/word timing.

This is deliberately narrow. More complex number verbalizations, unsupported
recognition spellings and genuinely mismatched transcripts fall back. Probability
is a heuristic rejection filter, not calibrated acoustic confidence. Recognized
phrase timing is not proof of subject correctness or ideal pedagogical pacing.

## Evidence

Before: all three Gemini samples failed forced-alignment validation.
After: matrix 4/4, equation 5/5, repeated phrases 7/7 action intervals accepted,
on two requests each through the real production worker and its 30-second limit.
No audio was regenerated for this comparison.

Initial complete run: first request 7.232 seconds including startup; subsequent
requests 2.666–2.825 seconds. A rerun while production build work was active took
11.685 seconds initially and 3.959–4.879 seconds thereafter. These are local
observations, not a latency guarantee or load test.
The final post-review rerun passed all six requests again: 10.883 seconds for the
initial request, then 4.136–7.132 seconds. Machine load materially affects timing.

The separate matrix smoke test passed with all four measured anchors and no
timing-compiler overflow for its synthetic ink durations. Decoder regression also
passes. Focused lint passes. Independent review identified ratio/superscript
normalization gaps; reproduced and fixed with regressions. NFC preserves
superscripts, numeric ratio colons and factorial marks remain significant, while
prose colons remain ignorable. Reviewer confirmed the finding resolved.
Final full suite: 146 tests, 340 assertions, zero failures.
Final Next webpack production build passed using the offline font fixture;
the project's existing build configuration skips TypeScript validation.
TypeScript still reports the four pre-existing gallery-route/render errors; do
not report the repository as type-clean.

Browser checks:

- Recognized fixture consumed its timestamps (ink ends 1404/1606 ms for 2000 ms
  audio), proving that recognized transport does not silently fall back.
- Real Gemini matrix/equation audio reached the actual canvas player. Matrix
  audio 11966 ms / ink end 11360 ms; equation audio 14606 ms / ink end 10280 ms.
- No page errors, duplicate reports or history reports in either browser check.
- Screenshot inspected at scratch/alignment/recognized-player.png. Real measured
  timing in playback is verified; natural handwriting and perceptual boundary
  accuracy still require listening/viewing review across a wider lesson set.

Existing server processes should restart after worker upgrades to clear cached
failed tracks. Changes are in the isolated codex/lesson-foundation worktree, not
merged into the user's dirty main checkout.
