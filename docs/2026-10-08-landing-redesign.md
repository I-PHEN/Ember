# Ember: lesson-first landing

Audience: students studying introductory university STEM, with an explicitly planned school-age roadmap. The page's job is to demonstrate learning through a real narrated board, not a simulation of the studio.

## Design tokens
- Studio ground #0b0d10; recessed board #090b0e; surface #12151b.
- Chalk #f4f4f6; secondary #9aa1af; ember #e6b784.
- Existing Geist body/display, BoardHand restrained headline accent, Geist Mono chapter/time utility.
- Warm radial light and a faint board grid establish depth without changing the studio palette.

## Layout
Compact two-column hero: thesis and composer beside the production SolvePlayer. A same-problem comparison pairs illustrative chat text with chapter navigation into that player. A three-stage roadmap marks university intro STEM as current focus and younger/high-school learners as planned. Mobile stacks in reading order.

Signature: a persistent handwritten matrix students can revisit through actual measured chapter seeks. No autoplay, fake chat interaction, invented benchmark statistics, or additional animation engine.

## Implementation and verification
1. Package existing matrix speech and recognized timestamps into public assets; pass saved tracks explicitly to SolvePlayer, forbidding fresh speech fallback in this mode.
2. Replace landing composition and static toggle with real preview, honest comparison, consistent starter links, and roadmap.
3. Replace the how-it-works placeholder with an accurate product workflow.
4. Verify saved-track coverage/transcripts and timeline feasibility, lint, full tests, strict build, and desktop/mobile browser playback and layout.

Scope excludes the later Devpost video, new narration generation, child-facing features, and changes to the generation pipeline. The excerpt is a short demonstration, not one of the three finished judge-facing starter lessons.
