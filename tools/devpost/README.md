# Ember submission film

This composition reuses production Studio UI components and the actual board renderer. It is a **prepared walkthrough**, not a live screen recording. The generation sequence is condensed. Narration and visible disclosures distinguish current capabilities from roadmap items.

Review `script.json` before generating paid narration. Do not include API keys in commands or committed files. Run from the isolated repository checkout:

```powershell
node tools/devpost/render.mjs --preview
bun --env-file=C:/Users/Michael/Ember/.env tools/devpost/prepare.ts --approved-script
node tools/devpost/render.mjs --output=C:/Users/Michael/Downloads/Ember-Devpost-Demo.mp4
```

Install renderer dependencies with `bun install` inside `tools/devpost` first. A production `.next/static/css` build is required. Output narration, manifests, previews, and caption files stay in ignored `scratch/devpost`. Narration caches are keyed by script and voice, so retries do not regenerate unchanged audio. Existing MP4 outputs are never overwritten.

Preview frames must be visually reviewed. Final captions are approximate word-count timings, not forced alignment, and need human review against the audio. Listen to the final narration and verify the MP4 before submitting. No music, third-party lecture footage, inflated benchmarks, or production-auth claims are included.

## Visual revision

Version two retains the original narration and uses a six-line, reviewed integration-by-parts derivation through the real compiler and stroke renderer. `VisualScenes.tsx` composes the actual player, wordmark and tabs into closer presentation framing. Cursor interactions and the gallery shell are prepared illustrations, not recordings of live clicks. The architecture shows parallel scene writers, a solver rail, and a voice queue; allocation names and moving packets are illustrative.

The captured gallery script currently has timing warnings and malformed writing. Its title and search result remain real catalogue data, while the following board scene is explicitly labelled a reviewed excerpt of that question, not live replay. No production warning is suppressed or gallery data modified by the film tools.

For additional interaction QA frames using cached narration, run `node tools/devpost/render.mjs --stills-only`. Export the revision to a separate filename such as `C:/Users/Michael/Downloads/Ember-Devpost-Demo-v2.mp4`. The original MP4 is preserved.
