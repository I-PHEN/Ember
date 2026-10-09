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
