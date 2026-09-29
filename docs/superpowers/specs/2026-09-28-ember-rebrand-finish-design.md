# Ember rebrand finish — design

Date: 2026-09-28
Status: approved (with revisions from review)
Predecessor: "Chalkcast 1.0" commit + half-landed Codex rebrand in working tree

## Context

Ember (formerly Chalkcast) turns any pasted university problem into a real,
seekable, hand-written video lesson taught by a professor persona. The rebrand
was started elsewhere and left half-done: home page moved to a warm charcoal
look, everything else (watch page, overlays, favicon, metadata, README, AI
prompts) still on the old identity — and the professor has two names.

## Decisions

### Persona — one name
Product and professor are both **Ember** ("Professor Ember", "Taught by Ember").
`brand.ts` already says this; `prompts.ts`, `intro.ts`, `ChalkAvatar.tsx`,
`package.json`, README get updated to match, so generated videos speak as Ember.

### Visual direction — warm charcoal studio everywhere
Extend the home page's established palette to every surface. One accent. No
gradients on UI elements, no glow effects.

| Token | Hex | Use |
|---|---|---|
| Studio | `#111315` | page chrome, watch background |
| Board | `#171b1d` | panels, cards, composer |
| Warm White | `#f1eee7` | primary text |
| Slate | `#a4a5a7` | secondary text |
| Ember Amber | `#e6b784` | the only accent: CTAs, focus, active, links |
| Edge | `#34383c` | borders |

Type: Geist Sans (400–600, hero at 500, tracking −0.05em), Geist Mono
(eyebrows, timestamps, metadata), BoardHand (board content only).
Marker colors (`#ffd84d`, `#7fc9f4`, …) live only inside boards, never chrome.
All `orange-500→amber-500` gradient buttons → solid amber, dark text.
All cool darks (`#07090d`, `#0c0f14`, `#0c0f15`) → Studio/Board.

### Brand mark — "the stroke that raises a spark"
One marker stroke underlining the word, kicking up at the end, with one
detached dot — the spark it flicked off. Flat solid amber, no gradients, no
glow. Standalone glyph (stroke + dot) is the favicon/app icon. Must read at
16px.

### Background — layered atmosphere, not flat (revised after review)
All surface quality, never objects on top of content. User-rejected: floating
ghost-glyph text (looked like decoration over the hero — removed).
Chosen direction: cinematic light + physical material + slow life, register
"barely there", hero-focused. Base color #111315 never changes.
1. Material (static): multi-octave SVG turbulence film grain (warm speckles
   ≤4%), board dot-tooth at 2%, side vignette.
2. Cinematic light (static): wide structural pool centered on the hero, page
   fading to quiet below the fold.
3. Slow life: one warm lamp layer on a 26s breath, in `.ember-home::before`
   at `z-index:-1` — above the surface, beneath the content. Frozen under
   `prefers-reduced-motion`.
Watch page: same base light + material, quieter — the video is the star.

### Hero — ownable copy, living board
- Eyebrow (mono): the method.
- H1: **"Every problem, a lesson."** (the tagline is the product statement;
  "See the thinking. Understand the why." was generic and is retired)
- Subline: paste any problem → Ember plans it like a lecture, hand-writes the
  board, teaches it — a real, seekable video.
- The hero board **loops a mini-lesson** — continuously writing, wiping, next
  problem. Static frame under reduced motion.
- Proof strip under the composer: subjects (Calculus · Mechanics · ODEs ·
  Circuits · Thermo), the method line, positioning: **"Not an answer. A lesson."**

### Voice
Error title "The marker slipped" stays (on-voice). Copy stays plain-verb,
sentence case, same name for the same action throughout.

## Scope (piece order — user checks the running app after each piece)

1. Brand mark + favicon set + wordmark + layout metadata
2. Hero: copy + living looping board
3. Composer + proof strip
4. Lesson cards + saved library + footer
5. Background atmosphere (home)
6. Watch page retheme (palette, chapters, persona card, typography)
7. Overlays: GenerateOverlay, ResumeCard, error states
8. Persona unification (prompts.ts, intro.ts, ChalkAvatar, package.json) +
   README rewrite + OG image + asset cleanup

## Out of scope (flagged, later)
Shareable lesson URLs, accounts/library sync, accuracy-verification story.
