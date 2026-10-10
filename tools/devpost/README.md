# Ember submission film

This composition reuses production Studio UI components and the actual board renderer. It is a **prepared walkthrough**, not a live screen recording. The generation sequence is condensed. Narration and visible disclosures distinguish current capabilities from roadmap items.

Review `script.json` before generating paid narration. Do not include API keys in commands or committed files. Run from the isolated repository checkout:

```powershell
node tools/devpost/render.mjs --preview
bun --env-file=C:/Users/Michael/Ember/.env tools/devpost/prepare.ts --approved-script
node tools/devpost/render.mjs --output=C:/Users/Michael/Downloads/Ember-Devpost-Demo.mp4
```

Install renderer dependencies with `bun install` inside `tools/devpost` first. A production `.next/static/css` build is required. Output narration, manifests, previews, and caption files stay in ignored `scratch/devpost`. Narration caches are keyed by script and voice, so retries do not regenerate unchanged audio. Existing MP4 outputs are never overwritten.

In a worktree with a shared `node_modules` junction, use `node node_modules/next/dist/bin/next build --webpack`; Turbopack rejects dependencies outside its filesystem root. Do not replace or delete the shared dependency directory to work around that restriction.

Preview frames must be visually reviewed. Final captions are approximate word-count timings, not forced alignment, and need human review against the audio. Listen to the final narration and verify the MP4 before submitting. No music, third-party lecture footage, inflated benchmarks, or production-auth claims are included.

## Visual revision

Version two retains the original narration and uses a six-line, reviewed integration-by-parts derivation through the real compiler and stroke renderer. `VisualScenes.tsx` composes the actual player, wordmark and tabs into closer presentation framing. Cursor interactions and the gallery shell are prepared illustrations, not recordings of live clicks. The architecture shows parallel scene writers, a solver rail, and a voice queue; allocation names and moving packets are illustrative.

The captured gallery script currently has timing warnings and malformed writing. Its title and search result remain real catalogue data, while the following board scene is explicitly labelled a reviewed excerpt of that question, not live replay. No production warning is suppressed or gallery data modified by the film tools.

For additional interaction QA frames using cached narration, run `node tools/devpost/render.mjs --stills-only`. Export the revision to a separate filename such as `C:/Users/Michael/Downloads/Ember-Devpost-Demo-v2.mp4`. The original MP4 is preserved.

Version three removes accelerated stroke playback. `writingClock` selects a step at an edit boundary, advances its ink at 0.95× authored speed, then holds that completed step. Opening, assignment and final-answer excerpts cover different parts of the derivation; gallery/closing views show a completed snapshot. Rewind remains a clearly illustrated seek, not forward writing. Warm charcoal (#272722), copper atmosphere (#b8793c), amber (#e6b784), warm brown (#3a2e25), and raised green-charcoal panels (#29302d) separate the presentation from the dark production board. Narration and duration remain unchanged.

Version four replaces the presentation shells with the actual studio and gallery route components, filling the 1920×1080 composition without scaling, padding, borders, or outer titles. Their production backgrounds, responsive layout, player controls and Office Hours are unchanged. An isolated context supplies prepared state; a read-only auth provider, disabled job hook, and presentation guards prevent session restoration, gallery fetches, resume/generation, history writes and fresh narration. It is a rendered offline walkthrough, not a recording of live interactions. The architecture is the sole full-screen explanatory cutaway. Narration and natural ink speed remain unchanged.

Version five renders a native 1440×810 desktop viewport, then exports edge-to-edge 1920×1080 with Lanczos scaling. This enlarges the real UI without changing its layout. Actual whiteboard and paper themes and the actual theme picker appear through frame-controlled presentation props. Architecture narration alternates diagram views and real app scenes; the final scene explicitly labels the library/API/live tutoring direction as planned. Only the approved closing text requires new voice synthesis.

Run `node tools/devpost/music.mjs` after preparation to create an original, sample-free stereo instrumental score. Its gain ducks against the measured RMS of the narration, with gentle opening/ending fades. Narration is mixed at 0.82 for headroom. The music has no third-party recordings or compositions; it is a deterministic procedural score, not a licensed stock track. Re-listen to the complete mix before submission. Use `--stills-only` for the final prepared manifest; `--preview` uses estimated timings. Regenerate the score if narration duration changes.
