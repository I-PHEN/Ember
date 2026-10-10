import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createJob, getJob } from "../src/lib/video-jobs";
import { LEASE_MS } from "../src/lib/jobs/repository";
import { testStore } from "./helpers/durable-db";

test("a killed worker resumes the same job without repeating saved stages or audio", async () => {
  const { store, client, url, directory } = await testStore();
  const id = await createJob("Solve x+1=2", store);
  const log = join(directory, "provider-calls.log");
  const launch = (mode: string) => Bun.spawn([process.execPath, "run", "tests/fixtures/video-worker.ts", url, log, mode], {
    stdout: "pipe", stderr: "pipe",
  });
  const first = launch("interrupt");
  try {
    const deadline = Date.now() + 15_000;
    let checkpointed = false;
    while (Date.now() < deadline) {
      const row = await client.videoJobRecord.findUnique({ where: { id } });
      const state = row ? JSON.parse(row.state) : null;
      if (state?.checkpoint?.voices?.[0]) { checkpointed = true; break; }
      await Bun.sleep(50);
    }
    expect(checkpointed).toBe(true);
  } finally { first.kill(); await first.exited; }

  // Simulate elapsed lease time instead of making every test wait one minute.
  const secondClaim = await store.claimNext(Date.now() + LEASE_MS + 1);
  expect(secondClaim).not.toBeNull();
  // Return this test-acquired lease; the restarted worker must acquire its own.
  await store.release(id, secondClaim!.token);
  const second = launch("finish");
  const code = await second.exited;
  if (code !== 0) throw new Error(await new Response(second.stderr).text());
  const result = await getJob(id, store);
  expect(result?.phase).toBe("ready");
  expect(result?.voicesDone).toBe(2);
  expect(result?.script?.scenes).toHaveLength(2);
  const calls = (await readFile(log, "utf8")).trim().split("\n");
  expect(calls.filter(call => call === "director")).toHaveLength(1);
  expect(calls.filter(call => call === "planner")).toHaveLength(1);
  expect(calls.filter(call => call === "writer-0")).toHaveLength(1);
  expect(calls.filter(call => call === "audio-0")).toHaveLength(1);
  expect(calls.filter(call => call === "audio-1")).toHaveLength(1);
  const state = JSON.parse((await client.videoJobRecord.findUniqueOrThrow({ where: { id } })).state);
  expect(await store.readAudio(state.checkpoint.voices[0])).not.toBeNull();
}, 30_000);

test("an orderly hosted slice resumes without repeating saved stages or recordings", async () => {
  const { store, client, url, directory } = await testStore();
  const id = await createJob("Solve x+1=2", store);
  const log = join(directory, "slice-provider-calls.log");
  for (const mode of ["slice", "finish"]) {
    const child = Bun.spawn([process.execPath, "run", "tests/fixtures/video-worker.ts", url, log, mode], {
      stdout: "pipe", stderr: "pipe",
    });
    const code = await child.exited;
    if (code !== 0) throw new Error(await new Response(child.stderr).text());
    if (mode === "slice") {
      const row = await client.videoJobRecord.findUniqueOrThrow({ where: { id } });
      expect(row.attempts).toBe(0);
      expect(JSON.parse(row.state).checkpoint.voices[0]).toBeTruthy();
      expect(row.status).not.toBe("error");
    }
  }
  expect((await getJob(id, store))?.phase).toBe("ready");
  const calls = (await readFile(log, "utf8")).trim().split("\n");
  for (const stage of ["director", "planner", "writer-0", "audio-0", "audio-1"]) {
    expect(calls.filter(call => call === stage)).toHaveLength(1);
  }
}, 20_000);
