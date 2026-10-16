import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  SAMPLE_CALCULUS,
  SAMPLE_GAUSSIAN_INTEGRAL,
  SAMPLE_INCLINED_PLANE,
} from "../src/lib/samples";
import { compileTimeline } from "../src/lib/video/compile";
import { SAMPLE_RATE } from "../src/lib/video/stitch-audio";

const SAY_T0 = 0.08;
const WAV_HEADER_BYTES = 44;
const PCM_BYTES_PER_SEC = SAMPLE_RATE * 2;

function rmsInWindow(pcm: Buffer, t0: number, t1: number): number {
  const startByte = Math.max(0, Math.floor(t0 * PCM_BYTES_PER_SEC) & ~1);
  const endByte = Math.min(pcm.length, Math.floor(t1 * PCM_BYTES_PER_SEC) & ~1);
  const sampleCount = Math.floor((endByte - startByte) / 2);
  if (sampleCount <= 0) return 0;
  let sumSq = 0;
  for (let off = startByte; off + 1 < endByte; off += 2) {
    const sample = pcm.readInt16LE(off) / 32768;
    sumSq += sample * sample;
  }
  return Math.sqrt(sumSq / sampleCount);
}

describe("Sync V2 Verification Gates (Spec §9)", () => {
  const lessons = [
    { name: "SAMPLE_GAUSSIAN_INTEGRAL", script: SAMPLE_GAUSSIAN_INTEGRAL },
    { name: "SAMPLE_INCLINED_PLANE", script: SAMPLE_INCLINED_PLANE },
    { name: "SAMPLE_CALCULUS", script: SAMPLE_CALCULUS },
  ];

  test("1. Verbatim & Schema Gate: every curated lesson has verbatim segments and at most one pauseAfter", () => {
    for (const { name, script } of lessons) {
      let pauseAfterCount = 0;
      for (let si = 0; si < script.scenes.length; si++) {
        const sc = script.scenes[si];
        expect(sc.segments).toBeDefined();
        expect(sc.segments!.length).toBeGreaterThanOrEqual(2);
        const joined = sc.segments!.map((seg) => seg.say.trim()).join(" ");
        expect(joined).toBe(sc.narration.trim());
        for (const seg of sc.segments!) {
          if (seg.pauseAfter !== undefined) {
            pauseAfterCount++;
            expect(seg.pauseAfter).toBeGreaterThanOrEqual(1.5);
            expect(seg.pauseAfter).toBeLessThanOrEqual(2.5);
          }
        }
      }
      expect(pauseAfterCount).toBe(1);
      if (!name) throw new Error("unreachable");
    }
  });

  test("2. Monotonic Stroke t0 Gate: all lessons compile with strictly non-decreasing stroke t0 and pre-mounted banner at t=0", () => {
    for (const { script } of lessons) {
      const tl = compileTimeline(script);
      if (!script.scenes[0].beats.some((b) => b.type === "title")) {
        const banner = tl.scenes[0].groups.find((g) => g.id === "banner");
        expect(banner).toBeDefined();
        expect(banner!.born).toBe(0);
        for (const bst of banner!.strokes) {
          expect(bst.t0).toBe(0);
        }
      }

      for (const sc of tl.scenes) {
        let prevT0 = 0;
        for (const st of sc.strokes) {
          expect(st.t0).toBeGreaterThanOrEqual(prevT0 - 1e-4);
          prevT0 = st.t0;
        }
      }
    }
  });

  test("3. Anchor Audit Gate: every segment in SAMPLE_GAUSSIAN_INTEGRAL starts its ink at cue.t0 + SAY_T0 and finishes before nextCue.t0", () => {
    const tl = compileTimeline(SAMPLE_GAUSSIAN_INTEGRAL);
    expect(tl.scenes.length).toBe(6);

    tl.scenes.forEach((sc, sceneIdx) => {
      const rawScene = SAMPLE_GAUSSIAN_INTEGRAL.scenes[sceneIdx];
      const cues = rawScene.audio?.segments;
      expect(cues).toBeDefined();
      expect(cues!.length).toBe(rawScene.segments!.length);

      // Every non-banner group born time must fall within one of the ink-bearing segments' windows
      for (const g of sc.groups) {
        if (g.id === "banner") continue;
        const matchingSegIdx = cues!.findIndex((c, idx) => {
          const nextStart =
            idx + 1 < cues!.length ? cues![idx + 1].t0 : sc.dur;
          return g.born >= c.t0 + SAY_T0 - 0.02 && g.born <= nextStart + 0.02;
        });
        expect(matchingSegIdx).toBeGreaterThanOrEqual(0);
      }

      // Check that each segment with a write beat starts its first event at cue.t0 + SAY_T0
      rawScene.segments!.forEach((seg, segIdx) => {
        if (!seg.ink || seg.ink.length === 0) return;
        const cue = cues![segIdx];
        const nextCueT0 =
          segIdx + 1 < cues!.length ? cues![segIdx + 1].t0 : sc.dur;
        const writeBeat = seg.ink.find((b) => b.type === "write");
        if (writeBeat && writeBeat.type === "write") {
          const grp = sc.groups.find((g) => g.id !== "banner" && g.born >= cue.t0 - 0.02 && g.born < nextCueT0);
          expect(grp).toBeDefined();
          // If the segment started with an erase or newline before the write, the first event is at cue.t0 + SAY_T0
          if (seg.ink[0].type === "write") {
            expect(Math.abs(grp!.born - (cue.t0 + SAY_T0))).toBeLessThan(0.02);
          }
          // All strokes in the group finish before nextCueT0
          for (const st of grp!.strokes) {
            expect(st.t0 + st.dur).toBeLessThanOrEqual(nextCueT0 + 0.05);
          }
        }
      });
    });
  });

  test("4. PCM Silence Audit Gate: stitched WAV files have digital silence (RMS < 0.001) across every inter-segment gap", () => {
    const cacheDir = path.join(process.cwd(), "public", "audio", "cache");

    SAMPLE_GAUSSIAN_INTEGRAL.scenes.forEach((sc, sceneIdx) => {
      const key = sc.audio?.key;
      const cues = sc.audio?.segments;
      expect(key).toBeDefined();
      expect(cues).toBeDefined();

      const wavPath = path.join(cacheDir, `${key}.wav`);
      expect(fs.existsSync(wavPath)).toBe(true);

      const wav = fs.readFileSync(wavPath);
      expect(wav.subarray(0, 4).toString("ascii")).toBe("RIFF");
      const pcm = wav.subarray(WAV_HEADER_BYTES);

      for (let i = 0; i + 1 < cues!.length; i++) {
        const gapStart = cues![i].t1;
        const gapEnd = cues![i + 1].t0;
        const gapDur = gapEnd - gapStart;
        expect(gapDur).toBeGreaterThanOrEqual(0.24);

        const rms = rmsInWindow(pcm, gapStart + 0.01, gapEnd - 0.01);
        expect(rms).toBeLessThan(0.001);
      }

      // Scene 4 Segment 2 is the boxed final answer with pauseAfter: 2.0
      if (sceneIdx === 4) {
        const boxedGap = cues![3].t0 - cues![2].t1;
        expect(boxedGap).toBeCloseTo(2.0, 2);
      }
    });
  });

  test("5. Golden Flagship Ink-Reveal Gate: Scene 0 speak-ahead holds writing until Segment 1 cue", () => {
    const tl = compileTimeline(SAMPLE_GAUSSIAN_INTEGRAL);
    const sc0 = tl.scenes[0];
    const cues0 = SAMPLE_GAUSSIAN_INTEGRAL.scenes[0].audio!.segments!;

    // Segment 0 is speak_ahead [0, 23.721]: only banner is mounted at t=0, no formula groups born during [0, 23.721]
    const nonBannerGroups = sc0.groups.filter((g) => g.id !== "banner");
    expect(nonBannerGroups.length).toBe(1);
    expect(nonBannerGroups[0].born).toBeCloseTo(cues0[1].t0 + SAY_T0, 2);
    expect(nonBannerGroups[0].born).toBeGreaterThan(24.0);
  });
});
