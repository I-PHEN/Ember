import { expect, test } from "bun:test";
import { PrismaClient as PostgresClient } from "@prisma/postgres-client";
import type { PrismaClient } from "@prisma/client";
import { DurableJobStore } from "../src/lib/jobs/repository";
import { randomUUID } from "node:crypto";

// Opt-in only. Run against the named isolated branch, never against production.
const url = process.env.EMBER_POSTGRES_TEST_URL;
test.skipIf(!url)("real Postgres persists fenced job state and byte-identical audio", async () => {
  const client = new PostgresClient({ datasources: { db: { url: url! } } });
  const second = new PostgresClient({ datasources: { db: { url: url! } } });
  const store = new DurableJobStore(client as unknown as PrismaClient);
  const id = `test_${randomUUID()}`;
  const key = Buffer.from(randomUUID()).toString("hex").slice(0, 64).padEnd(64, "0");
  try {
    await store.insert({ id, phase: "directing", error: null });
    const claim = (await store.claimJob(id))!;
    expect(claim.id).toBe(id);
    expect(await new DurableJobStore(second as unknown as PrismaClient).claimJob(id)).toBeNull();
    await store.save(id, claim.token, { id, phase: "boarding", error: null });
    await store.yieldClaim(id, claim.token);
    await expect(store.save(id, claim.token, { id, phase: "ready", error: null })).rejects.toThrow("lease");
    const independent = new DurableJobStore(second as unknown as PrismaClient);
    expect((await independent.read(id))?.phase).toBe("boarding");
    const bytes = Buffer.from("RIFF isolated Postgres recording");
    await store.saveAudio(key, bytes);
    expect(await independent.readAudio(key)).toEqual(bytes);
    await store.acknowledgeDispatch(id);
    expect(await store.pendingDispatch()).not.toContain(id);
    await store.failUnleased(id, "isolated test finished");
  } finally {
    // Retain tiny diagnostic rows: never silently delete remote data.
    await client.$disconnect();
    await second.$disconnect();
  }
}, 60_000);
