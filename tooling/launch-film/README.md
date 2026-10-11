# Fresh Ember film

Original 52-second, 1920×1080, 30fps film. All composition and music were created here from scratch. No rejected launch source, music, or shot compositions are used. The Wabi reference informed sparse sentence-scale typography, readable product crops, and continuous transitions only; it contributes no media assets.

From the repository root in PowerShell:

```powershell
$env:CHROMIUM_PATH = 'C:/path/to/chrome.exe'
$env:FFMPEG_PATH = 'C:/path/to/ffmpeg.exe'
bun tooling/launch-film/render.ts --stills
# Review tool-results/launch-film/frame-*.jpg before full export.
$env:FILM_LOCAL_COPY = 'C:/path/to/a/new/Ember-launch-52s.mp4'
bun tooling/launch-film/render.ts
bun test tests/launch-film.test.ts
bunx eslint tooling/launch-film/*.ts tests/launch-film.test.ts
bunx tsc -p tooling/launch-film/tsconfig.json
```

`FILM_LOCAL_COPY` is optional and must name a new file: exclusive copying refuses overwrite. `FFMPEG_PATH` defaults to `ffmpeg` on PATH; Chromium must be explicit. Fonts are loaded from existing Next Geist/Geist Mono assets and `public/fonts/board-hand.woff2`; missing assets fail. The owned offscreen canvas has no network or arbitrary filesystem route. The exporter uses Bun and existing puppeteer-core, validates decoding, codec, dimensions, audio, and duration, and records diagnostics and PCM peak in `tool-results/launch-film/verification.txt`.

The film uses the existing `compileTimeline` and `renderFrame` interfaces without changing lesson-engine code. Composer, chapter and Office Hours UI are prepared, enlarged representations of existing controls. Subject names come from `src/app/gallery/page.tsx`; Integration by Parts comes from `src/lib/samples.ts`. No generated response or generation-speed claim is made. The original score is deterministic stereo PCM synthesis, encoded as AAC, without external samples or voice.

Output: `public/media/ember-launch.mp4`, poster JPEG, WebVTT, and plain-text transcript. Art direction: charcoal `#111315`, chalk `#f1eee7`, amber `#e6b784`; Geist display/body, Geist Mono utility, genuine production strokes for mathematics. The signature is the Ember swash and a single equation carried from question through revisiting and follow-up.
