import { afterEach, expect, test } from "bun:test";
import { PrismaClient } from "@prisma/client";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DurableJobStore } from "../src/lib/jobs/repository";

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0)) await cleanup(); });

async function setup() {
  const directory = await mkdtemp(join(tmpdir(), "ember-jobs-test-"));
  const url = `file:${join(directory, "jobs.db").replaceAll("\\", "/")}`;
  const client = new PrismaClient({ datasources: { db: { url } } });
  const sql = await readFile(new URL("../prisma/migrations/20261010_durable_generation/migration.sql", import.meta.url), "utf8");
  for (const statement of sql.split(";").filter(s => s.trim())) await client.$executeRawUnsafe(statement);
  const store = new DurableJobStore(client);
  cleanups.push(async () => { await client.$disconnect(); await rm(directory, { recursive: true, force: true }); });
  return { store, client, url };
}

const initial = { id: "job_test", phase: "directing", question: "Solve x+1=2", error: null, readyAt: null, checkpoint: {} };

test("a checkpoint survives closing the database client", async () => {
  const { store, client, url } = await setup();
  await store.insert(initial);
  const claim = await store.claimNext(1000);
  expect(claim).not.toBeNull();
  await store.save(initial.id, claim!.token, { ...initial, checkpoint: { outline: { title: "Algebra" } } }, 1010);
  await client.$disconnect();
  const secondClient = new PrismaClient({ datasources: { db: { url } } });
  try {
    const loaded = await new DurableJobStore(secondClient).read<typeof initial>(initial.id);
    expect(loaded?.checkpoint).toEqual({ outline: { title: "Algebra" } });
  } finally { await secondClient.$disconnect(); }
});

test("only one competing worker acquires a lease", async () => {
  const { store } = await setup();
  await store.insert(initial);
  const claims = await Promise.all([store.claimNext(1000), store.claimNext(1000)]);
  expect(claims.filter(Boolean)).toHaveLength(1);
});

test("expired lease takeover rejects stale checkpoint writes and renewals", async () => {
  const { store } = await setup();
  await store.insert(initial);
  const first = (await store.claimNext(1000))!;
  const second = (await store.claimNext(61_001))!;
  expect(second.token).not.toBe(first.token);
  await expect(store.save(initial.id, first.token, { ...initial, phase: "ready" }, 61_002)).rejects.toThrow("lease");
  expect(await store.renew(initial.id, first.token, 61_002)).toBe(false);
  await store.save(initial.id, second.token, { ...initial, phase: "boarding" }, 61_003);
  expect((await store.read(initial.id))?.phase).toBe("boarding");
});

test("three interrupted executions end in an honest terminal failure", async () => {
  const { store } = await setup();
  await store.insert(initial);
  expect(await store.claimNext(1000)).not.toBeNull();
  expect(await store.claimNext(61_001)).not.toBeNull();
  expect(await store.claimNext(121_002)).not.toBeNull();
  expect(await store.claimNext(181_003)).toBeNull();
  const failed = await store.read(initial.id);
  expect(failed?.phase).toBe("error");
  expect(failed?.error).toBeTruthy();
});

test("stored audio is byte-identical across independent clients", async () => {
  const { store, url } = await setup();
  const key = "a".repeat(64);
  await store.saveAudio(key, Buffer.from("RIFF recorded audio"));
  const secondClient = new PrismaClient({ datasources: { db: { url } } });
  try {
    const other = new DurableJobStore(secondClient);
    expect(await other.readAudio(key)).toEqual(Buffer.from("RIFF recorded audio"));
    expect(await other.readAudio("b".repeat(64))).toBeNull();
    await expect(other.saveAudio("c".repeat(64), Buffer.alloc(0))).rejects.toThrow();
  } finally { await secondClient.$disconnect(); }
});
