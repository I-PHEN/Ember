import { expect, test } from "bun:test";
import { NextRequest } from "next/server";
import { POST } from "../src/app/api/video/jobs/[id]/timing/route";

// Seed only an ephemeral store fixture. Never call createJob (which calls providers).
const jobs = (globalThis as typeof globalThis & {
  __videoJobs: Map<string, unknown>;
}).__videoJobs;
const id = "timing-route-fixture";
const request = (body: unknown) => new NextRequest("http://localhost/api/video/jobs/" + id + "/timing", {
  method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
});
const context = { params: Promise.resolve({ id }) };
test("route records, replaces and rejects invalid reports without generating a lesson", async () => {
  const fixture = {
    phase: "ready", createdAt: Date.now(), readyAt: Date.now(),
    script: { scenes: [{}, {}] }, stats: {},
  };
  jobs.set(id, fixture);
  try {
    const report = { sceneIndex: 1, audioDurationMs: 4000, writeEndMs: 3600 };
    expect((await POST(request(report), context)).status).toBe(204);
    expect((await POST(request({ ...report, writeEndMs: 3800 }), context)).status).toBe(204);
    expect(fixture.stats).toEqual({ timing: { planned: null, measuredScenes: [{ ...report, writeEndMs: 3800 }] } });
    expect((await POST(request({ ...report, audioUrl: "private" }), context)).status).toBe(400);
    expect((await POST(request({ ...report, sceneIndex: 2 }), context)).status).toBe(400);
  } finally { jobs.delete(id); }
  expect((await POST(request({}), context)).status).toBe(404);
});
