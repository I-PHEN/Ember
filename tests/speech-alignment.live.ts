// Opt-in real-audio diagnostic, not part of bun test. Never silently generates
// paid/provider audio: pass an existing WAV containing exactly this transcript.
// bun tests/speech-alignment.live.ts .next/alignment-matrix.wav
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { AlignmentWorker } from "../src/lib/ai/alignment-worker";
import { phrasesForScene } from "../src/lib/video/speech-alignment";
import { compileBeatTiming } from "../src/lib/video/timing";
import type { SolveScene } from "../src/lib/video/types";

const narration = "A matrix is a rectangular arrangement of numbers. This matrix has two rows and three columns. We write its dimensions as two by three. To locate an entry, choose the row first, then the column.";
const scene: SolveScene = {
  chapter: "Matrix dimensions",
  narration,
  beats: [
    { type: "write", text: "2 rows", say: "two rows" },
    { type: "write", text: "3 columns", say: "three columns" },
    { type: "write", text: "2 × 3", say: "two by three" },
    { type: "write", text: "row → column", say: "row first, then the column" },
  ],
};
const audioPath = process.argv[2];
assert(audioPath, "Pass a WAV file containing the documented matrix transcript");
const audio = await readFile(audioPath);
const worker = new AlignmentWorker(); // Production deadline, not a relaxed test timeout.
try {
  const started = performance.now();
  const alignment = await worker.align(narration, audio);
  const elapsedMs = Math.round(performance.now() - started);
  console.log(JSON.stringify({ status: alignment.status, elapsedMs, words: alignment.words.length }));
  assert.equal(alignment.status, "aligned", "Real audio must align within the production deadline");
  const phrases = phrasesForScene(scene, 0, alignment.words, alignment.duration!);
  assert(phrases && phrases.length === scene.beats.length, "Every authored anchor must map to measured words");
  // Synthetic ink durations isolate timing mapping from font/layout geometry.
  const beats = scene.beats.map((beat, i) => ({ id: `s0b${i + 1}`, t0: i, t1: i + 1, say: "say" in beat ? beat.say : undefined }));
  const timing = compileBeatTiming(beats, narration, { duration: alignment.duration!, phrases });
  assert.equal(timing.source, "aligned");
  const warmStart = performance.now();
  const warm = await worker.align(narration, audio);
  assert.equal(warm.status, "aligned", "Persistent worker must handle a second request");
  const result = { narration, alignment, phrases, timing, coldMs: elapsedMs, warmMs: Math.round(performance.now() - warmStart) };
  await writeFile(`${audioPath}.alignment.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ result: "PASS", coldMs: result.coldMs, warmMs: result.warmMs, phrases, issues: timing.issues }));
} finally {
  worker.dispose();
}
