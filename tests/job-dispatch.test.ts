import { expect, test } from "bun:test";
import { testStore } from "./helpers/durable-db";
import { dispatchJob } from "../src/lib/jobs/dispatch";

test("acknowledged delivery removes a job from dispatch recovery", async () => {
  const { store } = await testStore();
  await store.insert({ id: "dispatch", phase: "directing", error: null });
  const delivered: unknown[] = [];
  await dispatchJob("dispatch", store, async event => { delivered.push(event); });
  expect(delivered).toEqual([{ id: "dispatch", name: "ember/video.requested", data: { jobId: "dispatch" } }]);
  expect(await store.pendingDispatch()).toEqual([]);
});
test("failed delivery remains recoverable with the same event identity", async () => {
  const { store } = await testStore();
  await store.insert({ id: "pending", phase: "directing", error: null });
  await expect(dispatchJob("pending", store, async () => { throw new Error("offline"); })).rejects.toThrow("offline");
  expect(await store.pendingDispatch()).toEqual(["pending"]);
  await dispatchJob("pending", store, async event => { expect(event.id).toBe("pending"); });
  expect(await store.pendingDispatch()).toEqual([]);
});
test("terminal jobs never enter the dispatch recovery queue", async () => {
  const { store } = await testStore();
  await store.insert({ id: "done", phase: "ready", error: null });
  await store.insert({ id: "failed", phase: "error", error: "Failed" });
  expect(await store.pendingDispatch()).toEqual([]);
});
test("daily admission rejects excess jobs without inserting them", async () => {
  const { store, client } = await testStore();
  await store.insert({ id: "one", phase: "directing", error: null }, 1);
  await expect(store.insert({ id: "two", phase: "directing", error: null }, 1)).rejects.toThrow("daily");
  expect(await store.read("two")).toBeNull();
  expect(await client.videoJobRecord.count()).toBe(1);
});
test("workflow failure cannot overwrite a current worker or a terminal job", async () => {
  const { store } = await testStore();
  await store.insert({ id: "active", phase: "directing", error: null });
  const claim = (await store.claimJob("active"))!;
  expect(await store.failUnleased("active", "failed workflow")).toBe(false);
  await store.release(claim.id, claim.token);
  expect(await store.failUnleased("active", "failed workflow")).toBe(true);
  expect((await store.read("active"))?.phase).toBe("error");
  expect(await store.failUnleased("active", "overwrite")).toBe(false);
  expect((await store.read("active"))?.error).toBe("failed workflow");
});

test("dispatch acknowledgement cannot overwrite an active engine checkpoint", async () => {
  const { store } = await testStore();
  await store.insert({ id: "concurrent", phase: "directing", error: null });
  const claim = (await store.claimJob("concurrent"))!;
  await store.save(claim.id, claim.token, { id: claim.id, phase: "boarding", error: null });
  await dispatchJob(claim.id, store, async () => undefined);
  expect((await store.read(claim.id))?.phase).toBe("boarding");
  await store.save(claim.id, claim.token, { id: claim.id, phase: "ready", error: null });
  expect(await store.pendingDispatch()).not.toContain(claim.id);
});
