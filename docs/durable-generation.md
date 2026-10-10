# Durable lesson generation

The web API stores jobs and returns an opaque ID. Locally, a Bun worker claims jobs. On Vercel, signed Inngest requests execute bounded slices of the same concurrent engine. Polling reads the database, so refreshing or restarting the web process does not lose the lesson.

## Run locally

From the repository root, with DATABASE_URL configured in .env:

```powershell
npm run db:generate
npm run db:jobs:init
npx prisma db execute --file prisma/migrations/20261010_hosted_dispatch/migration.sql --schema prisma/schema.prisma
npm run dev
```

In a second terminal:

```powershell
npm run worker
```

The worker requires Bun. The existing Edge TTS fallback also requires `uv` and network access to its speech service. Gemini uses GEMINI_API_KEY. Web and worker must point at the same database. Apply the hosted-dispatch migration once to an existing SQLite database; rerunning its ALTER TABLE fails rather than resetting data. For a brand-new database, initialize the full Prisma schema with `npx prisma db push` without the data-loss flag instead of applying those two additive migrations.

On Windows, stop web and worker processes before regenerating Prisma or running a production build: an active process can lock Prisma's native engine DLL. Restart both afterward.

The canonical Prisma schema uses SQLite. `tooling/postgres-schema.mjs` generates matching hosted models and a separate Postgres client; `npm run db:generate` generates both clients. Run `node tooling/postgres-schema.mjs --check` to detect drift. Local SQLite files need persistent storage; Vercel rejects a missing or SQLite database URL.

## Vercel with Neon and Inngest

Use pooled `DATABASE_URL` for queries and direct `DATABASE_URL_UNPOOLED` for migrations. Include `connect_timeout=30` for cold starts and start with `connection_limit=2` on the pooled URL. Apply the committed Postgres migrations using `npm run db:deploy:postgres` with hosted environment variables injected. Migrations create Ember tables in `public` and preserve existing `neon_auth` resources. Test on an isolated branch first; do not use the destructive `db:push` package script.

The isolated branch credentials are stored in ignored `.env.neon`, separate from local `.env` files. Example migration command on Node 22+: `node --env-file=.env.neon node_modules/prisma/build/index.js migrate deploy --schema prisma/postgres/schema.prisma`.

The Vercel integration supplies `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` for production and previews. `/api/inngest` registers generation, generation-failure handling, and hourly dispatch recovery. Vercel defaults to Inngest; local development defaults to the Bun worker. To test with the local Inngest dev server, explicitly set `GENERATION_RUNNER=inngest` and `INNGEST_DEV=1`; never set dev mode on Vercel.

Submission persists a job before awaiting event acknowledgement. A failed dispatch returns HTTP 503 with the saved job ID; the browser preserves that ID while showing the failure. Hourly recovery retries up to 20 unacknowledged, non-terminal jobs with stable event IDs. Recovery may therefore take up to an hour after a failed initial delivery. Workflow event payloads contain only job IDs; checkpoints and recordings remain in the database.

Generation concurrency starts at one. Each engine slice is limited to 180 seconds, with checkpointing disabled on the generation workflow to prevent two long slices sharing one Vercel request. The endpoint allowance is 300 seconds. Ten slices bound total workflow work; normal handoffs refund the interruption attempt and resume saved stages, whereas genuine interruptions retain the three-execution failure budget. Failure handling waits for lease expiry before persisting a terminal error. Do not run the local worker against the hosted database concurrently.

Hosted submissions have an atomic global limit of 20 lessons per UTC day. This is an admission guard, not a guarantee of unlimited free storage or zero AI-provider bills. Free account quotas still apply. Audio remains in Postgres and needs an approved retention/storage strategy before sustained public use; there is no automatic deletion or paid upgrade.

Deployment protection must remain unchanged unless explicitly approved. Inngest needs an externally reachable signed endpoint; merely installing the integration does not prove reachability. Also verify speech synthesis in the actual hosted runtime: the existing Python/`uv` Edge fallback is not automatically supplied by a Node Vercel deployment. A local or recorded-provider test is not proof of successful hosted narration.

Current verified infrastructure: existing Neon project and Vercel project; isolated Neon branch created; Inngest integration keys present; Postgres migrations and cross-client job/audio checks passed on the isolated branch. No production migration or deployment has been performed.

## Recovery and concurrency

Jobs checkpoint the outline, transcript (including completed fallback decisions), each scene's board work, accepted reviews, solver result, verification repairs, merged script and successful audio references. Recovery reuses those checkpoints. Scene writers remain concurrent; narration is queued in playback order.

Workers lease jobs for 60 seconds and renew every 10 seconds. Claims and writes use conditional database updates. An expired worker's token cannot overwrite a replacement worker's progress. After a crash, another worker may claim the job after the lease expires. Three interrupted executions exhaust the automatic retry budget and produce a visible failure. SIGTERM/SIGINT stops new claims and lets the current job finish; forced termination relies on lease recovery.

One worker execution is capped at 15 minutes; a timed-out execution releases its claim and its later callbacks cannot checkpoint. Individual chat/TTS HTTP calls have a 60-second timeout. Use one worker initially: provider rate limiting is still local to each process, not coordinated across multiple workers.

External provider calls are at least once: a crash after a provider responds but before its result is saved can repeat that call. Saved stages and audio are reused. Immutable audio keys include the narration, requested voice, resolved Gemini voice, model and asset version. The first saved recording wins when callers race.

Audio bytes are stored in the database for this foundation, rather than relying on process cache or requiring an unconfigured object-storage account. This makes backup and restart behavior testable with the existing stack. Before substantial scale, move the audio repository to object storage and retain references in the database; large audio blobs will increase database size.

Generated scripts carry recording references. Playback GETs those recordings and never starts TTS. Pending recordings return 404 with a retry hint. Legacy/curated scripts retain the POST synthesis path, which now checks persistent recordings before generating. Narration edits discard old references through script sanitation; a changed narration cannot reuse an old reference. The existing player still has bounded waiting and may play a scene silently after giving up; improving that failure presentation is a follow-up.

A job becomes watchable only after its merged script and opening required audio exist. It becomes ready only when all required audio has been persisted. Storage failures do not count as successful recordings.

## Verification and retention

```powershell
bun test tests/durable-jobs.test.ts tests/worker-restart.test.ts tests/stored-audio.test.ts tests/job-reliability.test.ts
bun test tests/database-config.test.ts tests/hosted-runner.test.ts tests/job-dispatch.test.ts tests/inngest-endpoint.test.ts
```

The restart test uses recorded provider responses and real subprocesses/database files. It kills a worker after a confirmed scene/audio checkpoint, advances lease eligibility without a one-minute wall-clock delay, and starts a second process. It asserts the same ID completes and completed calls are not repeated. It does not assert live provider latency or pedagogical quality.

The hosted slice test lets a real subprocess yield normally, then resumes with another process. Completed director/planner/scene/audio work is not repeated and the interruption allowance is preserved. `tests/postgres-jobs.test.ts` is opt-in via `EMBER_POSTGRES_TEST_URL`; use only the isolated branch. It retains tiny diagnostic rows rather than deleting remote data.

There is no automatic deletion of job/audio records in this version. They survive the old 35-minute window. Back up the database and plan explicit retention before public production use. Authentication/authorization remains the separate security-hardening round; opaque IDs are not a substitute for ownership checks.
