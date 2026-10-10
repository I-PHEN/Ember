import { expect, test } from "bun:test";
import { compileTimeline, setSceneAudio } from "../src/lib/video/compile";
import { geminiTTS, pcmToWav } from "../src/lib/ai/gemini";
import { SceneAudio } from "../src/lib/video/audio";
import type { SolveScript } from "../src/lib/video/types";

test("a fast recording cannot compress planned handwriting", () => {
  const tl = compileTimeline({ title: "t", question: "q", scenes: [{ chapter: "step",
    narration: "Subtract two from both sides to isolate the unknown. Then we can read the answer.",
    beats: [{ type: "write", text: "x + 2 = 5", say: "Subtract two from both sides", color: "white" }],
  }] } as SolveScript);
  const before = tl.scenes[0].strokes.map(s => s.dur);
  setSceneAudio(tl, 0, 2);
  expect(tl.scenes[0].strokes.map(s => s.dur)).toEqual(before);
  expect(tl.scenes[0].dur - tl.scenes[0].writeEnd).toBeGreaterThanOrEqual(2);
});

test("voice synthesis directs a calm teacher and supplies the exact transcript", async () => {
  const original = globalThis.fetch;
  const oldKey = process.env.GEMINI_API_KEY;
  let body: any;
  const wav = pcmToWav(Buffer.alloc(4800));
  process.env.GEMINI_API_KEY = "test-only";
  globalThis.fetch = (async (_url, options) => {
    body = JSON.parse(String(options?.body));
    return Response.json({ steps: [{ type: "model_output", content: [{ type: "audio", data: wav.toString("base64") }] }] });
  }) as typeof fetch;
  try {
    const audio = await geminiTTS("x equals three.", "Aoede");
    const prompt = body.input[0].content[0].annotations[0].style;
    expect(prompt).toContain("120 words per minute");
    expect(prompt).toContain("No music");
    expect(body.input[0].content[0].text).toBe("x equals three.");
    expect(audio).toEqual(wav);
  } finally { globalThis.fetch = original; if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey; }
});

test("a long explanation leaves time to absorb the result after speech", () => {
  const tl = compileTimeline({ title: "t", question: "q", scenes: [{ chapter: "step", narration: "x equals three.", beats: [{ type: "write", text: "x = 3", color: "white" }] }] } as SolveScript);
  setSceneAudio(tl, 0, 60);
  expect(tl.scenes[0].dur).toBeGreaterThanOrEqual(62);
});

test("a pending audio start is not restarted every animation frame", async () => {
  const original = globalThis.Audio;
  let starts = 0;
  let resolve!: () => void;
  const pending = new Promise<void>(r => { resolve = r; });
  class AudioDouble {
    duration = 20; currentTime = 0; paused = true; playbackRate = 1; muted = false;
    src = ""; preload = ""; dataset: Record<string, string> = {};
    pause() { this.paused = true; }
    play() { starts++; return pending; }
  }
  globalThis.Audio = AudioDouble as unknown as typeof Audio;
  const scene = new SceneAudio();
  try {
    scene.attach(0, "test.wav", 20);
    scene.tick(0, 0, true, 1, false);
    scene.tick(0, .01, true, 1, false);
    expect(starts).toBe(1);
    resolve(); await pending;
  } finally { scene.dispose(); globalThis.Audio = original; }
});
