import { runClaimedJob, type EngineProviders } from "../video-jobs";
import { DurableJobStore } from "./repository";
import { jobStore } from "./store";

/** Compact orchestration output: checkpoints/audio stay in the database. */
export async function runGenerationSlice(
  id: string, store: DurableJobStore = jobStore, providers?: EngineProviders, sliceMs = 180_000,
): Promise<{ phase: string; waiting: boolean }> {
  const before = await store.read(id);
  if (!before) throw new Error("Generation job not found");
  if (["ready", "error"].includes(before.phase)) return { phase: before.phase, waiting: false };
  const claim = await store.claimJob(id);
  if (!claim) {
    const latest = await store.read(id);
    return { phase: latest?.phase ?? "error", waiting: !["ready", "error"].includes(latest?.phase ?? "error") };
  }
  await runClaimedJob(claim, store, providers, { sliceMs });
  const latest = await store.read(id);
  return { phase: latest?.phase ?? "error", waiting: false };
}
