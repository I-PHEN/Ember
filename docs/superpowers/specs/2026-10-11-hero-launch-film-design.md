# Ember hero and launch film

## Approved brief

Enlarge the homepage question input, deepen the comparison, and replace the scroll-driven product animation with a 40–60 second launch film. Deliver an embeddable video and a local MP4. Keep Ember's identity and existing lesson engine intact. No new product features or paid services.

## Direction and alternatives

Recommended: a 48-second product-led film, using Ember's actual board renderer and faithfully represented studio controls. It demonstrates the learning experience rather than advertising backend machinery. A typography-only trailer would be simpler but would not establish what Ember does. A raw screen recording would be honest but less readable and less deliberate at this length.

Use the existing local launch draft only as reusable source material. Its MP4 is not the finished deliverable. Preserve the original launch folder and build the revised version in the isolated checkout. Remove unsupported claims, the fictional domain, backend-centric scenes, and disparaging generic-chat comparisons.

The supplied What Ships consumer directory is a reference, not a source of media to copy. The Cosmos 54-second entry was inspected; playback was buffering at design time, so no claim is made about watching its motion or editing.

## Homepage

Keep the current headline, authentication flow, example questions, and question entry as the primary action. Grow the composer from its 610px maximum toward 780px, with a 140px minimum writing area on desktop, 120px on mobile, larger readable input text, and clear focus styling. Avoid imposing a larger mobile width than the viewport.

Place the film beneath the question-and-starters group, replacing the ScrollLearningFlow section. Use a deliberate poster showing the board and Ember identity, a visible duration, native playback controls, and a download link. No autoplay, automatic audio, scroll pinning, fake cursor, or required animation to understand the page. Keep the remaining community section and navigation.

## Film: 48 seconds, 1920×1080, 30fps

| Time | Story | Visible proof |
| --- | --- | --- |
| 0–5s | Getting an answer is not always understanding it | A correct integral answer, then the student's question: “Why this step?” No claims about competing products' speed or abilities. |
| 5–9s | Introduce Ember | Charcoal studio, restrained wordmark and amber spark-swash. |
| 9–16s | Bring your own question | A readable composer enters the integration-by-parts problem and selects Create a lesson. Do not imply instant generation. |
| 16–23s | A lesson you can work with | Show chapters and revisiting a specific step, replacing the existing backend-agent sequence. |
| 23–34s | Follow the reasoning | The real renderer writes u = x, du = dx, dv = e^(2x) dx, and v = ½e^(2x), with enough hold time to read. Frame this as an edited excerpt, not an uncut full lesson. |
| 34–41s | Ask why | Prepared Office Hours example: choosing u = x simplifies its derivative and keeps the remaining integral manageable. |
| 41–44.5s | Find another way in | A readable community gallery shot rather than a dense board-theme or architecture checklist. |
| 44.5–48s | Brand payoff | “Every problem, a lesson.” and “Create your first lesson.” No unowned domain or fabricated usage metrics. |

Use #111315 charcoal, #e6b784 amber, Geist Sans/Mono and BoardHand only for board writing. Keep motion focused on the board and readable studio close-ups; do not scatter ornamental effects. Keep all important text inside a generous safe area. No captions smaller than readable at the embedded size.

Audio: a restrained original procedural score, without the existing typing, transition whooshes, and chimes. Only include an existing voice excerpt if its words match the board exactly and remain intelligible; otherwise use on-screen text rather than an unrelated spoken sample. Supply captions for any included speech. Do not change generated-lesson audio settings to produce marketing media.

## Deeper comparison

Use the same integration-by-parts problem across both sides. Give the written explanation genuine substance: choosing u/dv, integrating the exponential, applying the formula, and checking the result by differentiation. Do not deliberately weaken it to make Ember look better.

Beside it, explain three concrete learning moments: following the derivation as it appears, returning to the u/dv choice using chapters, and asking why a different choice would be less convenient. Use clear prepared examples, not controls that pretend to call AI. Retain the existing real-player excerpt where useful; identify its silent/prepared nature. Include the limitation that chat tools can also explain steps, while Ember provides board, voice, chapters, and follow-up in a coordinated workspace. No claims of improved grades, guaranteed correctness, or perfect synchronization.

## Boundaries and delivery

Film sources and renderer stay separate from production lesson-generation code. Reuse the real board rendering interface, not its implementation internals or global speed constants. The homepage reads a static MP4 and poster; it does not start generation or a render job. Keep original user changes untouched.

Export a verified H.264 MP4 with browser-compatible audio if present and fast-start metadata where tooling supports it. Target a compact web asset; deliver the local export path too. Preserve the source so the film can be revised without recording again. Include a plain-text transcript or captions for speech and meaningful marketing text.

## Verification and rollout

Check runtime is within 40–60 seconds, dimensions and actual container/codec, start/middle/end frames, legibility, correct mathematics, and speech-to-board correspondence. Check mobile and desktop layout, keyboard access, native play/pause/seek, download, and video loading failure fallback. Run landing regressions, changed-file lint, and the webpack production build. Do not confuse a successful build with an unrestricted TypeScript check.

Commit the completed work after verification. Deploy only ember-generation-test on the existing synchronized-teaching branch and verify its actual deployment commit and video asset. Do not merge or deploy the main Ember project as part of this task.

## Review checkpoint

The user approved the overall brief and direction. This written storyboard and scope need review before implementation and rendering. No homepage or launch source changes have been made during this design phase.
