// Explicit local benchmark. Audio must already exist; no provider calls.
// EMBER_ALIGNMENT_MODEL=small.en bun tests/alignment-benchmark.live.ts scratch/alignment
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { AlignmentWorker } from "../src/lib/ai/alignment-worker";
import { phrasesForScene } from "../src/lib/video/speech-alignment";
import samples from "./fixtures/alignment-stem.json";
import type { SolveScene } from "../src/lib/video/types";

const directory = process.argv[2];
if (!directory) throw new Error("Pass the directory containing matrix.wav, equation.wav and repeated.wav");
const model = process.env.EMBER_ALIGNMENT_MODEL ?? "base.en";
if (!/^[a-z0-9.-]+$/i.test(model)) throw new Error("Benchmark requires a model name, not a path");
const worker = new AlignmentWorker();
const results = [];
try {
  for (const sample of samples) {
    const audio = await readFile(path.join(directory, `${sample.id}.wav`));
    const scene: SolveScene = {
      chapter: sample.id, narration: sample.text,
      beats: sample.anchors.map(say => ({ type: "write", text: say, say })),
    };
    for (let repetition = 0; repetition < 2; repetition++) {
      const started = performance.now();
      const alignment = await worker.align(sample.text, audio);
      const elapsedMs = Math.round(performance.now() - started);
      const phrases = alignment.status === "aligned"
        ? phrasesForScene(scene, 0, alignment.words, alignment.duration!) : null;
      const result = { sample: sample.id, repetition, elapsedMs, alignment, phrases };
      results.push(result);
      console.log(JSON.stringify({ model, sample: sample.id, repetition, elapsedMs, status: alignment.status, anchors: phrases?.length ?? 0 }));
    }
  }
} finally { worker.dispose(); }
const report = { model, productionDeadlineMs: 30000, results };
await writeFile(path.join(directory, `${model}.benchmark.json`), JSON.stringify(report, null, 2));
// Failure is a benchmark finding, not a success hidden behind exit 0.
if (results.some(result => result.alignment.status !== "aligned" || !result.phrases)) process.exitCode = 1;
