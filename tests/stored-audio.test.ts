import { expect, test } from "bun:test";
import {
  audioKey,
  ensureRecordedAudio,
  ensureStitchedSceneAudio,
} from "../src/lib/jobs/audio-assets";
import { storedAudioKey } from "../src/lib/video/recorded-audio";
import { pcmToWav } from "../src/lib/ai/gemini";
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

test("ensureStitchedSceneAudio synthesizes segments, stitches PCM with silence gaps, and returns AudioSegmentCue[]", async () => {
  const mem = new Map<string, Buffer>();
  const store = {
    readAudio: async (k: string) => mem.get(k) ?? null,
    saveAudio: async (k: string, d: Buffer) => {
      mem.set(k, d);
    },
  };
  // Build a 1.0s 24kHz mono 16-bit PCM tone
  const makeToneWav = (sec: number) => {
    const samples = Math.round(sec * 24000);
    const pcm = Buffer.alloc(samples * 2);
    for (let i = 0; i < samples; i++) {
      pcm.writeInt16LE(4000, i * 2);
    }
    return pcmToWav(pcm, 24000);
  };

  const calls: string[] = [];
  const synth = async (t: string) => {
    calls.push(t);
    return { buffer: makeToneWav(1.0), ms: 5, cached: false };
  };

  const scene = {
    chapter: "Linear Equation",
    narration: "First we frame the problem. Now we write two x equals eight.",
    segments: [
      { say: "First we frame the problem.", ink: [] },
      {
        say: "Now we write two x equals eight.",
        ink: [{ type: "write" as const, text: "2x = 8", color: "white" as const }],
      },
    ],
    beats: [{ type: "write" as const, text: "2x = 8", color: "white" as const }],
  };

  const res = await ensureStitchedSceneAudio(scene, "jam", store, synth as never);
  expect(calls.length).toBe(2);
  expect(res.segments.length).toBe(2);
  expect(res.segments[0].t0).toBe(0);
  expect(res.segments[0].t1).toBeCloseTo(1.0, 2);
  // speak_ahead default gap is 0.35s
  expect(res.segments[1].t0).toBeCloseTo(1.35, 2);
  expect(res.segments[1].t1).toBeCloseTo(2.35, 2);
  expect(res.dur).toBeCloseTo(2.35, 2);
});

