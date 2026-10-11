# Task 1 — fresh Ember film

## Scope and provenance

Created fresh source under `tooling/launch-film`; never read or reused the rejected `C:/Users/Michael/Ember/launch` source, soundtrack, shots, or composition. Production lesson engine remains untouched. Inspected the supplied Wabi contact sheet, opening sequence sheet, and product-motion sheet. Applied frontend-design to typography, negative space, the amber swash, and sustained readable product crops. Used TDD for clock/math/audio behavior.

## RED / GREEN

First command: `bun test tests/launch-film.test.ts`.

RED: exit 1, 0 pass / 1 fail / 1 error; missing `../tooling/launch-film/story`, the implementation that did not yet exist. The brief explicitly required this initial missing-module failure.

GREEN after implementation: 3 pass / 0 fail, 105012 assertions. Tests cover nonfinite and negative times, new-scene boundary selection, closing-frame clamp, scene-local bounds, the actual three-line equation script without title beats, finite/nonempty real compiled strokes, and bounded nonzero original score with endpoint fades.

Latest focused tests: 3 pass / 0 fail. Changed-source ESLint: exit 0. Scoped TypeScript check (`bunx tsc -p tooling/launch-film/tsconfig.json`): exit 0. Initial ad hoc TypeScript invocations failed due to a nonexistent `bun` type package and then absent app alias configuration; the scoped config extends the real repository configuration and resolves both. This is not a claim of a full repository TypeScript pass.

## Rendering / visual QA

Offscreen owned canvas uses the real `compileTimeline` and `renderFrame` interfaces. Explicit embedded font allowlist; all fonts must load. No local HTTP filesystem router; network requests are blocked. Frame generation uses deterministic time and an isolated headless Chromium instance, not the user's browser.

First rendering exposed Bun's unsupported `globalName` option; fixed with a small explicit client entry point. Stills subsequently rendered successfully. Source lint and scoped types pass.

22 QA stills are in `tool-results/launch-film`, at 1.8, 3.7, 4.5, 6.5, 7.7, 9, 11.8, 13.6, 15.8, 19.5, 23.5, 27, 28.5, 30.7, 34, 35.5, 38, 41, 43.5, 46, 48.5, and 51 seconds. Inspected composer, board, chapter rewind, Office Hours, gallery, close, and transition stills. Corrected overlapping wordmark/composer by moving the wordmark into a small header, and removed stacked transition labels. Poster includes the solved board plus Ember identity.

Controller reviewed stills and accepted hook, brand, composer, board, revisit, Office Hours, payoff and transition fixes. Requested a stronger Gallery crop. Replaced the moving subject strip with six fully visible subjects plus the genuine compiled built-in Calculus sample thumbnail, title, and watch control. Re-rendered and self-inspected frame-46.0.jpg. Controller accepted the revised gallery and authorized full export.

## Final export

Export completed with exit 0. Full FFmpeg decode completed with exit 0 and all 1,560 frames. Container: ISO MP4 (`isomiso2avc1mp41`). Video: H.264 High (`avc1`), 1920×1080, progressive, 30 fps, full-range 4:2:0 (`yuvj420p` reported), 325 kb/s. Duration: exactly 52.00 seconds. Audio: AAC-LC, 48,000 Hz, stereo, 165 kb/s. Total bitrate: 499 kb/s.

Fast-start was independently verified by MP4 atom inspection: `ftyp` at byte 0, `moov` at byte 32, `mdat` at byte 58,812. Full-decoding diagnostics are in `tool-results/launch-film/verification.txt`.

Original PCM peak: 0.1463920352, −16.68965 dBFS. Encoded AAC independently measured by FFmpeg volumedetect: peak −16.8 dBFS, mean −29.5 dBFS. No clipping. No claim of listening/audition.

Assets:

- `public/media/ember-launch.mp4`: 3,249,645 bytes.
- `public/media/ember-launch-poster.jpg`: 162,571 bytes.
- `public/media/ember-launch.vtt`: 911 bytes.
- `public/media/ember-launch-transcript.txt`: 1,199 bytes.
- Local export: `C:/Users/Michael/Downloads/Ember-launch-52s.mp4`. Confirmed absent before export, created with exclusive-copy flag; no existing local export overwritten.

The controller is handling embedded-browser verification, broader landing regressions, build, and deployment. These are outside this scoped film implementation and are not claimed by this report.

## Honest limitations

The film has an original deterministic synthesized instrumental score and no speech. Audio audition is unavailable on the current agent surface; mathematical peak checks do not substitute for listening. On-screen product UI is an enlarged prepared representation, disclosed in film/transcript. The Gallery shot uses verified subject names and the built-in Calculus example, without fabricated community metrics or inventory. The opening carries an amber swash rather than the equation-x visual; the controller explicitly accepted swash continuity as sufficient.

## Compatibility correction and review validation — 2026-10-11

This section supersedes the original export's full-range format and size above. Corrected `render.ts` to convert full-range JPEG/BT.601 samples to limited-range BT.709, remove the inherited JPEG ICC profile, and set frame color parameters plus encoder tags explicitly. Merely requesting `-pix_fmt yuv420p` was insufficient. New `verification.ts` parses MP4 atom sizes, brands, and fast-start ordering independently of decoder text, then requires H.264, limited-range yuv420p BT.709, 1920×1080, 30 fps, exactly 52.00 seconds, and AAC. Validation rejects a non-MP4 buffer, QuickTime-only container, wrong range, wrong frame rate, approximate duration, wrong video codec, and wrong audio codec.

No scenes or canvas frames were re-rendered. The current generated film was transcoded into a distinct temporary MP4, verified, then copied over only the two task-owned generated exports. Both originals matched SHA256 `215371015A56A10905E25820A382AC472341289BF8801AC22933160C616AA875` before replacement. A recoverable original copy remains at `tool-results/launch-film/ember-launch-full-range-backup.mp4`; original checkout and uploaded `download.mp4` were untouched.

Exact commands (PowerShell, from this worktree):

```powershell
$env:FFMPEG_PATH='C:/Users/Michael/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
bun test tests/launch-film.test.ts
```

RED before correction: 3 pass / 1 fail; the real exported artifact decoded as `yuvj420p(pc, bt470bg/unknown/unknown)` and failed the limited-range compatibility assertion. Validator tests were added before its new module: initial RED was a missing-module failure (0 pass / 1 fail / 1 error), as in the initial task's TDD sequence. Final GREEN with FFmpeg enabled: 5 pass / 0 fail, 105023 assertions. Artifact decode test is explicitly skipped when `FFMPEG_PATH` is absent; it was enabled for this verification.

```powershell
$filmFfmpeg=$env:FFMPEG_PATH
& $filmFfmpeg -n -hide_banner -loglevel warning -i public/media/ember-launch.mp4 -map 0:v:0 -map 0:a:0 -vf 'sidedata=mode=delete:type=ICC_PROFILE,scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709:flags=accurate_rnd+full_chroma_int,format=yuv420p,setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709' -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:a copy -movflags +faststart tool-results/launch-film/ember-launch-limited-final.mp4
```

Exit 0. A preliminary distinct temporary transcode used scale/format without frame `setparams` and ICC removal; it still reported unknown primaries/transfer. It was not delivered. The final command above resolves all tags. FFmpeg warned that the source full-range pixel format is deprecated; the conversion explicitly specifies source and target ranges.

```powershell
bun -e 'import { verifyFilmExport } from "./tooling/launch-film/verification"; import {readFile} from "node:fs/promises"; const path="tool-results/launch-film/ember-launch-limited-final.mp4"; const p=Bun.spawn([process.env.FFMPEG_PATH,"-hide_banner","-i",path,"-f","null","-"],{stdout:"ignore",stderr:"pipe"}); const metadata=await new Response(p.stderr).text(); const exit=await p.exited; console.log(metadata); if(exit!==0) process.exit(1); verifyFilmExport(metadata, await readFile(path)); console.log("Structured MP4 and stream validation passed");'
bunx eslint tooling/launch-film/render.ts tooling/launch-film/verification.ts tests/launch-film.test.ts
bunx tsc -p tooling/launch-film/tsconfig.json
```

All exited 0. Full decode: 1,560 frames, 52.00 seconds. Structured MP4 and stream validation passed. Metadata: ISO MP4, H.264 High `avc1`, `yuv420p(tv, bt709, progressive)`, 1920×1080, 30 fps; AAC-LC, 48kHz stereo, 165kb/s. No inherited ICC side data. Total bitrate 541kb/s.

Exact color-level check:

```powershell
bun -e 'const ffmpeg = process.env.FFMPEG_PATH; for (const path of ["tool-results/launch-film/frame-01.8.jpg", "tool-results/launch-film/ember-launch-limited-final.mp4"]) { const args = [ffmpeg,"-hide_banner","-loglevel","error", ...(path.endsWith("mp4") ? ["-ss","1.8"] : []), "-i",path,"-vf","crop=2:2:0:0,format=rgb24","-frames:v","1","-an","-f","rawvideo","pipe:1"]; const p=Bun.spawn(args,{stdout:"pipe",stderr:"pipe"}); const bytes = new Uint8Array(await new Response(p.stdout).arrayBuffer()); const error=await new Response(p.stderr).text(); const exit=await p.exited; console.log(JSON.stringify({path,exit,rgb:Array.from(bytes.slice(0,3)),error})); if(exit!==0) process.exit(1); }'
```

Both decodes exited 0. Source still charcoal corner RGB `[17,18,20]`; final MP4 `[16,17,20]`. This is small lossy/chroma quantization, without the prior full-range ambiguity. No claim of a fresh browser playback inspection or audio audition by this correction agent.

```powershell
& $filmFfmpeg -hide_banner -loglevel error -i tool-results/launch-film/ember-launch-full-range-backup.mp4 -map 0:a:0 -c:a copy -f hash -hash sha256 -
& $filmFfmpeg -hide_banner -loglevel error -i public/media/ember-launch.mp4 -map 0:a:0 -c:a copy -f hash -hash sha256 -
& $filmFfmpeg -hide_banner -loglevel info -ss 1.8 -i public/media/ember-launch.mp4 -vf 'crop=100:100:0:0,signalstats,metadata=print' -frames:v 1 -an -f null -
```

All exited 0. Audio stream hashes are identical: `0b5ed08a9172136420b66ce5acc7d979ed153690a4fb66d5e9780f9571003c59`, confirming AAC packets are unchanged. Final charcoal crop: Y min/mean/max 32, U 129, V 127, correctly represented above limited-range black (Y=16).

Delivered `public/media/ember-launch.mp4` and `C:/Users/Michael/Downloads/Ember-launch-52s.mp4`: 3,521,748 bytes each; both SHA256 `7A5593C2FD1B8FADA06CA9AEA4C65FDDDADCAF0EE02998BDDC8D72876CF8AFDE`. All other static assets remain the approved original exports.
