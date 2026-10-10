import { NonRetriableError } from "inngest";
import { inngest } from "./client";
import { jobStore } from "../jobs/store";
import { dispatchJob } from "../jobs/dispatch";
import { runGenerationSlice } from "../jobs/hosted-runner";

function jobId(value: unknown): string {
  if (typeof value !== "string" || !/^job_[a-f0-9-]{36}$/.test(value)) {
    throw new NonRetriableError("Invalid generation job ID");
  }
  return value;
}

export const generateVideo = inngest.createFunction({
  id: "generate-video",
  triggers: { event: "ember/video.requested" },
  concurrency: 1,
  idempotency: "event.data.jobId",
  retries: 2,
  // One slice per request: no second 180-second slice can overrun Vercel.
  checkpointing: false,
  onFailure: async ({ event, step }) => {
    const id = jobId(event.data.event.data.jobId);
    await step.sleep("wait-for-expired-lease", "65s");
    await step.run("persist-workflow-failure", () => jobStore.failUnleased(id,
      "The generation workflow could not finish. Please try again."));
  },
}, async ({ event, step }) => {
  const id = jobId(event.data.jobId);
  for (let slice = 0; slice < 10; slice++) {
    const result = await step.run(`generation-slice-${slice}`, () => runGenerationSlice(id));
    if (["ready", "error"].includes(result.phase)) return { jobId: id, phase: result.phase };
    if (result.waiting) await step.sleep(`lease-wait-${slice}`, "65s");
  }
  await step.run("persist-slice-limit", () => jobStore.failUnleased(id,
    "Generation exceeded its execution allowance. Please try a shorter question."));
  return { jobId: id, phase: "error" };
});

export const recoverDispatch = inngest.createFunction({
  id: "recover-video-dispatch",
  triggers: { cron: "0 * * * *" },
  concurrency: 1,
  retries: 2,
}, async ({ step }) => {
  const ids = await step.run("pending-dispatch", () => jobStore.pendingDispatch());
  for (const id of ids) {
    await step.run(`dispatch-${id}`, () => dispatchJob(id, jobStore, event => inngest.send(event)));
  }
  return { dispatched: ids.length };
});
