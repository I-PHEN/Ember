import { expect, test } from "bun:test";
import { getJob } from "../src/lib/video-jobs";
import { NextRequest } from "next/server";
import { GET } from "../src/app/api/video/jobs/[id]/route";

const jobs = (globalThis as typeof globalThis & { __videoJobs: Map<string, unknown> }).__videoJobs;
test("missing jobs cannot manufacture lessons or verification progress", () => {
  expect(getJob("missing-job")).toBeNull();
  expect(getJob("job_1_eCt4")).toBeNull();
});

test("poll route returns 404 for missing jobs instead of fake progress", async () => {
  const result = await GET(new NextRequest("http://localhost/api/video/jobs/missing-job"),
    {params:Promise.resolve({id:"missing-job"})});
  expect(result.status).toBe(404);
  expect((await result.json()).script).toBeUndefined();
});

test("failed jobs without scripts stay failed when polled", () => {
  const id = "failed-review-fixture";
  const fixture = { id, phase: "error", createdAt: Date.now(), question: "x+x", title: null,
    script: null, error: "Review failed", scenesTotal: 2, scenesDone: 2,
    voicesTotal: 2, voicesDone: 0, progressPct: 70, voiceEwma: 100,
    stats: { reviewedScenes: 0, unreviewedScenes: 2 } };
  jobs.set(id, fixture);
  try {
    expect(getJob(id)?.phase).toBe("error");
    expect(getJob(id)?.error).toBe("Review failed");
    expect(getJob(id)?.script).toBeNull();
    expect(fixture.script).toBeNull();
  } finally { jobs.delete(id); }
});

test("job snapshot never exposes unreviewed or failed lesson scripts", () => {
  const id = "review-delivery-fixture";
  const script = { title:"T",question:"Q",scenes:[{},{}] };
  const fixture = { id,phase:"voicing",createdAt:Date.now(),question:"Q",title:"T",script,
    scenesTotal:2,scenesDone:2,voicesTotal:2,voicesDone:0,progressPct:0,
    voiceEwma:100,stats:{reviewedScenes:1,unreviewedScenes:1},error:null };
  jobs.set(id,fixture);
  try {
    expect(getJob(id)?.script).toBeNull();
    fixture.stats = {reviewedScenes:2,unreviewedScenes:0};
    expect(getJob(id)?.script).toBe(script);
    fixture.phase = "error";
    expect(getJob(id)?.script).toBeNull();
    fixture.phase = "boarding";
    expect(getJob(id)?.script).toBeNull();
  } finally { jobs.delete(id); }
});
