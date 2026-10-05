import { expect, test } from "bun:test";
import { getJob } from "../src/lib/video-jobs";

const jobs = (globalThis as typeof globalThis & { __videoJobs: Map<string, unknown> }).__videoJobs;
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
