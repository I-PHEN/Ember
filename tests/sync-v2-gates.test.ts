import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  SAMPLE_CALCULUS,
  SAMPLE_CUBIC_EXTREMA,
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
    { name: "SAMPLE_CUBIC_EXTREMA", script: SAMPLE_CUBIC_EXTREMA },
    { name: "SAMPLE_GAUSSIAN_INTEGRAL", script: SAMPLE_GAUSSIAN_INTEGRAL },
    { name: "SAMPLE_INCLINED_PLANE", script: SAMPLE_INCLINED_PLANE },
    { name: "SAMPLE_CALCULUS", script: SAMPLE_CALCULUS },
  ];

  const stitchedLessons = [
    SAMPLE_CUBIC_EXTREMA,
    SAMPLE_GAUSSIAN_INTEGRAL,
    SAMPLE_INCLINED_PLANE,
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

  test("3. Anchor Audit Gate: every segment in stitched lessons starts its ink at cue.t0 + SAY_T0 and finishes before nextCue.t0", () => {
    for (const script of stitchedLessons) {
      const tl = compileTimeline(script);

      tl.scenes.forEach((sc, sceneIdx) => {
        const rawScene = script.scenes[sceneIdx];
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
            const grp = sc.groups.find(
              (g) =>
                g.id !== "banner" &&
                g.born >= cue.t0 - 0.02 &&
                g.born < nextCueT0,
            );
            expect(grp).toBeDefined();
            if (seg.ink[0].type === "write") {
              expect(Math.abs(grp!.born - (cue.t0 + SAY_T0))).toBeLessThan(
                0.02,
              );
            }
            for (const st of grp!.strokes) {
              expect(st.t0 + st.dur).toBeLessThanOrEqual(nextCueT0 + 0.05);
            }
            const firstSt = grp!.strokes[0];
            const lastSt = grp!.strokes[grp!.strokes.length - 1];
            const span = lastSt.t0 + lastSt.dur - firstSt.t0;
            const totalLen = grp!.strokes.reduce(
              (a, s) => a + (s.kind === "path" ? s.len : 0),
              0,
            );
            expect(totalLen / Math.max(0.1, span)).toBeLessThanOrEqual(195);
          }
        });
      });
    }
  });

  test("4. PCM Silence & C2PA-Free Audit Gate: stitched WAV files have zero C2PA/inner-RIFF static and digital silence (RMS < 0.001) across every gap", () => {
    const cacheDir = path.join(process.cwd(), "public", "audio", "cache");

    for (const script of stitchedLessons) {
      script.scenes.forEach((sc) => {
        const key = sc.audio?.key;
        const cues = sc.audio?.segments;
        expect(key).toBeDefined();
        expect(cues).toBeDefined();

        const wavPath = path.join(cacheDir, `${key}.wav`);
        expect(fs.existsSync(wavPath)).toBe(true);

        const wav = fs.readFileSync(wavPath);
        expect(wav.subarray(0, 4).toString("ascii")).toBe("RIFF");
        expect(wav.includes(Buffer.from("C2PA"))).toBe(false);
        expect(wav.includes(Buffer.from("jumb"))).toBe(false);
        expect(wav.subarray(WAV_HEADER_BYTES).includes(Buffer.from("RIFF"))).toBe(false);
        const pcm = wav.subarray(WAV_HEADER_BYTES);

        for (let i = 0; i < cues!.length; i++) {
          const tailRms = rmsInWindow(pcm, Math.max(cues![i].t0, cues![i].t1 - 0.025), cues![i].t1);
          expect(tailRms).toBeLessThan(0.05);
        }

        for (let i = 0; i + 1 < cues!.length; i++) {
          const gapStart = cues![i].t1;
          const gapEnd = cues![i + 1].t0;
          const gapDur = gapEnd - gapStart;
          expect(gapDur).toBeGreaterThanOrEqual(0.24);

          const rms = rmsInWindow(pcm, gapStart + 0.01, gapEnd - 0.01);
          expect(rms).toBeLessThan(0.001);
        }
      });
    }

    // Gaussian Scene 4 Segment 2 is the boxed final answer with pauseAfter: 2.0
    const gCues = SAMPLE_GAUSSIAN_INTEGRAL.scenes[4].audio!.segments!;
    expect(gCues[3].t0 - gCues[2].t1).toBeCloseTo(2.0, 2);

    // Cubic Extrema Scene 3 has the boxed final answer with pauseAfter: 2.0
    const cCues = SAMPLE_CUBIC_EXTREMA.scenes[3].audio!.segments!;
    const cBoxIdx = SAMPLE_CUBIC_EXTREMA.scenes[3].segments!.findIndex(
      (s) => s.pauseAfter !== undefined
    );
    expect(cBoxIdx).toBeGreaterThanOrEqual(0);
    expect(cCues[cBoxIdx + 1].t0 - cCues[cBoxIdx].t1).toBeGreaterThanOrEqual(2.0);
  });

  test("5. Golden Flagship Ink-Reveal Gate: Scene 0 speak-ahead holds writing until Segment 1 cue", () => {
    for (const script of stitchedLessons) {
      const tl = compileTimeline(script);
      const sc0 = tl.scenes[0];
      const cues0 = script.scenes[0].audio!.segments!;

      // Segment 0 is speak_ahead: only banner is mounted at t=0, no formula/diagram groups born during Segment 0
      const nonBannerGroups = sc0.groups.filter((g) => g.id !== "banner");
      expect(nonBannerGroups.length).toBeGreaterThanOrEqual(1);
      expect(nonBannerGroups[0].born).toBeCloseTo(cues0[1].t0 + SAY_T0, 2);
      expect(nonBannerGroups[0].born).toBeGreaterThan(cues0[0].t1);
    }
  });

  test("6. 2-Line Caption & Silent-Gap Gate: every caption card is <= 84 chars (<=2 lines) and hides during silent writing gaps", async () => {
    const {
      captionAtTime,
      captionChunks,
      MAX_CAPTION_CHARS,
      CAPTION_TAIL_HOLD_SEC,
    } = await import("../src/components/player/SolvePlayer");

    for (const { script } of lessons) {
      for (const sc of script.scenes) {
        for (const seg of sc.segments ?? []) {
          const cards = captionChunks(seg.say);
          expect(cards.length).toBeGreaterThanOrEqual(1);
          for (const card of cards) {
            expect(card.length).toBeLessThanOrEqual(MAX_CAPTION_CHARS);
            if (cards.length > 1) {
              expect(card.length).toBeGreaterThanOrEqual(18);
            }
          }
        }
      }
    }

    const tl = compileTimeline(SAMPLE_GAUSSIAN_INTEGRAL);
    // Scene 0 Segment 0 is 418 chars -> splits into multiple <=84-char cards across [0, 23.721]
    const sc0 = tl.scenes[0];
    const firstCard = captionAtTime(sc0, 0.5);
    const midCard = captionAtTime(sc0, 12.0);
    const endCard = captionAtTime(sc0, 22.5);
    expect(firstCard).toBeDefined();
    expect(midCard).toBeDefined();
    expect(endCard).toBeDefined();
    expect(firstCard).not.toBe(midCard);
    expect(midCard).not.toBe(endCard);
    expect(firstCard!.length).toBeLessThanOrEqual(MAX_CAPTION_CHARS);
    expect(midCard!.length).toBeLessThanOrEqual(MAX_CAPTION_CHARS);
    expect(endCard!.length).toBeLessThanOrEqual(MAX_CAPTION_CHARS);

    // During silent writing gap after Segment 1 [31.527, 35.527], caption hides after CAPTION_TAIL_HOLD_SEC
    expect(captionAtTime(sc0, 31.527 + CAPTION_TAIL_HOLD_SEC + 0.1)).toBeNull();
    expect(captionAtTime(sc0, 33.5)).toBeNull();
  });

  test("7. 3-Phase Step Rhythm & Multi-Waypoint Deictic Pointer Gate: every scene emits term-to-term deictic waypoints with active point mode", async () => {
    const { computePen } = await import("../src/lib/video/render");
    const { THEMES, sceneStart } = await import("../src/lib/video/types");

    for (const script of stitchedLessons) {
      const tl = compileTimeline(script);
      for (let si = 0; si < tl.scenes.length; si++) {
        const sc = tl.scenes[si];
        const scStart = sceneStart(tl, si);
        for (const g of sc.groups) {
          if (g.id === "banner") continue;
          expect(g.waypoints).toBeDefined();
          expect(g.waypoints!.length).toBeGreaterThanOrEqual(1);
        }
        const deicticStrokes = sc.strokes.filter(
          (s) => s.kind === "path" && s.strokeTag === "deictic-point",
        );
        expect(deicticStrokes.length).toBeGreaterThanOrEqual(2);
        for (const ds of deicticStrokes) {
          if (ds.kind !== "path") continue;
          const pen = computePen(tl, scStart + ds.t0 + ds.dur * 0.5, THEMES.blackboard);
          expect(pen).not.toBeNull();
          expect(pen!.mode).toBe("point");
        }
      }
    }
  });
});
