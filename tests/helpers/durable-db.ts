import { afterEach } from "bun:test";
import { PrismaClient } from "@prisma/client";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DurableJobStore } from "../../src/lib/jobs/repository";

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0)) await cleanup(); });

export async function testStore() {
  const directory = await mkdtemp(join(tmpdir(), "ember-jobs-test-"));
  const url = `file:${join(directory, "jobs.db").replaceAll("\\", "/")}`;
  const client = new PrismaClient({ datasources: { db: { url } } });
  const sql = await readFile(new URL("../../prisma/migrations/20261010_durable_generation/migration.sql", import.meta.url), "utf8");
  for (const statement of sql.split(";").filter(s => s.trim())) await client.$executeRawUnsafe(statement);
  cleanups.push(async () => { await client.$disconnect(); await rm(directory, { recursive: true, force: true }); });
  return { store: new DurableJobStore(client), client, url, directory };
}
