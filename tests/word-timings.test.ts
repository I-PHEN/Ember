import { describe, expect, test } from "bun:test";
import {
  countSyllables,
  estimateWordTimings,
  parseSubtitleTimings,
  getWavDuration,
} from "../src/lib/video/timings";
import { pcmToWav } from "../src/lib/ai/gemini";
import { compileTimeline, setSceneAudio } from "../src/lib/video/compile";
import type { SolveScript } from "../src/lib/video/types";

describe("Word Timings & Server-Timed Timeline", () => {
  test("countSyllables estimates word syllables accurately", () => {
    expect(countSyllables("cat")).toBe(1);
    expect(countSyllables("equation")).toBeGreaterThanOrEqual(3);
    expect(countSyllables("mathematics")).toBeGreaterThanOrEqual(4);
    expect(countSyllables("a")).toBe(1);
  });

  test("estimateWordTimings produces monotonic word boundaries spanning totalDur", () => {
    const text =
      "First, we evaluate the expression inside the brackets. Then, we simplify the result.";
    const totalDur = 6.0;

    const words = estimateWordTimings(text, totalDur);
    expect(words.length).toBeGreaterThan(5);

    // Monotonicity check
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      expect(w.t1).toBeGreaterThan(w.t0);
      if (i > 0) {
        expect(w.t0).toBeGreaterThanOrEqual(words[i - 1].t1);
      }
    }

    // Spans close to totalDur
    const lastWord = words[words.length - 1];
    expect(lastWord.t1).toBeLessThanOrEqual(totalDur + 0.1);
    expect(lastWord.t1).toBeGreaterThan(totalDur * 0.7);
  });

  test("estimateWordTimings adds longer pause after sentence punctuation", () => {
    const text = "Stop. Now continue with comma, and more words.";
    const words = estimateWordTimings(text);

    // Gap after "Stop." vs gap after "Now"
    const stopWord = words.find((w) => w.w.includes("Stop"));
    const nowWord = words.find((w) => w.w === "Now");
    const continueWord = words.find((w) => w.w === "continue");
    const commaWord = words.find((w) => w.w.includes("comma"));
    const andWord = words.find((w) => w.w === "and");

    expect(stopWord).toBeDefined();
    expect(nowWord).toBeDefined();
    expect(continueWord).toBeDefined();

    const periodGap = nowWord!.t0 - stopWord!.t1;
    const standardGap = continueWord!.t0 - nowWord!.t1;
    expect(periodGap).toBeGreaterThan(standardGap);

    if (commaWord && andWord) {
      const commaGap = andWord.t0 - commaWord.t1;
      expect(commaGap).toBeGreaterThan(standardGap);
    }
  });

  test("parseSubtitleTimings parses WebVTT into word events", () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:03.000
First step in algebra

00:00:03.500 --> 00:00:05.500
Isolating the variable
`;

    const timings = parseSubtitleTimings(vtt);
    expect(timings.length).toBe(7);
    expect(timings[0].w).toBe("First");
    expect(timings[0].t0).toBe(1.0);
    expect(timings[3].w).toBe("algebra");
    expect(timings[3].t1).toBe(3.0);

    expect(timings[4].w).toBe("Isolating");
    expect(timings[4].t0).toBe(3.5);
  });

  test("getWavDuration calculates duration from RIFF header", () => {
    // 24000 Hz, 16-bit mono = 48000 bytes per second
    const pcm = Buffer.alloc(48000 * 2.5); // 2.5 seconds
    const wav = pcmToWav(pcm, 24000, 1, 16);

    const dur = getWavDuration(wav);
    expect(dur).not.toBeNull();
    expect(dur).toBeCloseTo(2.5, 1);
  });

  test("compileTimeline preserves word timings and audio duration", () => {
    const script: SolveScript = {
      title: "Audio Timing Demo",
      question: "Sample problem",
      scenes: [
        {
          chapter: "Scene 1",
          narration: "We solve the equation step by step.",
          beats: [{ type: "write", text: "2x = 10", color: "white" }],
          audio: {
            key: "test-audio-key",
            dur: 4.2,
            words: [
              { w: "We", t0: 0.1, t1: 0.4 },
              { w: "solve", t0: 0.5, t1: 1.0 },
              { w: "the", t0: 1.1, t1: 1.3 },
              { w: "equation", t0: 1.4, t1: 2.2 },
              { w: "step", t0: 2.3, t1: 2.8 },
              { w: "by", t0: 2.9, t1: 3.2 },
              { w: "step.", t0: 3.3, t1: 4.0 },
            ],
          },
        },
      ],
    };

    const timeline = compileTimeline(script);
    expect(timeline.scenes[0].audioDur).toBe(4.2);
    expect(timeline.scenes[0].words).toBeDefined();
    expect(timeline.scenes[0].words?.length).toBe(7);

    // Test setSceneAudio attaches words
    const newWords = [{ w: "Updated", t0: 0.0, t1: 1.0 }];
    setSceneAudio(timeline, 0, 5.0, newWords);
    expect(timeline.scenes[0].audioDur).toBe(5.0);
    expect(timeline.scenes[0].words).toEqual(newWords);
  });
});
