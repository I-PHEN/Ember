/* ------------------------------------------------------------------
   Segment-stitched scene audio (spec §6). Per-segment TTS PCM —
   already loudness-normalized per segment — is concatenated with
   EXPLICIT silence gaps (sized by mode / pen deficit / author hint)
   into ONE WAV per scene, plus a cue manifest the compiler and
   captions anchor against. Pure and deterministic; the Phase 2
   pipeline drives it.
------------------------------------------------------------------- */

import { pcmToWav } from "../ai/gemini";
import type { AudioSegmentCue, SegmentMode } from "./types";

export const SAMPLE_RATE = 24000; // 16-bit signed LE mono — the TTS contract

export function pcmDurationSec(pcm: Buffer): number {
  return pcm.length / 2 / SAMPLE_RATE;
}

export function silenceSec(sec: number): Buffer {
  return Buffer.alloc(Math.max(0, Math.round(sec * SAMPLE_RATE * 2)));
}

/** scale a segment's active speech RMS (with soft-knee peak limiting) so
 *  independently synthesized sentences sit at one uniform vocal loudness */
export function loudnessNormalize(pcm: Buffer, targetPeak = 26000): Buffer {
  let peak = 0;
  let activeSumSq = 0;
  let activeCnt = 0;
  for (let i = 0; i + 1 < pcm.length; i += 2) {
    const v = Math.abs(pcm.readInt16LE(i));
    if (v > peak) peak = v;
    if (v > 300) {
      activeSumSq += v * v;
      activeCnt++;
    }
  }
  if (peak < 100) return pcm; // silence — nothing to normalize

  const targetActiveRms = 4400;
  const rawScale =
    activeCnt >= 100
      ? targetActiveRms / Math.sqrt(activeSumSq / activeCnt)
      : targetPeak / peak;
  const scale = Math.min(4.0, Math.max(0.25, rawScale));
  if (Math.abs(scale - 1) < 0.02 && peak * scale <= 29000) return pcm;

  const out = Buffer.alloc(pcm.length);
  for (let i = 0; i + 1 < pcm.length; i += 2) {
    const raw = pcm.readInt16LE(i) * scale;
    const abs = Math.abs(raw);
    const limited =
      abs <= 24000
        ? raw
        : Math.sign(raw) * (24000 + 6000 * Math.tanh((abs - 24000) / 6000));
    out.writeInt16LE(
      Math.max(-32768, Math.min(32767, Math.round(limited))),
      i
    );
  }
  return out;
}

const GAP_DEFAULTS: Record<SegmentMode, number> = {
  speak_ahead: 0.35,
  parallel: 0.35,
  point: 0.6,
  write_ahead: 0.9,
  pause: 0.9,
};

/** gap AFTER a segment = max(mode default, pen deficit, author hint),
 *  clamped to the spec band. penDeficit = how much longer the calibrated
 *  pen needs for this segment's ink than its measured speech lasts. */
export function gapSeconds(opts: {
  mode?: SegmentMode;
  penDeficit?: number;
  pauseAfter?: number;
}): number {
  const base = Math.max(
    opts.mode ? GAP_DEFAULTS[opts.mode] : GAP_DEFAULTS.parallel,
    opts.penDeficit ?? 0,
    opts.pauseAfter ?? 0
  );
  return Math.round(Math.min(4.0, Math.max(0.25, base)) * 100) / 100;
}

export interface StitchResult {
  wav: Buffer;
  cues: AudioSegmentCue[];
  totalSec: number;
}

/** stitch segment PCMs + inter-segment gaps (+ optional trailing tail)
 *  into one WAV; cues are WAV-relative and cover the gaps layout. */
export function stitchScene(
  segments: Buffer[],
  gapsSec: number[],
  tailSec = 0
): StitchResult {
  if (!segments.length) throw new Error("stitchScene: no segments");
  if (gapsSec.length !== segments.length - 1) {
    throw new Error(
      `stitchScene: expected ${segments.length - 1} gaps, got ${gapsSec.length}`
    );
  }
  const cues: AudioSegmentCue[] = [];
  const parts: Buffer[] = [];
  let t = 0;
  segments.forEach((pcm, i) => {
    const dur = pcmDurationSec(pcm);
    cues.push({ i, t0: round3(t), t1: round3(t + dur) });
    parts.push(pcm);
    t += dur;
    if (i < gapsSec.length && gapsSec[i] > 0) {
      parts.push(silenceSec(gapsSec[i]));
      t += gapsSec[i];
    }
  });
  if (tailSec > 0) {
    parts.push(silenceSec(tailSec));
    t += tailSec;
  }
  return {
    wav: pcmToWav(Buffer.concat(parts), SAMPLE_RATE),
    cues,
    totalSec: round3(t),
  };
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
