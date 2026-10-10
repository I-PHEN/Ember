# Durable generation implementation plan

**Goal:** Preserve actual lesson progress and generated audio across process restarts, with one leased worker owning each job.

**Architecture:** Next.js submits and reads jobs; a separate Bun worker executes the existing concurrent engine. Prisma persists JSON checkpoints and content-addressed audio bytes. SQLite is the verified local adapter; it requires a persistent disk and is not a shared serverless database. Production hosting selection remains pending.

**Constraints:** Preserve the current parallel writers and early voicing. Preserve unrelated dirty files. Do not deploy or purchase services. Do not change auth or lesson pedagogy in this slice. No filesystem audio cache on ephemeral hosting. Do not falsely report production readiness.

## 1. Repository and leases

Files: `prisma/schema.prisma`, additive SQL in `prisma/migrations/20261010_durable_generation/migration.sql`, `src/lib/jobs/repository.ts`, `tests/durable-jobs.test.ts`.

- [x] Write failing real-SQLite tests for saving/loading checkpoints through a new client, competing claims, expired lease takeover, stale-writer rejection, bounded attempts, and saved audio retrieval.
- [x] Add VideoJobRecord fields: id, state JSON, status, lease token/deadline, execution attempts, next run time and timestamps. Add NarrationAsset with hash key, exact voice identity and audio bytes.
- [x] Use conditional database updates to claim/renew/save/release. Every checkpoint write must require the current token and an unexpired lease. Reject stale writes and never reuse a lost lease.
- [x] Enforce a maximum of three worker executions; an interrupted job becomes eligible after lease expiration. Persist a visible terminal error when the cap is exhausted.
- [x] Generate Prisma client and apply only additive SQL to the development database. Run repository tests.

## 2. Resume the existing engine

Files: `src/lib/video-jobs.ts`, `src/workers/video-worker.ts`, job route handlers, `package.json`, `tests/job-reliability.test.ts`, worker restart fixture under `tests/fixtures/`.

- [x] Replace global Map with asynchronous repository reads/writes. Use opaque random IDs rather than encoding prompts in URLs.
- [x] Persist director result, planner result (including an explicit completed-null result), writers by scene index, accepted reviews, solver result, verification repairs and merged script.
- [x] Skip each completed stage when resuming; only interrupted external calls may repeat. Keep writers concurrent and voice queue in playback order.
- [x] Persist successful audio before increasing completion counts. Recompute counters from completed checkpoint entries after recovery.
- [x] Save terminal errors and merged/ready milestones. Cancel checkpoint writes on lost leases. Keep API handlers free of detached generation promises.
- [x] Worker claims jobs, heartbeats every 10 seconds with a 60-second lease, runs one job at a time, and drains gracefully on SIGTERM. A second worker may take over only after lease expiry.
- [x] Prove recovery with recorded provider responses: terminate a real worker subprocess after an acknowledged checkpoint, start a new worker and assert director/planner/completed scene/audio work is not repeated.

## 3. Stored playback audio

Files: `src/lib/jobs/audio-assets.ts`, `src/lib/narration-store.ts`, `src/app/api/narrate/route.ts`, `src/app/api/narrate/[key]/route.ts`, generation pipeline.

- [x] Derive audio keys from an explicit version, normalized voice and exact narration. Store only actual generated audio, rejecting empty buffers.
- [x] Let POST narration return existing stored audio before generating. GET by key only serves existing assets and never invokes TTS. Validate keys before querying.
- [x] Add optional audio references to script scenes. Preserve references only when their narration matches; an edited narration must not retain another recording.
- [x] Player's narration store consumes stored references without regeneration; scenes with pending generated audio poll the read-only endpoint with existing bounded patience. Curated/legacy scripts may use the original POST path.
- [x] Verify saved audio is byte-identical after client/process restart and missing audio never regenerates through GET.

## 4. Verification and operating instructions

- [x] Run targeted tests and full Bun suite; lint changed files and full repository; TypeScript check and production build. Report pre-existing failures precisely.
- [x] Document database initialization, starting web + worker, lease recovery, retention and production hosting limitations in `docs/durable-generation.md` and `.env.example`.
- [x] Review diff for dropped pipeline stages, incorrect counter resets, late writes and accidental changes to user files. Commit only scoped changes.

Acceptance: a real worker process can be stopped after a scene checkpoint and another process completes the same ID using stored stages/audio; competing leases cannot overwrite it; Next.js polling always reads persistent state; ready means all required recorded audio is persisted. Production deployment is a separate operation once shared infrastructure is configured.

## Execution results

Implementation and verification for sections 1–4 are complete. Audio identity is encoded in its content-addressed key rather than separate voice columns. Only task-scoped files are included in the implementation commit.

- Full suite: 117 passing tests, zero failures (25 files, 470 assertions).
- Final restart/audio regression rerun: 9 passing tests, zero failures.
- Production build and lint passed. TypeScript still reports the eight existing errors in eval scripts, gallery, Studio history typing and rendering; none originate in these changes.
- Real provider smoke test persisted six scenes and four recordings. Opening narration failed after provider timeout/fallback dependency failure; the job persisted an error and did not expose a watchable script. This is not a successful live narration demonstration.
- Production shared infrastructure and hosting selection remain pending; no deployment was performed.
