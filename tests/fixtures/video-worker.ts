import { PrismaClient } from "@prisma/client";
import { appendFileSync } from "node:fs";
import { DurableJobStore } from "../../src/lib/jobs/repository";
import { runClaimedJob, type EngineProviders } from "../../src/lib/video-jobs";
import { SOLVER_SYSTEM, REVIEWER_SYSTEM, TRANSCRIPT_PROMPT } from "../../src/lib/prompts";

const [url, log, mode] = process.argv.slice(2);
const client = new PrismaClient({ datasources: { db: { url } } });
const store = new DurableJobStore(client);
const record = (stage: string) => appendFileSync(log, `${stage}\n`);
const narrations = [
  "We start with x plus one equals two. Subtract one from both sides to isolate x.",
  "The answer is x equals one. Substitution gives one plus one equals two, so our answer checks.",
];
const providers: EngineProviders = {
  complete: async (system, user) => {
    let data: unknown;
    if (system === SOLVER_SYSTEM) { record("solver"); data = { answer: "1", steps: [] }; }
    else if (system.startsWith("You DIRECT")) {
      record("director");
      data = { title: "Simple algebra", question: "Solve x+1=2", scenes: [
        { chapter: "Given", summary: "x+1=2" }, { chapter: "Answer", summary: "x=1" },
      ] };
    } else if (system === TRANSCRIPT_PROMPT) {
      record("planner"); data = { scenes: narrations.map(script => ({ script })) };
    } else if (system === REVIEWER_SYSTEM) { record("review"); data = { verdict: "pass" }; }
    else {
      const index = Number(user.match(/YOUR SCENE: scene (\d+)/)?.[1]) - 1;
      record(`writer-${index}`);
      if (mode === "interrupt" && index === 1) await Bun.sleep(30_000);
      if (mode === "slice" && index === 1) await Bun.sleep(3000);
      data = { narration: narrations[index], beats: [
        { type: "write", text: index === 0 ? "x + 1 = 2" : "x = 1", say: narrations[index], keep: index === 1 },
        ...(index === 1 ? [{ type: "box" }] : []),
      ] };
    }
    return { text: JSON.stringify(data), provider: "recorded-test-provider", hops: 0 };
  },
  synthesize: async text => {
    record(`audio-${narrations.indexOf(text)}`);
    return { buffer: Buffer.from(`RIFF recorded audio: ${text}`), ms: 1, cached: false };
  },
};
try {
  const claim = await store.claimNext();
  if (!claim) throw new Error("No resumable job");
  await runClaimedJob(claim, store, providers, mode === "slice" ? { sliceMs: 1000 } : {});
} finally { await client.$disconnect(); }
