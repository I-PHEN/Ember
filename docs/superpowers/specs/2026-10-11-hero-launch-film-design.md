# Ember hero and launch film

## Approved brief

Enlarge the homepage question input, deepen the comparison, and replace the scroll-driven product animation with a 40–60 second launch film. Deliver an embeddable video and a local MP4. Keep Ember's identity and existing lesson engine intact. No new product features or paid services.

## Direction and alternatives

Recommended: a fresh 52-second product-led film, using Ember's actual board renderer and faithfully represented studio controls. It demonstrates the learning experience rather than advertising backend machinery. A typography-only trailer would be simpler but would not establish what Ember does. A raw screen recording would be honest but less readable and less deliberate at this length.

The user explicitly rejected the existing local launch draft. Do not reuse its source, composition, soundtrack, shots, or story. Preserve that original folder untouched. Create a new film source directory in the isolated checkout. Reusing Ember's production board renderer, fonts, and verified UI assets is permitted; reworking the rejected film is not. No fictional domain, backend-centric scenes, or disparaging generic-chat comparisons.

The specific reference is Wabi's post https://x.com/wabi/status/2104721766690222087, supplied locally as C:/Users/Michael/Downloads/download.mp4. The uploaded film decodes successfully: 80.53 seconds, 1920×1080, H.264, 60fps, AAC stereo. A full-film overview sampled every four seconds and dense half-second opening/product sequences were inspected. These establish visual direction, not a claim of watching every frame in real time. Audio is present, but the assistant cannot audition it with the current audio-input surface; no description of its music or voice is asserted.

Observed reference cues: a fluid colored opening transitions into an exceptionally sparse white stage; short centered phrases precede readable phone/UI demonstrations; the camera moves between full-device and detail crops; avatars pass through a typography scene into the conversation; the same product example continues across shots; text, objects, and screens carry transitions rather than disconnected feature cards. Opening typography shifts between typed phrases and larger payoff statements. Product shots hold long enough to read. A concise brand close follows the demonstrations.

Adapt those editorial cues, not Wabi's assets, wording, pastel palette, phone hardware, or floating emoji. Ember's distinguishing transition is an amber writing stroke becoming part of the board/UI framing. Maintain the charcoal studio and use deliberate negative space, restrained sentence-scale typography, and continuity across one simple mathematical example.

## Homepage

Keep the current headline, authentication flow, example questions, and question entry as the primary action. Grow the composer from its 610px maximum toward 780px, with a 140px minimum writing area on desktop, 120px on mobile, larger readable input text, and clear focus styling. Avoid imposing a larger mobile width than the viewport.

Place the film beneath the question-and-starters group, replacing the ScrollLearningFlow section. Use a deliberate poster showing the board and Ember identity, a visible duration, native playback controls, and a download link. No autoplay, automatic audio, scroll pinning, fake cursor, or required animation to understand the page. Keep the remaining community section and navigation.

## Film: 52 seconds, 1920×1080, 30fps

| Time | Story | Visible proof |
| --- | --- | --- |
| 0–4s | “Some questions need more than an answer.” | Sparse, phrase-led typography; a question's x carries into the next shot. No hostile competitor card or fabricated instant-answer claim. |
| 4–8s | Meet Ember | Ember's amber spark-swash draws into the composer frame; restrained brand introduction rather than a separate decorative montage. |
| 8–14s | Bring a question | Tight composer shot enters x + 2 = 5. Create a lesson transitions into an explicitly edited lesson excerpt, not a promise of six-second generation. |
| 14–28s | “See why each step works.” | Real board strokes show x + 2 = 5, subtracting 2 from both sides, then x = 3. No repeated question heading or gratuitous underline. Readable holds, not accelerated dense calculus. |
| 28–35s | “Go back to the moment it clicks.” | Board camera pulls out to reveal the chapter/timeline controls; revisit the subtract-2 step. Visually distinguish deliberate rewind from unwanted repeated narration. |
| 35–43s | “And ask the next question.” | Prepared Office Hours example asks why subtract from both sides; answer explains keeping the sides equal while isolating x. UI detail crop rather than a feature list. |
| 43–48s | More questions, same workspace | Transition into faithful gallery/subject examples, using existing verified content and no fabricated metrics. |
| 48–52s | Brand payoff | The amber stroke returns to the wordmark: “Every problem, a lesson.” and “Create your first lesson.” |

Use #111315 charcoal, #e6b784 amber, Geist Sans/Mono and BoardHand only for board writing. Keep motion focused on the board and readable studio close-ups; do not scatter ornamental effects. Keep all important text inside a generous safe area. No captions smaller than readable at the embedded size.

Audio: a new restrained original score, not copied from Wabi or the rejected draft. Keep the film understandable through its on-screen story, without depending on narration. No arbitrary typing clicks, transition whooshes, chimes, or unrelated lesson voice sample. Any future speech must be independently verified against board timing and captioned; speech is not required for this text-led direction. Do not change generated-lesson audio settings to produce marketing media. Deliver transcript text describing the on-screen story.

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

The user approved the overall homepage brief but rejected the original film/reuse proposal. This fresh Wabi-informed direction and written storyboard need approval before implementation and rendering. No homepage or launch source changes have been made during this design phase.
