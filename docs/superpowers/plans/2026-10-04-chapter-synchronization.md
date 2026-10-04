# Chapter synchronization implementation plan

> **For agentic workers:** Use superpowers:executing-plans for the user's chosen inline execution.

**Goal:** Sidebar chapters and chapter seeks use the audio-adjusted player timeline.

**Architecture:** The player publishes detached chapter snapshots on compilation and timing updates. Scene-index seeks resolve against its current timeline, avoiding click-time races. Snapshots and requests carry script identity so revisions cannot reuse stale data.

**Tech Stack:** TypeScript, React, Bun tests, existing canvas player.

## Global constraints

Keep Gemini narration, the installed alignment model, current visual brand, and natural pen-speed bounds. No additional model download, public publishing, or main-checkout merge. Matrix layout and mandatory review remain separate subsequent checkpoints under the approved design.

## Task 1: Timeline-derived navigation

Files: create `src/lib/video/chapters.ts`, `tests/chapters.test.ts`; modify `src/components/player/SolvePlayer.tsx` and `src/app/page.tsx`.

Interfaces:
```ts
type Chapter = { sceneIndex: number; t: number; label: string };
chapterSnapshot(tl: Timeline): Chapter[];
chapterSeekTime(tl: Timeline, sceneIndex: number): number | null;
```

- [x] Write tests using real compiled scripts and `setSceneAudio`: 10 seconds of audio places chapter two at 10.5 seconds (including the compiler's half-second tail); retiming to 20 seconds moves it to 20.5 while the earlier snapshot stays unchanged. Excluded intros contribute time. Invalid indices return null.
- [x] Run `bun test tests/chapters.test.ts` and observe missing functionality fail.
- [x] Implement accumulation from `tl.scenes`, excluding intro entries from display only. Resolve valid integer scene indices at call time and seek just inside the scene: `start + Math.min(0.01, dur / 2)`.
- [x] Publish snapshots through `onChaptersChange(script, chapters)` on timeline/duration changes. Store `{script, chapters}` in the page and display only matching-script snapshots. Replace `voiceVer` recompilation. Requests carry `{sceneIndex, script, n}`; reject stale-script requests, preserving existing `{t,n}` callers.
- [x] Run focused and full Bun tests, focused lint, and production build with the existing offline-font fixture. Inspect type errors against the known baseline.
- [x] Verify chapter labels and navigation in the running browser when feasible without another paid lesson generation. Commit the isolated change with the required co-author trailer. Report any unverified browser behavior explicitly.

## Evidence

- Red/green: the empty snapshot implementation failed both measured-timing and intro tests; accumulation passed all three tests (12 assertions).
- Full suite: 149 passing tests, 352 assertions. Focused ESLint and diff whitespace checks pass.
- Typecheck: four pre-existing gallery/renderer errors remain; no chapter-change errors.
- Browser: saved matrix lesson chapter labels changed as audio loaded. Practice selected the practice scene, answer selected the answer scene at 2:18 within a 2:46 timeline. The old behavior selected the answer from the practice button.
- The first browser build contained a reset callback corrected during its build. The final build passed and was restarted on port 3018; the saved lesson opened without a new reset error. No new lesson script was generated for this check; replay may regenerate uncached audio.
