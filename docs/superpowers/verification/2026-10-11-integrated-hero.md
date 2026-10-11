# Integrated hero verification

Implementation: e840c8bf2d4cc8cc471659d61e11e9d2c6ad1525. The film now belongs to the hero, directly after question entry/examples. Removed only the redundant gallery invitation; comparison and community remain below.

- Real-render RED caught the missing hero ancestor on original placement; focused GREEN: 6 pass, 0 fail, 52 assertions. Real page/AuthProvider, no component mocks or parser dependencies.
- Task and final whole-branch reviews approved with no actionable findings.
- Full serial `bun test` with FFMPEG_PATH: 172 pass, 1 skip, 0 fail; 105466 assertions, 173 tests in 41 files, 51.44s. Real Postgres integration needs its dedicated database.
- First full run hit an unchanged Inngest subprocess default 5-second startup timeout. Same focused test passed 2/2 in 2.79s; full unchanged rerun above passed with the same default timeout. No backend/test-fixture changes.
- Webpack production build exited0; 16 static pages generated. It explicitly skips global type validation, so this is not a repository-wide TypeScript claim. Changed TSX lint and diff check exited0.
- Actual local browser: hero contains video, film width1000px, gap32px, padding0, hero padding56px48px, no redundant invitation, video initially paused/noautoplay.
- At a confirmed390×844 DOM viewport: film width343px, gap24px, padding0, hero padding36px32px, textarea height120px, document has no horizontal overflow. Viewport reset to1280×720. Screenshot surface scaled the narrow view unexpectedly; narrow computed layout verified, fine-detail mobile visual inspection remains limited.
- Existing MP4 unchanged: SHA2567A5593C2FD1B8FADA06CA9AEA4C65FDDDADCAF0EE02998BDDC8D72876CF8AFDE. No media/engine/auth edits.

Rollout: codex/synchronized-teaching, ember-generation-test only after matching Ready build. No main merge. Submission platform/deadline and final external submission remain user-controlled; no new video requested or produced.
