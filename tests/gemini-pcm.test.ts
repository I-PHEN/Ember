import { describe, expect, test } from "bun:test";
import { pcmToWav, normalizeVoice, EMBER_VOICE, geminiTTS } from "../src/lib/ai/gemini";

describe("pcmToWav", () => {
  test("wraps PCM in a valid RIFF header", () => {
    const pcm = Buffer.alloc(4800, 0); // 0.1s of 24kHz silence
    const wav = pcmToWav(pcm, 24000);
    expect(wav.length).toBe(44 + 4800);
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
    expect(wav.toString("ascii", 36, 40)).toBe("data");
    expect(wav.readUInt32LE(4)).toBe(36 + 4800); // chunk size
    expect(wav.readUInt32LE(24)).toBe(24000); // sample rate
    expect(wav.readUInt16LE(22)).toBe(1); // mono
    expect(wav.readUInt16LE(34)).toBe(16); // bits
    expect(wav.readUInt32LE(40)).toBe(4800); // data size
  });
});

describe("normalizeVoice", () => {
  test("legacy and unknown voices map to the Ember default", () => {
    expect(normalizeVoice("jam")).toBe(EMBER_VOICE);
    expect(normalizeVoice("")).toBe(EMBER_VOICE);
  });
  test("real Gemini voices pass through", () => {
    expect(normalizeVoice("Kore")).toBe("Kore");
    expect(normalizeVoice("Charon")).toBe("Charon");
  });
});

test("fixed narration profile keeps its voice and directions and never falls back", async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'local-test-placeholder';
  const requests: {url:string;body:Record<string,unknown>}[]=[];
  const profile = {model:'fixed-test-model',direction:'One consistent narrator.'};
  try {
    globalThis.fetch = (async (url, init) => {
      requests.push({url:String(url),body:JSON.parse(String(init?.body))});
      return new Response('Unavailable', {status:503});
    }) as typeof fetch;
    await expect(geminiTTS('Read this.', 'Aoede', profile)).rejects.toThrow('503');
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toContain('/fixed-test-model:generateContent');
    expect(JSON.stringify(requests[0].body)).toContain('Aoede');
    expect(JSON.stringify(requests[0].body)).toContain('One consistent narrator.');
    expect(JSON.stringify(requests[0].body)).toContain('Read only this transcript:');
  } finally {
    globalThis.fetch = previousFetch;
    if(previousKey===undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY=previousKey;
  }
});
