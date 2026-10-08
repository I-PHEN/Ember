// Package existing recordings only. No provider calls or model downloads.
import { readFile, copyFile, mkdir, writeFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const samples = JSON.parse(await readFile(new URL("tests/fixtures/alignment-stem.json", root)));
const benchmark = JSON.parse(await readFile(new URL("scratch/alignment/base.en.benchmark.json", root)));
const output = new URL("public/lessons/matrix-preview/", root);
await mkdir(output, { recursive: true });
const tracks = [];
for (const id of ["matrix", "repeated"]) {
  const sample = samples.find(s => s.id === id);
  const result = benchmark.results.find(r => r.sample === id && r.alignment?.status === "recognized");
  if (!sample || !result) throw new Error(`Missing recognized recording: ${id}`);
  await copyFile(new URL(`scratch/alignment/${id}.wav`, root), new URL(`${id}.wav`, output));
  tracks.push({ text: sample.text, url: `/lessons/matrix-preview/${id}.wav`, alignment: result.alignment });
}
await writeFile(new URL("tracks.json", output), JSON.stringify(tracks, null, 2) + "\n");
console.log("Packaged two existing matrix recordings and their measured timings.");
