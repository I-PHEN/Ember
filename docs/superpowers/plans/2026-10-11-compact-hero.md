# Compact Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved compact, product-led hero without changing lesson generation or media assets.

**Architecture:** Keep prompt state in LandingPage, preference-aware video playback in LaunchFilm, and prepared comparison interactions in LearningComparison. Use scoped landing CSS; preserve real SolvePlayer and existing starter/auth behavior.

**Tech Stack:** Next.js, React, TypeScript, CSS, bun:test, native HTML video.

## Global Constraints

- Composer maximum width 720px; two rows; 64px mobile / 72px desktop textarea.
- Preserve charcoal #111315 and amber #e6b784.
- Existing 52-second film: muted inline autoplay unless reduced motion is enabled; native controls; no loop or download links.
- Preserve prepared-example disclosure and fair chat-model comparison.
- No backend, teaching pace, curated cards, or media-file changes.
- Work only in the existing isolated worktree; preserve the original checkout.

### Task 1: Compact composer and preference-aware film

**Files:** Modify `src/app/page.tsx`, `src/app/globals.css`, `src/components/landing/LaunchFilm.tsx`; test `tests/landing-hero.test.tsx`, `tests/launch-film-player.test.tsx`.

**Interfaces:** LandingPage and LaunchFilm remain default no-prop React components. LaunchFilm uses a video ref and a motion-preference effect, starting from identical server/client markup with autoplay disabled until preferences are known.

- [ ] Update rendered contract tests: `expect(question![0]).toContain('rows="2"')`; expect `muted=""`, `controlsList="nodownload"`, metadata preload, captions, no `<a ... download>`, no loop. Run `bun test tests/landing-hero.test.tsx tests/launch-film-player.test.tsx` and confirm new assertions fail.
- [ ] Change rows to 2; scope composer max width/padding and textarea height to match studio; remove mobile 120px override; tighten hero-to-film spacing.
- [ ] Use `useEffect`, `useRef`, and preference state in LaunchFilm. Subscribe to `matchMedia('(prefers-reduced-motion: reduce)')`; when motion is allowed, set autoplay and call `video.play().catch(() => {})`; when reduced, remove autoplay and pause automatic playback. Remove event listener on cleanup. Keep manual controls and muted playback.
- [ ] Remove download icons/links. Replace failed-load copy with a reload suggestion. Use `<video controls muted playsInline preload="metadata" controlsList="nodownload">` and preserve poster/captions.
- [ ] Run focused tests, then verify normal and reduced-motion playback in a real browser; check native pause/unmute and mobile width. Commit verified task with required co-author footer.

### Task 2: Concise same-problem comparison

**Files:** Modify `src/components/landing/LearningComparison.tsx`, scoped comparison styles in `src/app/globals.css`; test `tests/launch-film-player.test.tsx`.

**Interfaces:** Existing `view: 'follow' | 'revisit' | 'why'`, replay counter, real TOUR_LESSON and SolvePlayer inputs remain unchanged. No generation requests.

- [ ] Replace old complete-essay test with headline, shared integral, result, concise u/dv explanation, and three benefit labels. Keep paused real-player/disclosure assertions. Confirm changed assertions fail before editing implementation.
- [ ] Render heading `Getting an answer vs understanding the step.`; concise result plus u/dv and substitution on the answer side. Remove repeated differentiation essay.
- [ ] Label buttons `Follow the reasoning`, `Revisit the decision`, `Ask why`. Each response presents one short benefit/example; remove duplicated ordered derivation. Keep honest prepared/silent excerpt notes and chat-model statement.
- [ ] Adjust scoped card typography/spacing and narrow-screen stacking only where needed. Run focused tests and manually exercise all three modes. Commit verified task with required footer.

### Task 3: Final verification and handoff

**Files:** Create `docs/verification/2026-10-11-compact-hero.md`; update these checkboxes.

- [ ] Run `git diff --check`, changed-file ESLint, full `bun test` with existing FFMPEG_PATH, and `node node_modules/next/dist/bin/next build --webpack`. Investigate failures before claiming success.
- [ ] Check desktop/mobile screenshots, no horizontal overflow, actual film time advancement, muted default, pause/unmute, reduced motion, prompt focus, and comparison modes. Save screenshots to absolute local paths.
- [ ] Review final diff against every spec requirement, verify no media or backend files changed, record commands/results and limitations, and commit evidence.
- [ ] Report commit IDs and local preview. Do not claim a live Vercel update without confirming that deployment serves the new commit.
