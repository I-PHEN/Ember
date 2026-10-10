# Ember Devpost demo — factual script

Target: 2–4 minutes, 1920×1080 H.264 MP4 with voice and captions.

The narrated copy is in `tools/devpost/script.json`. All product sequences must be labelled prepared walkthroughs using production components. Do not describe them as live recordings or measure generation speed from them. Office Hours dialogue is prepared and labelled; no fake live response. Architecture labels match `src/lib/video-jobs.ts`, `src/lib/prompts.ts`, the compiler and timing modules. Reviewer/layout/numeric gates exist, but solver verification can remain unresolved; never claim proof of correctness.

Known limitations appear in the narration: alignment quality varies; gallery saves scripts but not durable audio; current authentication is demo-only. No learning-gain, production-readiness, or largest-library claims.

Visual direction: studio charcoal #0b0d10, surfaces #12151b, chalk #f4f4f6, secondary #9aa1af, Ember amber #e6b784. Native studio typography and board rendering; readable architecture nodes; gentle camera moves; captions separate from equation space. No stock imagery or fake application chrome.

The old public/demo-assets screenshots are not used: they predate the latest UI and include an empty board/loading state.

## Export verification — 2026-10-09

User approved the current script and configured voice API. Generated eight Gemini Aoede narration segments and exported `C:/Users/Michael/Downloads/Ember-Devpost-Demo.mp4`; separate captions are in `C:/Users/Michael/Downloads/Ember-Devpost-Captions.srt`. Media and narration caches remain outside Git.

Verified with ffprobe: 186.901 seconds, 1920×1080, 30 fps, H.264 video, 48 kHz stereo AAC audio, 12,973,215 bytes. Full-file FFmpeg decoding succeeded without reported errors. Reviewed composition stills and an extracted final-export frame. The renderer recovered from one browser crash during export.

These checks establish file integrity, not a complete human listening review. Caption timing is word-count-based and approximate. Watch the complete MP4 and review narration/captions before submission. The prepared walkthrough and prototype limitations remain explicitly disclosed.

## Visual revision export

Exported `C:/Users/Michael/Downloads/Ember-Devpost-Demo-v2.mp4` with the original cached narration unchanged. Closer player framing, a complete reviewed worked example, prepared cursor pause/rewind/follow-up, parallel writer visualization and gallery search replace the earlier sparse scenes. Frontend-design guided the restrained warm-charcoal palette and product-led framing. The gallery preview is explicitly a reviewed excerpt, not live replay of the captured script; that script has existing timing/writing defects which were not modified or hidden in production.

Verified v2: 186.901 seconds, 1920×1080 at 30 fps, H.264 + stereo 48 kHz AAC, 14,418,189 bytes. Full-file decoding succeeded with no reported errors; reviewed interaction stills and a frame extracted from the final MP4. TypeScript and scoped lint passed; both new visual tests passed, including deterministic board layout auditing. Original video remains intact. Human review of the full movie and approximate caption timing is still recommended before submission.

## Pacing and colour revision

Exported `C:/Users/Michael/Downloads/Ember-Devpost-Demo-v3.mp4`. Replaced accelerated whole-board montage clocks with selected excerpts at 0.95× authored ink speed, followed by completed-step holds. The gallery and closing use completed snapshots. Only the explicitly demonstrated rewind seeks quickly. Frontend-design guided a warmer charcoal, copper glow, amber borders and raised panels; the production blackboard remains dark for readability. Narration is unchanged and earlier exports remain intact.

Verified v3: 186.901 seconds, 1920×1080 at 30 fps, H.264 + AAC, 14,636,296 bytes. Full-file decoding passed without reported errors. Reviewed updated composition stills and an extracted final-export frame. TypeScript, scoped lint and all three visual tests passed, including a per-frame bound on writing-clock speed. Caption timings remain approximate and require human review.

## Full-screen interface revision — 2026-10-10

Version four mounts the actual studio and gallery pages, edge-to-edge at 1920×1080. Removed the external presentation shell, headers and scaled mock layouts. Production layout, textured background, typography, player transport and Office Hours are reused unchanged; frontend-design guided product-first framing rather than a new interface design. The architecture remains a full-screen illustrative cutaway. Original narration and natural-paced ink are unchanged.

An offline presentation context supplies prepared state. Read-only auth, disabled generation/resume, guarded storage and gallery effects, and the existing presentation clock isolate filming from live account data and paid narration. Prepared generation, dialogue and reviewed gallery excerpts remain disclosed. The normal app has no presentation provider and retains its live behavior.

Reviewed composition frames covering writing, pause/seek, current-step timestamps, Office Hours typing, gallery search and architecture. All 224 tests passed; the five film tests passed again after the final typography adjustment. Scoped lint and the production Webpack build passed. Default Turbopack cannot build this worktree's external dependency junction, so verification used `next build --webpack` without modifying shared dependencies.

Final deliverable: `C:/Users/Michael/Downloads/Ember-Devpost-Demo-v4-fullscreen.mp4`. Verified 186.901 seconds, 1920×1080 at 30 fps, H.264 + AAC, 11,669,805 bytes. Full-file decoding succeeded without reported errors; reviewed a frame extracted from the final MP4. Earlier exports, including the intermediate v4 typography draft, remain intact. No new narration calls were made. These are file-integrity and frame checks, not a complete human listening review; review the full film and approximate caption timing before submission.

## Readability, themes, music and vision revision

Version five uses the real app at a 1440×810 native desktop viewport, exported to 1920×1080 without a presentation frame. This enlarges the interface proportionally. Blackboard opens the film; the actual whiteboard is used for most explanations, and the actual theme picker selects paper in the controls scene. Architecture narration intercuts real app scenes with the illustrative diagram instead of holding only on that diagram. Frontend-design guided the production-theme contrast, restrained motion and paper-toned future closing.

The user-approved future closing replaces only the last narration segment. All seven preceding segments reuse their cached audio. API/platform integration and live tutoring remain explicitly planned, not claimed as current capabilities or partnerships. The gallery is an earlier captured catalogue snapshot because the live endpoint was unavailable during preparation; no catalogue entries or metrics are invented.

`music.mjs` creates an original sample-free, gentle stereo instrumental score. Its volume ducks using the actual narration RMS, with opening/ending fades. The generated score peaks at 0.113 full scale with overall RMS 0.0189; narration gain is 0.82 to leave mix headroom. No third-party music or new music API calls are used. Source tests, scoped lint, TypeScript and the production Webpack build pass; all 226 tests pass.

Final export: `C:/Users/Michael/Downloads/Ember-Devpost-Demo-v5-music.mp4`, with updated captions in `C:/Users/Michael/Downloads/Ember-Devpost-Captions-v5.srt`. Verified 185.472 seconds, 1920×1080, 30 fps, H.264 + AAC, 14,029,467 bytes. Full-file audio/video decoding passed. Decoded PCM analysis found a peak of −3.13 dBFS, RMS 0.0676 and zero clipped samples. The bundled FFmpeg lacks `volumedetect` and raw PCM muxing, so analysis used a decoded PCM WAV instead. Reviewed native preview frames plus whiteboard and final-closing frames extracted from the finished 1080p MP4. Earlier exports remain intact. Full human listening review and approximate caption timing review are still recommended before submission.
