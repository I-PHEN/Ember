import { expect, test } from "bun:test";
import { getJob } from "../src/lib/video-jobs";
import { GET } from "../src/app/api/video/jobs/[id]/route";
import { NextRequest } from "next/server";

test("polling a missing job returns 404 instead of a substitute job", async () => {
  const response = await GET(new NextRequest("http://localhost/api/video/jobs/missing"), {
    params: Promise.resolve({ id: "missing" }),
  });
  expect(response.status).toBe(404);
  expect((await response.json()).error).toBeTruthy();
});

test("a missing job never fabricates a lesson from its encoded question", () => {
  const id = `job_${Date.now() - 10_000}_${Buffer.from("Integrate x squared").toString("base64url")}`;
  expect(getJob(id)).toBeNull();
});

test("an arbitrary missing job never reports ready", () => {
  expect(getJob("missing-job")).toBeNull();
});

test("a failed stored job retains its error and has no canned script", () => {
  const store = (globalThis as unknown as { __videoJobs: Map<string, unknown> }).__videoJobs;
  const id = "failed-reliability-test";
  store.set(id, {
    id, question: "Integrate x squared", phase: "error", createdAt: Date.now(),
    title: null, error: "Provider unavailable", script: null, progressPct: 25,
    scenesTotal: 0, scenesDone: 0, voicesTotal: 0, voicesDone: 0,
    directorMs: null, scriptStartAt: null, boardingStartAt: null,
    writerEwma: 9000, voiceEwma: 4500, stats: {},
  });
  try {
    const result = getJob(id);
    expect(result?.phase).toBe("error");
    expect(result?.error).toBe("Provider unavailable");
    expect(result?.script).toBeNull();
    expect(result?.progressPct).toBeLessThan(100);
  } finally { store.delete(id); }
});
