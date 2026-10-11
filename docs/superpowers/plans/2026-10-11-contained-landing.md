# Contained landing implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved compact landing page, matching studio composer proportions and containing comparison and closing content.

**Architecture:** Keep landing submission in page.tsx; extract its composer presentation into LandingComposer with controlled value and callbacks. Reuse existing Textarea/Button primitives and the studio's sizing classes. Refine shared landing CSS and the existing community demonstration without changing the engine.

**Tech Stack:** Next.js, React, Tailwind/CSS, Framer Motion, Bun tests, browser UI verification.

## Global constraints

- 720px desktop composer; total form height and controls match studio, not only the textarea.
- Content maximum 960px; mobile gutters 24px medium, 16px small.
- Existing launch film and backend remain unchanged; no paid services or new upload backend.
- Decorative cursor stays in the demonstration; no scroll hijacking; static reduced-motion fallback.
- Original user checkout stays untouched; use the existing managed isolated worktree.

## Task 1: Composer parity

Files: create src/components/landing/LandingComposer.tsx; modify src/app/page.tsx and src/app/globals.css; create tests/landing-composer.test.tsx.

Interface: LandingComposer consumes question:string, busy:boolean, onChange:(value:string)=>void, onSubmit:()=>void, onAttach:()=>void. onAttach opens the existing studio to attach an image, labelled explicitly so it does not pretend to upload locally.

- [ ] Write SSR tests using renderToStaticMarkup: an empty form has disabled Start lesson; a nonempty 600-character prompt is enabled; 601 is disabled; supplied question is rendered and its character count is displayed. Test the keyboard boundary with literal events: Enter submits, Shift+Enter does not, Ctrl/Meta+Enter submits even with Shift, composition does not submit, and disabled state does not submit.
- [ ] Run `bun test tests/landing-composer.test.tsx` and confirm expected failures before implementation.
- [ ] Implement the controlled component using the studio's exact Tailwind form, textarea, bottom strip, and h-8 button sizing. Preserve accessible label and use onAttach for the real studio handoff. Replace the old form with `<LandingComposer question={prompt} busy={loading} onChange={setPrompt} onSubmit={launch} onAttach={launch} />`; replace headline with Every problem, a lesson.
- [ ] Remove old landing form sizing overrides that conflict with the reused primitives. Run composer and existing hero/film tests, lint, then commit after verification.

## Task 2: Containment and compact demonstration

Files: src/app/globals.css; src/components/landing/CommunityJourney.tsx only if scroll offsets require adjustment. Existing comparison markup already places the question above the panels.

- [ ] Before editing, measure browser-rendered .landing-width and .landing-composer bounds at 1280px and 390px and capture the current stretched comparison.
- [ ] Set `.landing-width { width: min(960px, calc(100% - 48px)); margin-inline: auto; }`, retaining small-screen calc(100% - 32px). Cap film at 960px. Use two equal columns with 16px gap and separate rounded panel borders, removing the shared outer frame.
- [ ] Use 56px desktop section padding, 36px mobile; reduce intro and equation spacing. Replace the 210vh/180vh sticky community runway with a normal compact scene: `.community-pin` minimum-height:auto, scene height 280px desktop/220px mobile, and useScroll offsets `['start end', 'end center']`. This lets the existing cursor complete while its scene is visible instead of adding blank scroll distance. Keep existing static reduced-motion presentation and make host positioned for correct Framer measurement.
- [ ] Verify equal panel widths, 960px cap, no overflow, cursor/highlight progression and mobile stacking in the real browser; inspect screenshot and fix collisions before committing.

## Task 3: Verify and publish

- [ ] Run focused tests, changed-file ESLint, `bun test`, and `node node_modules/next/dist/bin/next build --webpack`. Record actual failures rather than claiming type checking passed when Next skips it.
- [ ] Inspect desktop and mobile hero/comparison/closing screenshots, keyboard submission/sign-in handoff, all comparison modes, film autoplay/pause and absence of download links. Compare total composer geometry to studio's controls using a same-viewport rendered studio-style fixture if authentication prevents accessing studio locally.
- [ ] Record evidence in docs/verification/2026-10-11-contained-landing.md; commit verified changes with repository co-author footer.
- [ ] Fetch origin/main and confirm fast-forward ancestry; push HEAD:main without forcing. Verify live deployment shows the new headline and 960px bounds. If access fails, report it without claiming deployment completion.

## Design critique

Keep the frozen charcoal #111315, recessed #12151b, text #f4f4f6, muted #6a7180, and amber #e6b784. Geist supplies body and utility text; existing handwriting supplies only the brief heading accent. The product film remains the main visual; the comparison's real board and contained highlight cursor provide product-specific depth. Avoid additional decorative cards and empty fixed-height panels.
