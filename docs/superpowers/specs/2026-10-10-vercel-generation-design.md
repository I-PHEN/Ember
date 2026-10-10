# Ember: Neon and Inngest on Vercel

## Scope and verified starting point

Make the existing lesson pipeline work on the existing Vercel deployment. No new UI features, Supabase, paid upgrades, new authentication provider, or Neon Hello function. Keep local SQLite and the local Bun worker usable. Preserve all unrelated working-tree changes.

Neon project: `young-butterfly-44212193`. Production branch: `br-restless-lake-b5fwt9fv`. Isolated test branch: `br-lively-feather-b5ui35zz` (`dev-vercel-generation`). The test compute is capped at 0.25 CU; account-managed idle suspension is unchanged. Existing Neon Auth resources must not be replaced or removed.

Vercel project: `prj_2rMWiU8M4TXW1GefafyD4HvlNdM5` (`ember`). Inngest's integration and production/preview event and signing key metadata were verified. This is an account connection, not a working deployed workflow.

## Options and recommendation

1. **Neon plus bounded Inngest execution:** reuse the existing application, checkpoints, and audio repository. Requires targeted runner changes, but avoids an always-on worker. Recommended.
2. **Move the entire worker to a persistent host:** simpler runner deployment, but introduces another hosting account and an unverified free-tier dependency. Not selected.
3. **Run the complete engine in one Vercel request:** rejected because the existing 15-minute execution allowance exceeds the configured 300-second handler allowance.

## Database boundary

Keep the canonical SQLite schema and client for local use and tests. Generate a matching Postgres schema/client for hosted execution; prevent model drift through a schema-generation consistency check. Select the client from the database URL. On Vercel, a missing or SQLite URL must fail closed instead of attempting to create an ephemeral local database.

Use pooled connections for application queries and a direct connection for Prisma migrations. Commit a separate Postgres migration history that creates Ember's tables without touching `neon_auth`. Test migrations and repository operations on the isolated branch before production. Do not run the existing destructive `db:push` script. Preserve existing local environment files and never print credentials.

Production and previews use separate database branches. Do not assume that adding environment variables updates a running deployment; verify the subsequent deployment.

## Execution boundary

Serve signed Inngest requests at `/api/inngest`. Persist each new job before dispatching an event carrying its opaque ID, not its prompt or full state. Claim that exact ID with the existing fenced lease; a workflow must never claim an unrelated lesson.

Run the existing concurrent engine in resumable slices with a maximum of 180 seconds of engine work per slice, leaving headroom inside a 300-second route. Keep parallel scene writing and early ordered narration. Each slice reloads existing checkpoints and skips completed work. Inngest step outputs contain only compact job outcome metadata, never audio bytes.

Distinguish normal slice exhaustion from provider failure or unexpected worker interruption. Normal handoffs do not consume the existing three-failure allowance. Bound each workflow to ten execution slices; exhaustion produces a persisted visible terminal error. Unexpected interruptions retain bounded retry protection. Close checkpoint writes and prevent subsequent provider calls after a slice stops; late results cannot overwrite a newer lease. Already in-flight external calls may repeat if their results were not checkpointed.

Limit orchestration concurrency to one lesson initially. Keep the standalone Bun worker as the local default; do not run it against the hosted database alongside Inngest.

## Dispatch and recovery

Persist dispatch intent in the job record, then await event delivery. Use a stable event ID for initial delivery. Confirm dispatch only after Inngest acknowledges it. A failed dispatch must return an explicit failure while preserving the job ID for recovery; it must not pretend a worker started.

An Inngest scheduled recovery workflow retries a bounded batch of unconfirmed dispatches. Re-delivery after acknowledgement but before database confirmation must be idempotent. Workflow failure handling persists an honest terminal outcome; polling must not remain indefinitely non-terminal when retries are exhausted.

## Free-tier and security constraints

Never upgrade accounts or enable paid gateways. Free services have quotas, so do not promise unlimited generation or guaranteed zero charges for existing AI provider accounts. Add an explicit hosted daily admission limit and bounded retries before public rollout. Do not delete stored lessons/audio automatically without separate retention approval.

Inngest signs execution requests; reject invalid signatures. Preserve Vercel deployment protection. Check whether Inngest can reach the chosen deployment URL before syncing; if protection blocks it, request direction instead of silently disabling protection or purchasing bypass access.

Existing narration fallback changes belong to the user. Verify whether their runtime dependencies exist on Vercel. An unavailable fallback must produce a truthful error, not fake recorded audio or a false ready state. Successful playback requires actual persisted opening audio and all required audio before ready.

## Acceptance and rollout

Tests must prove exact-ID claims, competing lease exclusion, stale-write rejection, chunk handoff/resume, bounded genuine failures, dispatch acknowledgement/recovery, hosted database validation, and byte-identical persisted playback audio. Use real SQLite repository tests and real Postgres branch checks; fake only external providers/event transport where necessary.

Run the existing suite, changed-file lint, TypeScript diagnostics, and production build. Report existing failures separately. Verify the served workflow endpoint and one real generation through polling and stored-audio playback; a build alone is insufficient.

First deliver the database adapter and migration validation. Then deliver the Inngest runner and dispatch integration. Finally deploy a scoped preview if protection permits, followed by production only after runtime and quota checks pass. Do not include unrelated uncommitted UI work in deployment commits. If preview access requires weakening security, stop for explicit approval.

## Review

The design covers infrastructure wiring only. No data deletion, authentication migration, paid subscription, or unrelated feature work is authorized. Implementation has not started; the design review is the next checkpoint.
