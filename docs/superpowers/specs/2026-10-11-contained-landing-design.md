# Contained Ember landing refinement

## Approved direction

The landing page should feel compact and deliberately contained, not stretched across the screen. This refines the already deployed compact hero; it does not change generation, narration, authentication, or the existing launch video. Curated lessons follow as a separate task.

## Layout and composer

- Use the headline “Every problem, a lesson.” Keep Ember's frozen charcoal and amber brand.
- Match the actual studio composer in both total width and total height: 720px desktop maximum, responsive mobile width, two-row textarea, padding, divider, control sizes, and button proportions. Do not equate matching textarea height with matching the whole form.
- Match the studio placeholder, character counter, keyboard affordance, and Start lesson treatment. Keep an accessible label without a visible extra row that increases height.
- Preserve working prompt submission and sign-in behavior. Do not introduce a decorative, nonfunctional upload button. If the studio attachment control is reproduced, it must hand off to the existing studio upload flow; no new upload backend is in scope.
- Center the comparison, community demonstration, benefits, and closing content in a shared 960px maximum-width container. Use 24px mobile gutters at medium widths and 16px gutters on small screens. Navigation may retain its existing width.
- Keep the film directly below the composer, capped at the same 960px content width. Preserve muted autoplay, native controls, captions, reduced-motion handling, and the existing video bytes.
- Reduce oversized section padding and inter-section gaps. Prefer roughly 48–64px section spacing on desktop and 32–40px on mobile. Keep readable grouping; do not compress text line-height to remove empty space.

## Comparison and existing scroll demonstration

- Place the shared integration question above two equal-width, separately rounded dark panels: a concise written solution and Ember's existing prepared board excerpt.
- Preserve Follow the reasoning, Revisit the decision, and Ask why interactions and the prepared-example disclosure. Do not imply the static example is a live generation request.
- Stack the panels on small screens. Keep panel content bounded and readable, with internal scrolling only where needed rather than large empty fixed-height boxes.
- Refine the existing demonstration cursor and phrase highlights to make their movement clear inside the contained demonstration. Keep the cursor decorative and local to the scene; do not replace the real pointer or hijack scrolling.
- Retain a static, readable reduced-motion presentation. Shorten the existing long sticky-scroll region if it creates excessive blank space; do not create another animation subsystem.

## Architecture and verification

The landing page owns prompt submission; existing landing components own comparison, film, and scroll-demo behavior. Share sizing tokens and, where warranted, a small composer presentation boundary rather than duplicating divergent dimensions. Leave engine, provider, database, and job code untouched.

Verify the rendered total composer bounds against studio at the same desktop and mobile viewport, not just CSS declarations. Check keyboard submission, sign-in handoff, comparison modes, film controls, reduced-motion fallback, and horizontal overflow. Capture desktop and mobile screenshots. Run relevant tests, changed-file lint, production webpack build, and regression tests before committing implementation. Push only a fast-forward update to main and verify the public deployment actually contains the revised headline and layout.

## Next phase

After the hero is verified and deployed, prepare two recorded starter lessons: a nontrivial mechanics problem involving an inclined block, friction, and a connected hanging mass; and integration by parts with the choice of substitution explained and the result checked. Their audio and timing require separate verification before being offered as ready-to-watch lessons.
