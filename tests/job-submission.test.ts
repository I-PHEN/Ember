import { expect, test } from "bun:test";
import { testStore } from "./helpers/durable-db";

test("failed Inngest submission returns the persisted recoverable job ID", async () => {
  const { store, url } = await testStore();
  const child = Bun.spawn([process.execPath, "--eval", `
    import { POST } from "./src/app/api/video/jobs/route";
    import { NextRequest } from "next/server";
    const response = await POST(new NextRequest("http://localhost/api/video/jobs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "Solve x+1=2" }),
    }));
    console.log(JSON.stringify({ status: response.status, body: await response.json() }));
  `], { env: { ...process.env, DATABASE_URL: url, VERCEL: "0", GENERATION_RUNNER: "inngest",
    INNGEST_DEV: "0", INNGEST_EVENT_KEY: "", INNGEST_SIGNING_KEY: "" }, stdout: "pipe", stderr: "pipe" });
  const output = await new Response(child.stdout).text();
  expect(await child.exited).toBe(0);
  const result = JSON.parse(output.trim());
  expect(result.status).toBe(503);
  expect(result.body.jobId).toMatch(/^job_/);
  expect(result.body.error).toContain("saved");
  const saved = await store.read(result.body.jobId);
  expect(saved?.phase).toBe("directing");
  expect(await store.pendingDispatch()).toEqual([result.body.jobId]);
}, 20_000);
