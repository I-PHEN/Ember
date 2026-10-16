import { describe, expect, test } from "bun:test";
import { countSyllables, getWavDuration } from "../src/lib/video/timings";
import { pcmToWav } from "../src/lib/ai/gemini";
import { compileTimeline, setSceneAudio } from "../src/lib/video/compile";
import type { SolveScript } from "../src/lib/video/types";

describe("Audio Timings & Measured Scene Audio", () => {
  test("countSyllables estimates word syllables accurately", () => {
    expect(countSyllables("cat")).toBe(1);
    expect(countSyllables("equation")).toBeGreaterThanOrEqual(3);
    expect(countSyllables("mathematics")).toBeGreaterThanOrEqual(4);
    expect(countSyllables("a")).toBe(1);
  });

  test("getWavDuration calculates duration from RIFF header", () => {
    // 24000 Hz, 16-bit mono = 48000 bytes per second
    const pcm = Buffer.alloc(48000 * 2.5); // 2.5 seconds
    const wav = pcmToWav(pcm, 24000, 1, 16);

    const dur = getWavDuration(wav);
    expect(dur).not.toBeNull();
    expect(dur).toBeCloseTo(2.5, 1);
  });

  test("compileTimeline and setSceneAudio preserve measured audio duration and cues without rescaling strokes", () => {
    const script: SolveScript = {
      title: "Audio Timing Demo",
      question: "Sample problem",
      scenes: [
        {
          chapter: "Scene 1",
          narration: "We solve the equation step by step.",
          segments: [
            {
              say: "We solve the equation step by step.",
              ink: [{ type: "write", text: "2x = 10", color: "white" }],
            },
          ],
          beats: [{ type: "write", text: "2x = 10", color: "white" }],
          audio: {
            key: "test-audio-key",
            dur: 4.2,
            segments: [{ i: 0, t0: 0, t1: 4.2 }],
          },
        },
      ],
    };

    const timeline = compileTimeline(script);
    expect(timeline.scenes[0].audioDur).toBe(4.2);
    expect(timeline.scenes[0].audioCues).toEqual([{ i: 0, t0: 0, t1: 4.2 }]);
    const origStrokeDurs = timeline.scenes[0].strokes.map((s) => s.dur);
    const origStrokeT0s = timeline.scenes[0].strokes.map((s) => s.t0);

    // setSceneAudio attaches measured duration and cues without rescaling strokes
    const newCues = [{ i: 0, t0: 0, t1: 5.0 }];
    setSceneAudio(timeline, 0, 5.0, newCues);
    expect(timeline.scenes[0].audioDur).toBe(5.0);
    expect(timeline.scenes[0].audioCues).toEqual(newCues);
    expect(timeline.scenes[0].strokes.map((s) => s.dur)).toEqual(origStrokeDurs);
    expect(timeline.scenes[0].strokes.map((s) => s.t0)).toEqual(origStrokeT0s);
  });
});
