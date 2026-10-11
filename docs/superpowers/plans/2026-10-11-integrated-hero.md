# Integrated hero implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Bring the existing product video into the hero immediately below question entry.

**Architecture:** LandingPage owns section order; LaunchFilm keeps its existing static-media/error behavior. Scoped descendant CSS avoids a second landing-width gutter inside the hero. Existing comparison and community remain unchanged.

**Tech Stack:** React, Next.js, CSS, Bun tests.

## Global Constraints

- Preserve existing video and all media files; user already has the demo. No rendering or video replacement.
- No new product features, paid services, backend/engine changes, or auth-flow changes.
- Preserve original checkout; work in the existing isolated teacher-paced-generation worktree.
- Keep input sizing and charcoal/amber identity.
- Commit co-author footer; push codex/synchronized-teaching, deploy ember-generation-test only; no main merge.

## Task 1: Integrate the film into the hero

Files: src/app/page.tsx, src/app/globals.css, tests/landing-hero.test.tsx. LaunchFilm.tsx may change only if necessary to expose a scoped placement class; prefer no changes.

Interfaces: Render real LandingPage within real AuthProvider using renderToStaticMarkup; no component mocks. Existing LaunchFilm contract stays controls/preload none/inline/captions/downloads/fallback/no autoplay.

- [ ] Add a real-render regression that catches video outside the hero or an unrelated gallery block before it. Parse rendered section tags with a small stack or use an available DOM parser; don't grep source. Verify exactly one video, its hero ancestor, question entry before video, comparison and community after hero, no hero-gallery-invitation, textarea rows4 and existing media links.
- [ ] Run bun test tests/landing-hero.test.tsx and observe expected assertion failure on current placement.
- [ ] Move `<LaunchFilm />` immediately after the hero-copy closing div and before the hero section closes. Remove only the redundant hero-gallery-invitation div; preserve community gallery below comparison.
- [ ] Set desktop `.landing-hero.hero-focused` padding-block to 56px 48px. Add `.hero-focused .launch-film { width: 100%; margin-top: 32px; padding-block: 0; }` with specificity at least existing `.ember-landing .launch-film`. Preserve max-width1000px and center.
- [ ] Set the existing max-width800px focused hero padding to 36px 32px and film margin-top24px. Ensure max-width600px launch-film padding-bottom48px cannot override the hero placement's zero padding: add appropriately scoped hero rule in that media block. Remove unused hero-gallery-invitation CSS only. Preserve composer and native-media styles.
- [ ] Run new test plus tests/launch-film-player.test.tsx, lint changed TSX, git diff --check. Record red/green evidence and commit only task files.

## Task 2: Verify and roll out

- [ ] Independently review task diff, resolve actionable defects.
- [ ] Stop only task-owned dev3101 during heavy checks. Run full bun test with FFMPEG_PATH, then webpack build, serially. Restart dev3101 afterwards.
- [ ] Actual browser desktop: confirm video belongs to hero, follows examples without gallery interlude, width/gap/padding, media contract, comparison/gallery remain. Attempt narrow viewport only if tool supports it; report unavailable mobile visual QA honestly.
- [ ] Commit verification notes and push normal fast-forward to codex/synchronized-teaching. Promote Ready matching commit only on ember-generation-test; verify live homepage and save screenshot proof.
- [ ] Report implementation and deployment, existing video unchanged. Submission destination/deadline remain user-supplied prerequisites; don't generate a new demo or submit externally.
