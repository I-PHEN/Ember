import { expect, test } from "bun:test";
import { NarrationStore } from "../src/lib/narration-store";
import { narrationResponse } from "../src/lib/ai/narration-response";
const artifact = { buffer: Buffer.from("RIFF-test-audio"),
  alignment: { status: "aligned" as const, duration: 1, words: [{ text: "hello", start: 0.1, end: 0.8 }] } };
test("binary compatibility and JSON carry identical audio bytes", async () => {
  const binary = narrationResponse(artifact, false);
  expect(Buffer.from(await binary.arrayBuffer())).toEqual(artifact.buffer);
  const json = await narrationResponse(artifact, true).json();
  expect(Buffer.from(json.audio, "base64")).toEqual(artifact.buffer);
  expect(json.alignment).toEqual(artifact.alignment);
});
test("track and legacy URL calls share one fetch with validated timing", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => { calls++; return narrationResponse(artifact, true); }) as typeof fetch;
  try {
    const store = new NarrationStore();
    const [track, url] = await Promise.all([store.getTrack("hello"), store.get("hello")]);
    expect(track.url).toBe(url);
    expect(track.alignment.status).toBe("aligned");
    expect(calls).toBe(1);
    URL.revokeObjectURL(url);
  } finally { globalThis.fetch = original; }
});
test("bad alignment preserves playable audio with explicit invalid status", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => narrationResponse(artifact, true)) as typeof fetch;
  try {
    const track = await new NarrationStore().getTrack("different transcript");
    expect(track.url.startsWith("blob:")).toBe(true);
    expect(track.alignment.status).toBe("invalid");
    expect(track.alignment.words).toEqual([]);
    URL.revokeObjectURL(track.url);
  } finally { globalThis.fetch = original; }
});
test("old binary narration response remains supported", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => narrationResponse(artifact, false)) as typeof fetch;
  try {
    const track = await new NarrationStore().getTrack("hello");
    expect(track.alignment.status).toBe("unavailable");
    URL.revokeObjectURL(track.url);
  } finally { globalThis.fetch = original; }
});

