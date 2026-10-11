# Fresh launch film verification

Reviewed implementation: `03b4b7d..d6c0dd8`.

## Deliverables

- Fresh 52-second 1920×1080, 30fps H.264 limited-range BT.709 MP4, AAC-LC stereo, fast-start. Complete decode: 1,560 frames.
- Web file and local `C:/Users/Michael/Downloads/Ember-launch-52s.mp4` match: 3,521,748 bytes; SHA256 `7A5593C2FD1B8FADA06CA9AEA4C65FDDDADCAF0EE02998BDDC8D72876CF8AFDE`.
- Enlarged hero composer, static native video replacing the scroll walkthrough, substantive integration-by-parts comparison, and narrow community hydration repair.
- Original restrained synthesized score; prepared product demonstrations disclosed. No rejected draft or reference-video assets reused. No lesson-engine/backend changes.

## Checks

- `bun test` with `FFMPEG_PATH` configured: 171 pass, 1 skip, 0 fail; 105449 assertions, 172 tests in 40 files, 40.43s. Real Postgres integration skipped without its dedicated test database.
- Initial full run encountered Windows SQLite cleanup EBUSY and a timed worker fixture failure. Stopped only task-owned development server to remove concurrent compilation load. Focused hosted-runner/worker-restart rerun: 8 pass, 0 fail. Full serial rerun above passed on unchanged code.
- `node node_modules/next/dist/bin/next build --webpack`: exit 0; 16 static pages. Project configuration skips type validation; not a full-repository TypeScript claim. Film-scoped TypeScript previously passed.
- Changed-file ESLint and `git diff --check`: exit 0.
- Browser desktop: composer 780px wide, 140px minimum writing height, 16px font, 24px padding, four rows. Native playback decoded 52s/1080p and advanced; keyboard seek and actual MP4/transcript downloads worked. Download hash matched.
- Actual missing-file simulation showed fallback with download/transcript retained; generated asset restored and hash verified immediately.
- Fresh reload after hydration repair produced no new hydration error; community motion and studio control remained available.
- Controller visually inspected 22 scene/transition stills; corrected transition overlaps and gallery clipping before delivery.

## Limitations

Audio was not auditioned. PCM/AAC peak measurements confirm no clipping, not subjective listening quality. Mobile viewport override remained desktop despite attempts; responsive styles reviewed but mobile visual behavior is not verified.

## Rollout boundary

Independent final whole-feature review: no Critical, Important, or Minor actionable findings; ready for the authorized test-site rollout. Reviewer also independently confirmed current MP4 metadata and matching local/web hash. Mobile visual QA and audio audition remain disclosed limitations.

Normal fast-forward to existing `codex/synchronized-teaching`, then only `ember-generation-test` after a matching Ready build. No main merge, no main Ember project deployment. Deployment status is confirmed separately at rollout time.
