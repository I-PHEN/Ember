import { expect, test } from "bun:test";
import { pcmToWav } from "../src/lib/ai/gemini";
import { readWav, joinWavs } from "../src/lib/video/wav";
import { ensureStepAudio } from "../src/lib/jobs/step-audio";
import type { SolveScene } from "../src/lib/video/types";

test("WAV duration comes from PCM data, including padded unknown chunks", () => {
  const wav = pcmToWav(Buffer.alloc(48000));
  const chunk = Buffer.from([74,85,78,75,1,0,0,0,7,0]);
  const extended = Buffer.concat([wav.subarray(0,12), chunk, wav.subarray(12)]);
  extended.writeUInt32LE(extended.length - 8, 4);
  expect(readWav(extended).duration).toBe(1);
});
test("truncated and incompatible audio cannot be published as timed steps", () => {
  const wav = pcmToWav(Buffer.alloc(48000));
  expect(() => readWav(wav.subarray(0,100))).toThrow();
  expect(() => joinWavs([wav, pcmToWav(Buffer.alloc(32000),16000)])).toThrow("format");
});
test("joining recordings retains all samples with a single WAV header", () => {
  const wav = joinWavs([pcmToWav(Buffer.alloc(48000,1)), pcmToWav(Buffer.alloc(96000,2))]);
  expect(readWav(wav).duration).toBe(3);
  expect(readWav(wav).pcm.length).toBe(144000);
  expect(readWav(wav).pcm[47999]).toBe(1);
  expect(readWav(wav).pcm[48000]).toBe(2);
});
test("an interrupted scene reuses saved speech steps without regenerating them", async () => {
  const saved = new Map<string,Buffer>();
  const store = { readAudio: async (key:string) => saved.get(key) ?? null, saveAudio: async (key:string,data:Buffer) => { if (!saved.has(key)) saved.set(key,data); } };
  const scene = { chapter:"Subtract", narration:"Subtract two. What is five minus two? It is three.", beats:[{type:"write",text:"x = 3",say:"It is three."}] } as SolveScene;
  let calls = 0;
  const synth = async () => { calls++; if(calls===2) throw new Error("interrupted"); return {buffer:pcmToWav(Buffer.alloc(48000)),ms:1,cached:false}; };
  await expect(ensureStepAudio(scene,store,synth)).rejects.toThrow("interrupted");
  expect(saved.size).toBe(1);
  const result = await ensureStepAudio(scene,store,async () => { calls++; return {buffer:pcmToWav(Buffer.alloc(96000)),ms:1,cached:false}; });
  expect(calls).toBe(4);
  expect(result.steps.map(s=>s.duration)).toEqual([1,2,2]);
  expect(readWav(result.buffer).duration).toBe(5);
  expect(result.steps[1].kind).toBe("ask");
  const reused = await ensureStepAudio(scene,store,async()=>{throw new Error("must not regenerate");});
  expect(reused.steps).toEqual(result.steps);
});
