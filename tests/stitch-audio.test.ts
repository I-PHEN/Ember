import { describe, expect, test } from "bun:test";
import {
  SAMPLE_RATE,
  pcmDurationSec,
  silenceSec,
  loudnessNormalize,
  gapSeconds,
  stitchScene,
} from "../src/lib/video/stitch-audio";
import { getWavDuration } from "../src/lib/video/timings";

const sec = (n: number) => Buffer.alloc(n * SAMPLE_RATE * 2); // n seconds of silence PCM

describe("pcm helpers", () => {
  test("duration math", () => {
    expect(pcmDurationSec(sec(1))).toBeCloseTo(1, 6);
    expect(pcmDurationSec(Buffer.alloc(0))).toBe(0);
  });
  test("silence length", () => {
    expect(silenceSec(0.5).length).toBe(Math.round(0.5 * SAMPLE_RATE * 2));
  });
});

describe("loudnessNormalize", () => {
  test("scales a quiet segment toward the target peak", () => {
    const pcm = Buffer.alloc(SAMPLE_RATE * 2);
    pcm.writeInt16LE(6500, 0);
    pcm.writeInt16LE(-6500, 2);
    const out = loudnessNormalize(pcm);
    expect(out.readInt16LE(0)).toBeGreaterThan(20000);
    expect(out.readInt16LE(0)).toBeLessThanOrEqual(32767);
    expect(out.readInt16LE(2)).toBeLessThanOrEqual(32767);
  });
  test("near-silence passes through untouched", () => {
    const pcm = Buffer.alloc(100);
    expect(loudnessNormalize(pcm).equals(pcm)).toBe(true);
  });
});

describe("gapSeconds", () => {
  test("default per mode", () => {
    expect(gapSeconds({})).toBe(0.35);
    expect(gapSeconds({ mode: "write_ahead" })).toBe(0.9);
  });
  test("pen deficit and hint raise it; clamps hold", () => {
    expect(gapSeconds({ penDeficit: 1.7 })).toBe(1.7);
    expect(gapSeconds({ pauseAfter: 2.0 })).toBe(2.0);
    expect(gapSeconds({ penDeficit: 9 })).toBe(4.0);
    // a deficit below the mode default never shrinks the default gap
    expect(gapSeconds({ penDeficit: 0.05 })).toBe(0.35);
  });
});

describe("stitchScene", () => {
  test("manifest math and RIFF round-trip", () => {
    const { wav, cues, totalSec } = stitchScene([sec(1), sec(1)], [0.5], 0.4);
    expect(totalSec).toBeCloseTo(2.9, 6);
    expect(cues).toEqual([
      { i: 0, t0: 0, t1: 1 },
      { i: 1, t0: 1.5, t1: 2.5 },
    ]);
    expect(getWavDuration(wav)).toBeCloseTo(2.9, 2);
    // data chunk = 2.9 s of samples
    expect(wav.readUInt32LE(40)).toBe(Math.round(2.9 * SAMPLE_RATE * 2));
  });
  test("single segment with no gaps", () => {
    const { cues, totalSec } = stitchScene([sec(2)], [], 0);
    expect(cues).toEqual([{ i: 0, t0: 0, t1: 2 }]);
    expect(totalSec).toBeCloseTo(2, 6);
  });
  test("empty input throws", () => {
    expect(() => stitchScene([], [])).toThrow();
  });
});
