# Durable lesson generation

The web API stores jobs and returns an opaque ID. A separate worker claims jobs, runs the existing concurrent scene pipeline and saves checkpoints. Polling reads the database, so refreshing or restarting the web process does not lose the lesson.

## Run locally

From the repository root, with DATABASE_URL configured in .env:

```powershell
npm run db:generate
npm run db:jobs:init
npm run dev
```

In a second terminal:

```powershell
npm run worker
```

The worker requires Bun. The existing Edge TTS fallback also requires `uv` and network access to its speech service. Gemini uses GEMINI_API_KEY. Web and worker must point at the same database. Run initialization before starting either process; it only adds job/audio tables and does not reset existing account/gallery data. For a brand-new database, initialize the full Prisma schema with `prisma db push` without the data-loss flag before starting the app.

On Windows, stop web and worker processes before regenerating Prisma or running a production build: an active process can lock Prisma's native engine DLL. Restart both afterward.

The existing Prisma schema uses SQLite. Keep the database file on persistent storage. Local SQLite and a worker are the verified deployment in this change. A Vercel filesystem is not shared persistent storage: deploying these files alone there does not make generation durable. Vercel requires a shared hosted database (and corresponding Prisma provider/migration) plus a separately hosted long-running worker, or a managed execution service. No external infrastructure has been purchased, provisioned or deployed.

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
```

The restart test uses recorded provider responses and real subprocesses/database files. It kills a worker after a confirmed scene/audio checkpoint, advances lease eligibility without a one-minute wall-clock delay, and starts a second process. It asserts the same ID completes and completed calls are not repeated. It does not assert live provider latency or pedagogical quality.

There is no automatic deletion of job/audio records in this version. They survive the old 35-minute window. Back up the database and plan explicit retention before public production use. Authentication/authorization remains the separate security-hardening round; opaque IDs are not a substitute for ownership checks.
