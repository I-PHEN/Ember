import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

export const LEASE_MS = 60_000;
const MAX_EXECUTIONS = 3;

export interface PersistedJob {
  id: string;
  phase: string;
  error: string | null;
}

export class LeaseLostError extends Error {
  constructor() { super("Video job lease was lost"); }
}

export class DurableJobStore {
  constructor(private readonly client: PrismaClient) {}

  async insert<T extends PersistedJob>(state: T): Promise<void> {
    await this.client.videoJobRecord.create({ data: {
      id: state.id, state: JSON.stringify(state), status: state.phase,
      // Immediately eligible, including deterministic tests with a synthetic clock.
      nextRunAt: new Date(0),
    } });
  }

  async read<T extends PersistedJob = PersistedJob>(id: string): Promise<T | null> {
    const row = await this.client.videoJobRecord.findUnique({ where: { id } });
    return row ? JSON.parse(row.state) as T : null;
  }

  async claimNext(now = Date.now()): Promise<{ id: string; token: string } | null> {
    const eligible = {
      status: { notIn: ["ready", "error"] },
      nextRunAt: { lte: new Date(now) },
      OR: [{ leaseUntil: null }, { leaseUntil: { lte: new Date(now) } }],
    };
    for (let contention = 0; contention < 24; contention++) {
      const row = await this.client.videoJobRecord.findFirst({
        where: eligible, orderBy: { createdAt: "asc" },
      });
      if (!row) return null;
      if (row.attempts >= MAX_EXECUTIONS) {
        const state = JSON.parse(row.state) as PersistedJob;
        state.phase = "error";
        state.error = "Generation was interrupted repeatedly. Please try again.";
        await this.client.videoJobRecord.updateMany({
          where: { ...eligible, id: row.id, attempts: row.attempts },
          data: { status: "error", state: JSON.stringify(state), leaseToken: null, leaseUntil: null },
        });
        continue;
      }
      const token = randomUUID();
      const changed = await this.client.videoJobRecord.updateMany({
        where: { ...eligible, id: row.id, attempts: row.attempts },
        data: { leaseToken: token, leaseUntil: new Date(now + LEASE_MS), attempts: { increment: 1 } },
      });
      if (changed.count === 1) return { id: row.id, token };
    }
    return null;
  }

  async renew(id: string, token: string, now = Date.now()): Promise<boolean> {
    const changed = await this.client.videoJobRecord.updateMany({
      where: { id, leaseToken: token, leaseUntil: { gt: new Date(now) } },
      data: { leaseUntil: new Date(now + LEASE_MS) },
    });
    return changed.count === 1;
  }

  async save<T extends PersistedJob>(id: string, token: string, state: T, now = Date.now()): Promise<void> {
    const changed = await this.client.videoJobRecord.updateMany({
      where: { id, leaseToken: token, leaseUntil: { gt: new Date(now) } },
      data: { state: JSON.stringify(state), status: state.phase },
    });
    if (changed.count !== 1) throw new LeaseLostError();
  }

  async release(id: string, token: string): Promise<void> {
    await this.client.videoJobRecord.updateMany({
      where: { id, leaseToken: token }, data: { leaseToken: null, leaseUntil: null },
    });
  }

  async saveAudio(key: string, data: Buffer): Promise<void> {
    if (!/^[a-f0-9]{64}$/.test(key) || !data.length) throw new Error("Invalid recorded audio");
    // First successful recording is immutable, even if two callers finish at once.
    await this.client.narrationAsset.upsert({
      where: { key }, create: { key, data: new Uint8Array(data) }, update: {},
    });
  }

  async readAudio(key: string): Promise<Buffer | null> {
    if (!/^[a-f0-9]{64}$/.test(key)) return null;
    const row = await this.client.narrationAsset.findUnique({ where: { key } });
    return row ? Buffer.from(row.data) : null;
  }
}
