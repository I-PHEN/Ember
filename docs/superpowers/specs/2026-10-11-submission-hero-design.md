# Ember submission-ready hero

## Approved direction

The user approved the recommended stacked layout: headline, large question input and examples, product film immediately underneath in the same hero, deeper comparison, then community gallery. This refines presentation only; no new features, paid services, film regeneration, or lesson-engine changes.

## Layout and identity

Keep the existing headline and description, charcoal #111315, amber #e6b784, Geist typography, and board-only handwriting. Retain the 780px composer, four textarea rows, 140px desktop/120px mobile minimum writing height, examples, authentication behavior, and create-lesson action.

Move LaunchFilm inside the hero after the composer/example group, outside the narrower hero-copy wrapper. Remove the intervening hero gallery invitation and let the existing community section carry gallery discovery after the comparison. Keep the at-your-pace caption concise; no additional divider or standalone promotional block between question entry and film.

The film stays a readable 16:9, maximum 1000px wide presentation with a compact heading, visible 52-second duration, native controls, captions, downloads, transcript, and existing loading-error fallback. Allow 32px separation from the question group on desktop and 24px on mobile. Reduce hero outer padding to 56px top/48px bottom desktop and 36px top/32px bottom mobile. Preserve the existing headline measure; do not compress the composer to fit a desktop viewport. The beginning of the film should follow naturally on the first scroll, not behind another content section. No autoplay, automatic audio, scroll pinning, new animation, or duplicate film.

## Component boundary

LandingPage owns section order and existing prompt/auth state. LaunchFilm owns only static media presentation and its error state; give its hero placement a scoped class or explicit presentation variant if needed without changing its media behavior. LearningComparison and CommunityJourney retain their existing content and interactions. Static media files remain unchanged; no generation request on homepage mount.

## Verification

Add actual-render regression coverage for the film being within the hero, the absence of the redundant gallery invitation, and the preserved textarea and media contracts. Check normal narrow/wide CSS layout, keyboard focus, navigation, native playback and failure alternatives. Capture real desktop browser proof. Attempt mobile visual verification and report a concrete tool limitation if the viewport still cannot be changed. Run relevant tests, changed-file lint, full suite and production webpack build serially. Build configuration skips global TypeScript validation; do not claim otherwise.

Commit verified work with the repository co-author footer. Push only codex/synchronized-teaching and promote only a Ready matching build to ember-generation-test. Verify the deployed commit and actual homepage. No main merge or main Ember project deployment.

## Submission preparation

1. Freeze features and identify the final submission platform, deadline, required fields, permitted video length, and public URL requirements from the user's supplied destination. Those facts are not known; do not invent them or submit anything externally yet.
2. Run three representative lessons: x + 2 = 5, integration by parts, and a forces-on-an-incline problem. Check correctness, narration/board ordering, no repeated narration, usable pacing, silence, seeking, and follow-up behavior. Existing generated lessons are not evidence that new generation succeeds. Account/API quota failures are reported explicitly.
3. Review the live landing page, authentication, generation progress/error messaging, studio playback, gallery and mobile layout. Fix only submission-blocking defects through a separate scoped diagnosis/fix if needed, rather than changing the engine as part of this hero task.
4. Prepare an editable submission pack: plain-language one-sentence description, problem/audience, what Ember does, accurate limitations, live URL, repository URL if required, the existing 52-second MP4, and three screenshots. No unsupported metrics, perfect-sync claims, or superiority claims.
5. Verify the final deployment and perform a timed reviewer-style walkthrough. Keep a fallback recorded lesson/demo for generation quota or network issues, identified honestly as prepared.
6. Present the filled submission draft to the user for approval. Do not publish, accept terms, pay, or send the submission on their behalf without appropriate authorization.

## Acceptance

The hero contains both the primary input and product video with no unrelated invitation between them. The comparison and gallery remain deeper on the page. The existing film and engine remain intact. Submission preparation has clear checks and assets, with actual external submission gated on the destination and user review.
