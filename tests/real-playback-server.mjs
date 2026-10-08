// bun build tests/real-playback.tsx --target browser --outfile scratch/real-playback.js
// node tests/real-playback-server.mjs [port=3020]
// Uses existing scratch/alignment WAVs and benchmark; never generates speech.
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root));
const samples = JSON.parse(await read("tests/fixtures/alignment-stem.json")).slice(0, 2);
const benchmark = JSON.parse(await read("scratch/alignment/base.en.benchmark.json"));
const scenes = samples.map((s, i) => ({ chapter: s.id, narration: s.text, beats: i === 0 ? [
  { type: "matrix", id: "A", label: "A", rows: [["2", "7", "-4"], ["6", "3", "5"]], keep: true, say: s.text },
] : [
  { type: "write", text: "2x + 3 = 11", say: s.text },
  { type: "write", text: "2x = 8" },
  { type: "write", text: "x = 4", keep: true },
] }));
const tracks = await Promise.all(samples.map(async s => {
  const result = benchmark.results.find(r => r.sample === s.id);
  if (result?.alignment.status !== "recognized") throw new Error(`Missing measured ${s.id} recording`);
  return { text: s.text, audio: (await read(`scratch/alignment/${s.id}.wav`)).toString("base64"), contentType: "audio/wav", alignment: result.alignment };
}));
const fixture = JSON.stringify({ script: { title: "Recorded STEM playback", question: "Read a matrix and solve an equation", scenes }, tracks });
const cssRoot = new URL(".next/static/css/", root);
const cssFiles = (await readdir(cssRoot)).filter(f => f.endsWith(".css"));
const css = (await Promise.all(cssFiles.map(f => readFile(new URL(f, cssRoot), "utf8")))).join("\n");
createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  try {
    const route = {
      "/": ["text/html", () => read("tests/real-playback.html")],
      "/real-playback.js": ["text/javascript", () => read("scratch/real-playback.js")],
      "/fixture.json": ["application/json", () => fixture],
      "/style.css": ["text/css", () => css],
    }[pathname];
    if (!route || req.method !== "GET") { res.writeHead(404).end(); return; }
    res.writeHead(200, { "Content-Type": route[0], "Cache-Control": "no-store" });
    res.end(await route[1]());
  } catch (error) { res.writeHead(500).end(String(error)); }
}).listen(Number(process.argv[2] ?? 3020), "127.0.0.1", () => console.log(`Recorded playback QA: http://localhost:${process.argv[2] ?? 3020}/ (${fileURLToPath(root)})`));
