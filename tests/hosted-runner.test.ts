import { expect, test } from "bun:test";
import { testStore } from "./helpers/durable-db";
import { createJob, runClaimedJob, type EngineProviders } from "../src/lib/video-jobs";
import { runGenerationSlice } from "../src/lib/jobs/hosted-runner";

test("a workflow claims its own job instead of the oldest pending lesson", async () => {
  const { store } = await testStore();
  await store.insert({ id: "old", phase: "directing", error: null });
  await store.insert({ id: "requested", phase: "directing", error: null });
  const claim = await store.claimJob("requested", 1000);
  expect(claim?.id).toBe("requested");
  expect(await store.claimJob("unknown", 1000)).toBeNull();
  expect(await store.claimJob("", 1000)).toBeNull();
  expect(await store.claimJob("requested", 1000)).toBeNull();
  expect((await store.claimNext(1000))?.id).toBe("old");
});

test("normal chunk handoffs preserve the interruption allowance", async () => {
  const { store, client } = await testStore();
  await store.insert({ id: "chunks", phase: "directing", error: null });
  for (let i = 0; i < 5; i++) {
    const claim = (await store.claimJob("chunks", 1000))!;
    expect(claim).not.toBeNull();
    await store.yieldClaim(claim.id, claim.token, 1010);
  }
  expect((await client.videoJobRecord.findUnique({ where: { id: "chunks" } }))?.attempts).toBe(0);
});

test("a stale chunk cannot refund another runner's attempt", async () => {
  const { store, client } = await testStore();
  await store.insert({ id: "stale", phase: "directing", error: null });
  const first = (await store.claimJob("stale", 1000))!;
  const second = (await store.claimJob("stale", 61_001))!;
  await expect(store.yieldClaim(first.id, first.token, 61_002)).rejects.toThrow("lease");
  expect((await client.videoJobRecord.findUnique({ where: { id: "stale" } }))?.attempts).toBe(2);
  await store.release(second.id, second.token);
});

test("a timed slice yields without publishing late provider results", async () => {
  const { store, client } = await testStore();
  const id = await createJob("Solve x+1=2", store);
  const claim = (await store.claimJob(id))!;
  const providers: EngineProviders = {
    complete: async () => {
      await Bun.sleep(50);
      return { text: JSON.stringify({ title: "Late", question: "Solve x+1=2", scenes: [{ chapter: "Given", summary: "x+1=2" }] }), provider: "test", hops: 0 };
    },
    synthesize: async () => { throw new Error("Audio must not start after closure"); },
  };
  expect(await runClaimedJob(claim, store, providers, { sliceMs: 5 })).toBe("yielded");
  await Bun.sleep(80);
  const row = await client.videoJobRecord.findUnique({ where: { id } });
  expect(row?.attempts).toBe(0);
  expect(row?.leaseToken).toBeNull();
  expect(JSON.parse(row!.state).checkpoint.outline).toBeUndefined();
  expect(JSON.parse(row!.state).phase).toBe("directing");
});

test("orchestration returns terminal metadata without acquiring another lease", async () => {
  const { store, client } = await testStore();
  await store.insert({ id: "finished", phase: "ready", error: null });
  expect(await runGenerationSlice("finished", store)).toEqual({ phase: "ready", waiting: false });
  expect((await client.videoJobRecord.findUnique({ where: { id: "finished" } }))?.attempts).toBe(0);
  await expect(runGenerationSlice("missing", store)).rejects.toThrow("not found");
});

test("orchestration waits for another owner's lease without running providers", async () => {
  const { store } = await testStore();
  const id = await createJob("Solve x+1=2", store);
  await store.claimJob(id);
  expect(await runGenerationSlice(id, store)).toEqual({ phase: "directing", waiting: true });
});
