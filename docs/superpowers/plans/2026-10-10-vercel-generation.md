# Vercel generation implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline, with test-first implementation and review checkpoints.

**Goal:** Run Ember's existing durable lesson pipeline on Neon and Inngest without an always-on server.

**Architecture:** Preserve SQLite locally; generate a matching hosted Postgres client. Dispatch persisted job IDs to bounded, checkpoint-resuming Inngest steps, with fenced exact-ID leases and durable dispatch recovery.

**Tech Stack:** Next.js, Prisma 6, SQLite, Neon Postgres, Inngest TypeScript SDK, Bun tests.

## Execution checkpoint — 2026-10-10

Tasks 1–3 are implemented and verified locally, but implementation changes are not yet committed or published. Task 4 remains a rollout gate.

- Full suite: 137 passed, one opt-in Postgres test skipped, zero failures. The skipped test passed separately against the isolated Neon branch.
- Production build and changed-file ESLint passed. TypeScript still reports eight unrelated existing diagnostics; the build's existing configuration skips type checking.
- Isolated Neon migrations succeeded without changing production or existing authentication tables. Local development and the local worker remain running.
- Read-only review found no confirmed actionable issues. Real hosted Inngest retries, signed execution, and generation/playback remain unverified.
- Branch-specific Vercel environment setup was rejected because `codex/durable-generation` has not been published to the connected Git repository. No production environment variables were changed.
- The generated deployment URL redirects unauthenticated requests to Vercel SSO. The production alias is reachable but its older deployment has no Inngest endpoint. Preserve protection; evaluate a reachable serve origin during rollout.
- Narration fallback runtime dependencies and live provider success remain hosted checks, not established guarantees.
- No implementation commit, push, preview rollout, or production rollout has occurred. Unrelated user edits remain excluded from this work.

## Global constraints

- No paid upgrades, new UI features, Supabase, or authentication migration.
- Preserve unrelated working-tree edits and existing local environment files.
- No production deployment until hosted runtime checks pass.
- No weakening deployment protection or deleting retained data.
- Preserve concurrent writers, ordered early narration, and truthful readiness.

## Task 1: Matching database clients and migrations

Files: `tooling/postgres-schema.mjs`, `prisma/postgres/schema.prisma`, `prisma/postgres/migrations/`, `src/lib/database-config.ts`, `src/lib/db.ts`, `package.json`, `tests/database-config.test.ts`.

Interface: `databaseConfig(url: string | undefined, hosted: boolean): { provider: 'sqlite' | 'postgresql'; url: string }`. The generated clients expose identical models; Postgres migrations use `DATABASE_URL_UNPOOLED`.

- [ ] Write tests for SQLite local default, Postgres selection, rejected hosted SQLite/missing URLs, and rejected unsupported URLs. Example: `expect(() => databaseConfig(undefined, true)).toThrow()`.
- [ ] Run `bun test tests/database-config.test.ts` and observe failure before implementation.
- [ ] Generate hosted schema mechanically from canonical models, using Postgres datasource and separate client output; preserve local model/client selection. Add `db:generate` and `db:deploy:postgres` scripts.
- [ ] Generate initial migration with `prisma migrate diff --from-empty --to-schema-datamodel prisma/postgres/schema.prisma --script`; apply committed migration on the isolated Neon branch using a direct connection, without logging secrets.
- [ ] Verify repository lease/audio tests against the isolated Postgres database and existing SQLite tests; commit scoped changes.

## Task 2: Bounded exact-ID runner

Files: `src/lib/jobs/repository.ts`, `src/lib/video-jobs.ts`, `tests/hosted-runner.test.ts`, `tests/durable-jobs.test.ts`.

Interfaces: `claimJob(id, now)` claims only that ID; `runClaimedJob(claim, store, providers, options)` supports a bounded execution slice and distinguishes yielded work from terminal completion. Normal yield restores the failure allowance; unexpected interruption does not.

- [ ] Write real-database tests: a requested second job is claimed instead of the oldest; an unknown ID claims nothing; competing workflows cannot both claim; orderly yields preserve failure allowance and checkpoint state; lost leases reject late writes.
- [ ] Run targeted tests and confirm missing behavior fails.
- [ ] Add ID-filtered CAS claims, orderly yield accounting, and bounded failure persistence. Guard future provider calls after closure. Keep the local 15-minute default.
- [ ] Test a short slice with a delayed provider, then resume with recorded fixtures and assert completed stages/audio remain unchanged. Run existing process-restart tests; commit scoped changes.

## Task 3: Inngest dispatch, workflow, and recovery

Files: `src/lib/inngest/client.ts`, `src/lib/inngest/functions.ts`, `src/lib/jobs/dispatch.ts`, `src/app/api/inngest/route.ts`, `src/app/api/video/jobs/route.ts`, `src/lib/jobs/repository.ts`, schemas/migrations, `tests/job-dispatch.test.ts`.

Interfaces: `dispatchJob(id, store, sender)` persists acknowledgement only after transport success. Workflow steps invoke exact-ID bounded runner and return compact phase metadata. Scheduled recovery reads unconfirmed non-terminal jobs in bounded batches.

- [ ] Add failing tests using real persisted records and an external transport fake: successful acknowledgement, failed delivery retains ID/intent, terminal jobs are excluded, stable initial event IDs prevent duplicate delivery.
- [ ] Install SDK from npm, inspect actual installed types and official examples; configure signed Next.js handler with 300-second route duration and 180-second checkpointing runtime.
- [ ] Add generation workflow with concurrency one, bounded retries, ten maximum slices, failure persistence, and signed event handling. Add hourly dispatch recovery.
- [ ] API dispatch must await acknowledgement and return an explicit error containing the persisted job ID on failure. Local Bun-worker mode remains default.
- [ ] Add conservative hosted daily admission limit with an atomic database transaction. Run targeted and full tests; commit scoped changes.

## Task 4: Hosted verification and rollout

Files: `.env.example`, `docs/durable-generation.md`, this plan.

- [ ] Run `bun test`, changed-file ESLint, `npx tsc --noEmit`, and `npm run build`. Record existing unrelated diagnostics separately.
- [ ] Verify narration provider runtime dependencies; do not include the user's dirty narration/UI files in deployment commits.
- [ ] Configure preview database variables through the authenticated Vercel connection, without decrypting unrelated secrets. Verify metadata afterward.
- [ ] Check protected deployment reachability; if blocked, request direction rather than bypassing protections. Create a scoped preview only when safely reachable.
- [ ] Verify workflow registration, a real job's checkpoint/polling/audio flow, and terminal error behavior. Production migration/deployment follows only successful hosted checks.
- [ ] Update operating docs, exact verified outcomes, and remaining blockers. Keep local dev available and commit only this task's changes.
