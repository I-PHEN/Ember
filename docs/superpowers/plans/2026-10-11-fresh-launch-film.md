# Fresh Ember Launch Film Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Create a fresh 52-second Wabi-informed Ember film, deliver the MP4 locally, and embed it beneath a larger composer with a deeper comparison.

**Architecture:** Film sources are isolated in tooling/launch-film. They import the actual board renderer without editing the lesson engine. The homepage uses static public media, so rendering tools never ship to browsers or run during Vercel builds.

**Tech Stack:** Bun, TypeScript, canvas, existing puppeteer-core for offscreen artifact rendering only, FFmpeg, React, Next.js webpack.

## Global Constraints

- Do not reuse the rejected C:/Users/Michael/Ember/launch draft's source, composition, soundtrack, shots, or story.
- Keep generated-lesson timing, narration, and Neon/Inngest behavior unchanged.
- Charcoal #111315, amber #e6b784, Geist Sans/Mono; BoardHand only for board writing.
- No new product features or paid services.
- Final film: 52 seconds, 1920×1080, 30fps, H.264 yuv420p MP4 with browser-compatible audio.
- No copying Wabi's music, graphics, text, or assets.
- User-approved storyboard: question → lesson → revisit a step → ask why → brand close.
- No autoplay, automatic audio, scroll pinning, fake cursor, or required animation to understand the page.
- Preserve original user checkout. Commit with Co-Authored-By: Claude Code <noreply@anthropic.com>.
- Only ember-generation-test deployment; no main merge or main project deployment.

## Task 1: Create and export the fresh film

**Files:**
- Create tooling/launch-film/story.ts: deterministic storyboard/clock and showcase math.
- Create tooling/launch-film/film.ts: scene painting and transition/camera composition.
- Create tooling/launch-film/score.ts: original restrained musical PCM output.
- Create tooling/launch-film/render.ts: repeatable export, fonts/assets, FFmpeg validation.
- Create tooling/launch-film/README.md: exact export command, environment parameters, source attribution.
- Create tests/launch-film.test.ts: clock boundary/invalid input, showcase semantics, score bounds if exposed.
- Create public/media/ember-launch.mp4, ember-launch-poster.jpg, ember-launch.vtt, ember-launch-transcript.txt.

**Interfaces:** Consume compileTimeline and renderFrame from src/lib/video. Produce getFilmState(seconds) with bounded scene-local time, renderFilmFrame(ctx, seconds), and the four static public assets above. Render command accepts FFMPEG_PATH and CHROMIUM_PATH; no hardcoded personal paths in tracked tooling. Use --stills for a quick QA export before the full video.

- [ ] Add failing tests first. Clock contract: negative/nonfinite time clamps to start, scene boundaries choose the new scene, values beyond 52 remain on the closing frame. Test showcase has x + 2 = 5, subtract 2 on both sides, x = 3 with no title beat. Verify actual compiled strokes are nonempty and have finite time bounds.

```ts
expect(getFilmState(-1).scene).toBe('question');
expect(getFilmState(14).scene).toBe('lesson');
expect(getFilmState(100).scene).toBe('close');
```

- [ ] Run `bun test tests/launch-film.test.ts`, observe failure for the missing implementation; add implementations and rerun.
- [ ] Build a fresh scene composition guided by the approved design spec. One focal point per shot; sparse short text interleaves product detail. Use the same simple equation throughout. Carry the amber writing stroke into the next scene, camera easing and controlled crops rather than feature-card slides. No intro competitor card, pills full of backend buzzwords, wall of small type, or dense theme checklist.
- [ ] Use the approved timing: 0–4 hook; 4–8 brand; 8–14 composer; 14–28 board; 28–35 chapter revisit; 35–43 prepared Office Hours; 43–48 truthful gallery/subjects; 48–52 close. Prepared/edited demonstrations must be identified; no promise of six-second generation. Voice is not required; provide original score and on-screen narrative.
- [ ] Load actual fonts before rendering, fail explicitly on required assets rather than silently substituting. Rendering must not allow arbitrary filesystem requests. Validate FFmpeg exit status and fail if not MP4/H.264. An offscreen browser rendering this owned canvas is artifact generation, not automation of the user's browser session.
- [ ] Render QA stills for every scene and transition. Report exact output paths so the controller can inspect before full rendering. Revise on visual feedback.
- [ ] Export the complete film with fast-start, deliver a local copy at C:/Users/Michael/Downloads/Ember-launch-52s.mp4, preserve web assets in public/media. File copies for binary generated artifacts are permitted; do not overwrite an existing local export without choosing a distinct name.
- [ ] Test and lint changed source, inspect exported codec/duration and audio peak bounds; commit only Task 1 files. Report tests, asset sizes and limitations honestly (audio audition may not be available).

## Task 2: Enlarge composer, embed film, deepen comparison

**Files:**
- Modify src/app/page.tsx: replace ScrollLearningFlow import/render with LaunchFilm, textarea rows=4.
- Create src/components/landing/LaunchFilm.tsx: semantic video, fallback, download/transcript links.
- Modify src/components/landing/LearningComparison.tsx: substantial same-problem worked explanation and meaningful lesson interactions.
- Modify src/app/globals.css: scoped composer/media/comparison styles, avoid specificity collisions.
- Create tests/launch-film-player.test.tsx: actual React rendering of semantic media/accessibility contract.

**Interfaces:** Consume `/media/ember-launch.mp4`, poster, VTT, transcript from Task 1. Existing launch/auth callbacks and silent real-player excerpt remain unchanged. No generation request on homepage mount.

- [ ] Write failing rendering tests. The actual LaunchFilm component must produce `<video controls preload="none" playsInline>`, a caption track and poster, no autoplay, and functional MP4/transcript download links.

```tsx
const html = renderToStaticMarkup(<LaunchFilm />);
expect(html).toContain('preload="none"');
expect(html).not.toContain('autoPlay');
expect(html).toContain('/media/ember-launch.mp4');
```

- [ ] Observe failure then implement media component with video load error fallback retaining download/transcript access. Native controls handle play/pause/seek/fullscreen. Include duration and an honest “Edited product demonstration” label.
- [ ] Enlarge hero input: maximum width 780px, minimum writing height 140px desktop/120px mobile, font-size 16px, padding 24px desktop/18px mobile, rows=4. Broaden hero copy wrapper so it does not cap input at 720px. Keep headline/description measure deliberate and preserve user/auth behavior.
- [ ] Remove only scroll-driven animation from homepage; preserve how-it-works route and community content. Replace the vacated section with a static poster-led film presentation below the question box, with generous but compact spacing.
- [ ] Deepen written comparison honestly. Show u=x, du=dx, dv=e^(2x)dx, v=½e^(2x); apply integration by parts to reach ½xe^(2x)−¼e^(2x)+C; verify by differentiation. Include explicit learning moments: follow the derivation, revisit the u/dv decision, ask why. Do not weaken text to fake superiority. Keep prepared follow-ups labeled and no fake AI calls.
- [ ] Run Task 2 tests and changed-file lint; verify desktop and narrow layout in browser, media playback/seek/download and error fallback. Commit only Task 2 files.

## Task 3: Integrated verification and rollout

- [ ] Run `bun test`, then `node node_modules/next/dist/bin/next build --webpack`, then changed-file ESLint and `git diff --check` (avoid overlapping CPU-heavy jobs).
- [ ] Review complete feature diff with independent reviewer and resolve critical/important findings. Record exact evidence and any unverified audio/design claims.
- [ ] Push normal fast-forward to existing codex/synchronized-teaching branch. Promote only a ready matching deployment to ember-generation-test. Verify actual deployed commit, homepage video asset and composer/comparison, not merely build status. Do not change main deployment.
- [ ] Deliver absolute local MP4 link and inline video preview, plus test-site link if verified. If deployment/browser verification fails, state that limitation instead of claiming it is live.
