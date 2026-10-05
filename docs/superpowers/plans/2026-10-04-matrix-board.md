# Matrix board implementation plan

> Execute inline with superpowers:executing-plans and test-driven-development, as requested.

**Goal:** Render persistent, addressable handwritten matrices without flattening or truncating entries.
**Architecture:** A validated matrix beat feeds a pure geometry builder; the existing compiler schedules its paths at normal pen pace. Relative target regions on the single matrix group follow its reflow and erasure.
**Tech Stack:** TypeScript, existing stroke font/canvas compiler, Bun.

## Constraints

Keep current brand, Gemini narration, alignment model, and pen-speed bounds. No downloads or publishing. Mandatory review is the following checkpoint. After all repairs, create and fully review three curated starter videos for judges; do not promise perfection or ship unreviewed starters.

## Task 1: Geometry, compiler, and generation contract

Files: create `src/lib/video/matrix.ts`, `tests/matrix.test.ts`; modify `src/lib/video/types.ts`, `src/lib/video/compile.ts`, `src/lib/solve-schema.ts`, and `src/lib/prompts.ts`.

Interfaces: matrix beat `{type:"matrix", id:string, label?:string, rows:string[][], keep?:boolean, size?:BeatSize, color?:MarkerName, say?:string}`. Targets `matrix:A`, `matrix:A:row:2`, `matrix:A:col:3`, `matrix:A:cell:2:3` use one-based indices. Group stores relative `regions` and `boardId`, avoiding duplicate strokes and collision-audit false positives.

- [ ] Write real sanitizer/compiler tests for the reference 2x3 matrix, preserved six entries, separated rows/columns, point/highlight targets, erasure/reflow persistence, absent targets, ragged/empty/oversized data, and normal pen timing. Run red before implementation.
```ts
const rows = [["2","7","-4"],["6","3","5"]];
const beats = sanitizeSceneBeats([{type:"matrix",id:"A",rows,keep:true}], "");
expect(beats[0].type).toBe("matrix");
```
- [ ] Validate 1–6 rows/columns, nonempty cell strings up to 24 characters, ASCII IDs up to 16 characters, labels up to 24 characters; reject ragged or unrenderable content rather than truncate. Geometry measures actual glyph widths, aligns columns, brackets rows, and tries smaller caps down to 20px before rejecting overflow.
- [ ] Compile as one group using existing `addPaths`; keep relative cell/row/column regions. Resolve exact matrix targets before legacy text fallback; unknown matrix targets return null. Decorations anchor to the matrix root, so they survive and move with it. Detect duplicate live IDs. Clear live ink spatially before placement; fail if retained content leaves no room.
- [ ] Update writer and reviewer prompts with the structured beat and target syntax, persistent-matrix guidance, and prohibition on nested-list write beats for matrices.
- [ ] Run matrix tests, full regression suite, lint and type checks. Render a reference fixture and inspect its layout visually; build production and document any remaining end-to-end gaps. Commit with project co-author trailer.

## Completed checkpoint evidence

All implementation steps above are complete. Eight matrix tests pass, including reflow targeting and unsupported-symbol rejection; full suite: 157 tests, 412 assertions. Focused lint and production webpack build pass. Typecheck retains only the four known gallery/renderer errors. Geometry previews at 1280x720 and 640x360 were visually inspected: correct 2x3 matrix, brackets, highlighted 5, and subscript answer. Preview command: `bun tests/matrix-preview.ts`. This is deterministic compiler geometry, not yet a new end-to-end generated lesson or an audio listening review. Existing saved lessons are not retroactively rewritten.

October 5 integration correction: separate writers may emit the same persistent
matrix again. Exact ID/content repetition now points to existing ink rather than
crashing or redrawing it. Conflicting entries/labels still fail. The ninth matrix
test reproduces this previously failing case; full suite now has 164 passing tests.
