import { describe, expect, test } from "bun:test";
import { pcmToWav, normalizeVoice, EMBER_VOICE } from "../src/lib/ai/gemini";

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
