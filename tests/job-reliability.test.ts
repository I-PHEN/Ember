import { expect, test } from "bun:test";
import { createJob, getJob } from "../src/lib/video-jobs";
import { testStore } from "./helpers/durable-db";
import { GET } from "../src/app/api/video/jobs/[id]/route";
import { NextRequest } from "next/server";

test("polling a missing job returns 404 instead of a substitute job", async () => {
  const response = await GET(new NextRequest("http://localhost/api/video/jobs/missing"), {
    params: Promise.resolve({ id: "missing" }),
  });
  expect(response.status).toBe(404);
  expect((await response.json()).error).toBeTruthy();
});

test("a missing job never fabricates a lesson from its encoded question", async () => {
  const { store } = await testStore();
  const id = `job_${Date.now() - 10_000}_${Buffer.from("Integrate x squared").toString("base64url")}`;
  expect(await getJob(id, store)).toBeNull();
});

test("an arbitrary missing job never reports ready", async () => {
  expect(await getJob("missing-job")).toBeNull();
});

test("a failed stored job retains its error and has no canned script", async () => {
  const { store } = await testStore();
  const id = "job_failed-reliability-test";
  await store.insert({
    id, question: "Integrate x squared", phase: "error", createdAt: Date.now(),
    title: null, error: "Provider unavailable", script: null, progressPct: 25,
    scenesTotal: 0, scenesDone: 0, voicesTotal: 0, voicesDone: 0,
    directorMs: null, scriptStartAt: null, boardingStartAt: null,
    writerEwma: 9000, voiceEwma: 4500, stats: {},
  });
    const result = await getJob(id, store);
    expect(result?.phase).toBe("error");
    expect(result?.error).toBe("Provider unavailable");
    expect(result?.script).toBeNull();
    expect(result?.progressPct).toBeLessThan(100);
});

test("submitting a job persists it without starting provider work", async () => {
  const { store } = await testStore();
  const id = await createJob("Solve x+1=2", store);
  expect(id).not.toContain(Buffer.from("Solve x+1=2").toString("base64url"));
  const result = await getJob(id, store);
  expect(result?.phase).toBe("directing");
  expect(result?.scenesDone).toBe(0);
  expect(result?.script).toBeNull();
});
