import { expect, test } from "bun:test";
import { audioKey, ensureRecordedAudio } from "../src/lib/jobs/audio-assets";
import { storedAudioKey } from "../src/lib/video/recorded-audio";
import { readRecordedAudioResponse } from "../src/lib/jobs/audio-response";
import { testStore } from "./helpers/durable-db";
import { NarrationStore } from "../src/lib/narration-store";

test("read-only audio responses serve persisted bytes and return 404 for pending audio", async () => {
  const { store } = await testStore();
  const key = "f".repeat(64);
  const pending = await readRecordedAudioResponse(key, store);
  expect(pending.status).toBe(404);
  expect(pending.headers.get("Retry-After")).toBe("3");
  await store.saveAudio(key, Buffer.from("RIFF stored bytes"));
  const ready = await readRecordedAudioResponse(key, store);
  expect(ready.status).toBe(200);
  expect(ready.headers.get("Content-Type")).toBe("audio/wav");
  expect(Buffer.from(await ready.arrayBuffer())).toEqual(Buffer.from("RIFF stored bytes"));
  expect((await readRecordedAudioResponse("../invalid", store)).status).toBe(400);
});

test("playback with a recording reference uses GET and never submits narration for synthesis", async () => {
  const originalFetch = globalThis.fetch;
  const requests: { url: string; method?: string; body?: unknown }[] = [];
  const key = "d".repeat(64);
  globalThis.fetch = (async (url, options) => {
    requests.push({ url: String(url), method: options?.method, body: options?.body });
    return new Response(new Blob(["stored recording"], { type: "audio/wav" }));
  }) as typeof fetch;
  try {
    const url = await new NarrationStore().get("exact words", "jam", key);
    expect(requests).toEqual([{ url: `/api/narrate/${key}`, method: undefined, body: undefined }]);
    URL.revokeObjectURL(url);
  } finally { globalThis.fetch = originalFetch; }
});

test("an existing recording is served without invoking speech synthesis", async () => {
  const bytes = Buffer.from("RIFF real recording");
  const store = {
    readAudio: async () => bytes,
    saveAudio: async () => { throw new Error("must not overwrite"); },
  };
  const result = await ensureRecordedAudio("x equals one", "jam", store,
    async () => { throw new Error("speech must not regenerate"); });
  expect(result.buffer).toEqual(bytes);
  expect(result.cached).toBe(true);
});

test("new audio is persisted before it can be returned as completed", async () => {
  let saved: Buffer | null = null;
  const result = await ensureRecordedAudio("x equals two", "jam", {
    readAudio: async () => saved,
    saveAudio: async (_key, data) => { saved = data; },
  }, async () => ({ buffer: Buffer.from("RIFF new recording"), ms: 10, cached: false }));
  expect(saved).toEqual(result.buffer);
  expect(result.key).toBe(audioKey("x equals two", "jam"));
});

test("storage failure prevents reporting audio success", async () => {
  await expect(ensureRecordedAudio("x equals two", "jam", {
    readAudio: async () => null,
    saveAudio: async () => { throw new Error("disk full"); },
  }, async () => ({ buffer: Buffer.from("RIFF new recording"), ms: 10, cached: false }))).rejects.toThrow("disk full");
});

test("audio identity changes when narration changes", () => {
  expect(audioKey("x equals one", "jam")).not.toBe(audioKey("x equals two", "jam"));
});

test("recovery keeps an already assigned audio identity across configuration changes", async () => {
  const assignedKey = "9".repeat(64);
  const result = await ensureRecordedAudio("unchanged words", "jam", {
    readAudio: async key => key === assignedKey ? Buffer.from("RIFF original recording") : null,
    saveAudio: async () => { throw new Error("saved recording must not change"); },
  }, async () => { throw new Error("must not regenerate saved audio"); }, assignedKey);
  expect(result.key).toBe(assignedKey);
  expect(result.buffer).toEqual(Buffer.from("RIFF original recording"));
});

test("an edited scene cannot reuse an old narration's recording reference", () => {
  const key = "a".repeat(64);
  expect(storedAudioKey({ narration: "old", audio: { key, narration: "old" } })).toBe(key);
  expect(storedAudioKey({ narration: "new", audio: { key, narration: "old" } })).toBeUndefined();
  expect(storedAudioKey({ narration: "old", audio: { key: "../bad", narration: "old" } })).toBeUndefined();
});
