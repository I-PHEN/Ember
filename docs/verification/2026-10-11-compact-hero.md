# Compact hero verification — 2026-10-11

## Delivered

- Studio-sized composer: 720px maximum width, two rows, 72px desktop / 64px mobile textarea.
- Tighter hero grouping; existing launch film remains inside the hero.
- Muted, inline autoplay after motion preferences are known; no automatic looping. Native pause/play/sound controls retained. Download links/icons and unused download-link styles removed.
- Reduced-motion preference prevents automatic playback and pauses it if the preference changes; manual controls remain available. Listener removed on cleanup.
- Same integral on both sides of a shorter comparison: worked result beside a real board excerpt, with follow/revisit/why interactions and honest prepared-example disclosure.
- No generation, studio, provider, database, or media-file changes.

## Test-first evidence

- Updated composer/film contracts failed against the previous four-row input, metadata preload absence, and download links: 3 failures before implementation.
- Playback preference tests failed because the behavior was absent, then passed after implementation.
- Comparison tests failed against the old heading and mode labels: 2 failures before implementation; passed afterward.
- Browser inspection caught the DOM property casing mismatch (`autoplay` versus React's `autoPlay`). A corrected boundary fixture failed before the fix and passed afterward. Real browser then reported `autoplay: true`, `muted: true`, `paused: false`, and advancing currentTime.

## Automated checks

- `bun test tests/landing-hero.test.tsx tests/launch-film-player.test.tsx`: 8 passed, 0 failed, 64 assertions.
- Changed-file ESLint: exit 0, no output.
- Full `bun test`, with the existing FFMPEG_PATH: 174 passed, 1 skipped, 0 failed; 175 tests across 41 files, 105478 assertions, 35.98s. The real Postgres opt-in test remains skipped. Existing failure-path tests emit expected diagnostic logs.
- `node node_modules/next/dist/bin/next build --webpack`: exit 0; all 16 static pages generated. Project configuration skips build-time type validation.
- Separate `tsc --noEmit --pretty false`: exit 1, eight diagnostics in unchanged `src/lib/video-jobs.ts` and `tooling/launch-film/render.ts`; none in the modified hero components. This is not a globally clean TypeScript claim.
- `git diff --check`: passed.
- MP4 SHA256 unchanged: `7A5593C2FD1B8FADA06CA9AEA4C65FDDDADCAF0EE02998BDDC8D72876CF8AFDE`.

## Browser checks

Local preview: http://localhost:3101/ (webpack dev server restarted after build).

- Desktop 1280px: composer measured 720px, textarea 72px, no horizontal overflow, zero download anchors.
- Mobile 390px: composer measured 343px, textarea 64px, no horizontal overflow. Responsive screenshot inspected; input focus ring visible.
- Native film autoplay advanced to 13.40 seconds, muted. Space paused playback; clicking the sound control changed muted to false; native play resumed playback.
- All three comparison modes exercised. Ask why displayed the alternative-choice explanation; follow displayed its reasoning response; revisit returned to the board's 14-second decision moment.
- Reduced motion and blocked autoplay verified against the playback boundary using controlled browser-API substitutes. Reduced-motion OS preference was not changed for manual browser testing.
- Existing community scroll-position warnings appeared in dev console; no hero errors observed.

Screenshots: `C:/Users/Michael/Downloads/Ember-compact-hero-desktop.png`, `C:/Users/Michael/Downloads/Ember-compact-hero-mobile.png`, `C:/Users/Michael/Downloads/Ember-compact-comparison.png`.

## Review and deployment limits

Separate implementer/reviewer execution was unavailable after the subagent hit the account usage limit. The controller completed test-first implementation and checked the scoped diff against the approved spec, including native playback, listener cleanup, failure copy, and unchanged pipeline/media boundaries. No independent review is claimed.

These commits are local in the existing externally managed worktree. They have not been pushed to main or deployed to Vercel during this task. The original dirty checkout was left untouched.
