# Compact, product-led Ember hero

## Goal and scope

Refine the existing landing page before adding curated lessons. The user approved a studio-sized input, tighter spacing, a concrete comparison, and muted autoplay for the existing launch film. Preserve Ember's charcoal and amber brand, the launch media files, authentication, and the Neon/Inngest generation pipeline.

This supersedes the four-row composer, manual-only film playback, and download links in the earlier submission-hero design. It does not change the lesson player or teaching pace.

## Hero composition

- Keep the headline, supporting copy, question input, and film in that order.
- Limit the composer to 720px, matching the studio. Use a two-row textarea, approximately 64px tall on mobile and 72px on larger screens, with the studio's restrained padding and charcoal surface.
- Preserve labels, prompt submission, starter questions, focus treatment, and the existing sign-in flow.
- Reduce oversized gaps between the copy, composer, and film. Keep the film wider than the input, with no horizontal overflow on small screens.
- Fill the hero through stronger grouping and the existing film, not additional decorative content or new features.

## Launch film

- Reuse the current 52-second MP4, poster, and captions without editing or regenerating them.
- Start playback automatically when motion is allowed, muted and inline. Retain native controls so visitors can pause, seek, and enable sound.
- Respect reduced-motion preferences by showing the poster and allowing manual playback instead of autoplay. Do not loop automatically.
- Remove MP4 and transcript download links and their icons. Request suppression of the native download control with `controlsList="nodownload"`; this is not a restriction on access to the underlying public file.
- If autoplay is blocked, native manual playback remains available. If loading fails, show a concise retry/reload message rather than referring to removed download links.
- Keep the duration and edited-product-demonstration disclosure visible.

## Comparison

Use the heading "Getting an answer vs understanding the step." Show the same integration-by-parts question on both sides.

The answer side contains the result and a short worked explanation, not a long essay. The Ember side retains the actual prepared board excerpt and its existing three modes, expressed as:

1. Follow the reasoning: see the derivation unfold on the board.
2. Revisit the decision: return to the choice of u and dv.
3. Ask why: read a concise explanation of that choice.

Each mode should communicate one concrete benefit, without repeating the entire derivation in surrounding prose. Preserve the honest disclosure that these are prepared examples and do not send an AI request. Do not claim chat models cannot teach steps or pretend the prepared response is live generation.

## Component boundaries

`src/app/page.tsx` continues to own the landing prompt and section order. `LaunchFilm` owns film playback preferences, accessible controls, and loading failure copy. `LearningComparison` owns the prepared comparison modes and board excerpt. Scoped landing CSS owns responsive sizing and spacing; studio styles and engine code remain unchanged.

## Verification and completion

- Update landing tests for two-row input, one film inside the hero, muted autoplay behavior, reduced-motion handling, and absence of download links.
- Check comparison content, prepared-example disclosure, and all three existing interactions.
- Run focused tests, changed-file lint, and a production webpack build; run the broader suite before claiming regression coverage.
- Inspect desktop and mobile screenshots, real playback, keyboard focus, native sound/pause controls, and horizontal overflow.
- Commit the verified refinement separately from this design document. No curated lesson cards, backend changes, or new media are included.
