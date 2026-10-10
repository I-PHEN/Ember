import { jobStore } from "../lib/jobs/store";
import { db } from "../lib/db";
import { runClaimedJob } from "../lib/video-jobs";

let stopping = false;
process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });

async function main() {
  console.log("Ember video worker started; waiting for durable jobs.");
  while (!stopping) {
    try {
      const claim = await jobStore.claimNext();
      if (claim) await runClaimedJob(claim);
      else await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error("Video worker execution interrupted:", error instanceof Error ? error.message : error);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

void main().finally(() => db.$disconnect());
