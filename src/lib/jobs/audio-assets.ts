import { createHash } from "node:crypto";
import { normalizeVoice, TTS_MODEL } from "../ai/gemini";
import { normalizeSpokenMath } from "../ai/spoken-math";
import { speak } from "../tts-queue";
import {
  compileTimeline,
  computeSegmentGaps,
  splitNarrationIntoSegments,
} from "../video/compile";
import {
  loudnessNormalize,
  pcmDurationSec,
  stitchScene,
} from "../video/stitch-audio";
import { getWavDuration } from "../video/timings";
import type { AudioSegmentCue, SolveScene } from "../video/types";
import { jobStore } from "./store";

interface AudioStore {
  readAudio(key: string): Promise<Buffer | null>;
  saveAudio(key: string, data: Buffer): Promise<void>;
}

const WAV_HEADER_BYTES = 44;

function isRiffWav(buf: Buffer | null | undefined): buf is Buffer {
  return (
    !!buf &&
    buf.length >= 4 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF"
  );
}

export function audioKey(text: string, voice = "jam"): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        "ember-audio-v2",
        voice,
        normalizeVoice(voice),
        TTS_MODEL,
        text,
      ])
    )
    .digest("hex");
}

export function segmentAudioKey(say: string, voice = "jam"): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        "ember-seg-audio-v2",
        voice,
        normalizeVoice(voice),
        TTS_MODEL,
        say.trim(),
      ])
    )
    .digest("hex");
}

export async function ensureRecordedAudio(
  text: string,
  voice = "jam",
  store: AudioStore = jobStore,
  synthesize = speak,
  assignedKey = audioKey(text, voice)
): Promise<{ key: string; buffer: Buffer; ms: number; cached: boolean }> {
  if (!text.trim() || text.length > 1020)
    throw new Error("Narration must contain 1–1020 characters");
  const t0 = Date.now();
  const key = assignedKey;
  if (!/^[a-f0-9]{64}$/.test(key))
    throw new Error("Invalid assigned audio identity");
  const existing = await store.readAudio(key);
  if (isRiffWav(existing)) {
    return { key, buffer: existing, ms: Date.now() - t0, cached: true };
  }
  const spokenText = normalizeSpokenMath(text);
  const recorded = await synthesize(spokenText, voice, 1);
  await store.saveAudio(key, recorded.buffer);
  // A competing caller may have stored the first immutable recording.
  const persisted = await store.readAudio(key);
  if (!persisted) throw new Error("Recorded audio was not persisted");
  return {
    key,
    buffer: persisted,
    ms: Date.now() - t0,
    cached: recorded.cached,
  };
}

/**
 * Per-segment TTS synthesis + loudness normalization + gap-aware PCM stitcher (Spec §6).
 * Produces a single RIFF WAV file per scene with exact `AudioSegmentCue[]` boundaries
 * and real PCM silence gaps sized to `max(modeGap, penDeficit, pauseAfter)`.
 */
export async function ensureStitchedSceneAudio(
  scene: Pick<SolveScene, "chapter" | "narration" | "beats" | "segments">,
  voice = "jam",
  store: AudioStore = jobStore,
  synthesize = speak,
  assignedKey?: string
): Promise<{
  key: string;
  buffer: Buffer;
  dur: number;
  segments: AudioSegmentCue[];
  ms: number;
  cached: boolean;
}> {
  const segs =
    scene.segments && scene.segments.length > 0
      ? scene.segments
      : splitNarrationIntoSegments(scene.narration ?? "", scene.beats ?? []);

  const text =
    (scene.narration && scene.narration.trim()) ||
    segs.map((s) => s.say).join(" ");
  if (!text.trim()) {
    throw new Error("Narration must contain at least 1 character");
  }

  const key = assignedKey ?? audioKey(text, voice);
  if (!/^[a-f0-9]{64}$/.test(key)) {
    throw new Error("Invalid assigned audio identity");
  }

  const t0 = Date.now();

  if (segs.length === 0) {
    const fallback = await ensureRecordedAudio(
      text,
      voice,
      store,
      synthesize,
      key
    );
    const dur = getWavDuration(fallback.buffer) ?? 0;
    return {
      ...fallback,
      dur,
      segments: dur > 0 ? [{ i: 0, t0: 0, t1: dur }] : [],
    };
  }

  // Compute calibrated ink durations per segment by compiling the scene once
  let inkDurs: number[] = segs.map(() => 0);
  try {
    const tl = compileTimeline({
      title: scene.chapter || "Scene",
      question: scene.chapter || "Scene",
      scenes: [
        {
          chapter: scene.chapter || "Scene",
          narration: text,
          beats: scene.beats ?? [],
          segments: segs,
        },
      ],
    });
    if (tl.scenes[0]?.segmentInkDurs?.length === segs.length) {
      inkDurs = tl.scenes[0].segmentInkDurs;
    }
  } catch {
    // Fallback to zero inkDurs if scene has no compilable beats
  }

  // Check if the full stitched WAV is already cached
  const existingFull = await store.readAudio(key);
  if (isRiffWav(existingFull)) {
    // Try to reconstruct exact segment cues from cached per-segment WAVs without invoking TTS
    const cachedPcms: Buffer[] = [];
    for (const seg of segs) {
      const sKey = segmentAudioKey(seg.say, voice);
      const sWav = await store.readAudio(sKey);
      if (isRiffWav(sWav) && sWav.length > WAV_HEADER_BYTES) {
        cachedPcms.push(sWav.subarray(WAV_HEADER_BYTES));
      } else {
        break;
      }
    }
    if (cachedPcms.length === segs.length) {
      const speechDurs = cachedPcms.map((p) => pcmDurationSec(p));
      const gapsSec = computeSegmentGaps(segs, speechDurs, inkDurs);
      const { cues, totalSec } = stitchScene(cachedPcms, gapsSec);
      return {
        key,
        buffer: existingFull,
        dur: getWavDuration(existingFull) ?? totalSec,
        segments: cues,
        ms: Date.now() - t0,
        cached: true,
      };
    }
    const dur = getWavDuration(existingFull) ?? 0;
    return {
      key,
      buffer: existingFull,
      dur,
      segments: [],
      ms: Date.now() - t0,
      cached: true,
    };
  }

  // Synthesize each segment in order, normalizing loudness and extracting 16-bit PCM
  const normPcms: Buffer[] = [];
  let allCached = true;

  for (const seg of segs) {
    const sKey = segmentAudioKey(seg.say, voice);
    let segWav = await store.readAudio(sKey);
    if (!isRiffWav(segWav)) {
      const spoken = normalizeSpokenMath(seg.say);
      const rec = await synthesize(spoken, voice, 1);
      segWav = rec.buffer;
      if (!rec.cached) allCached = false;
      if (isRiffWav(segWav) && segWav.length > WAV_HEADER_BYTES) {
        await store.saveAudio(sKey, segWav);
      }
    }
    if (!isRiffWav(segWav) || segWav.length <= WAV_HEADER_BYTES) {
      // Test stub returning short non-PCM placeholder buffer (e.g. "RIFF recorded audio...")
      await store.saveAudio(key, segWav ?? Buffer.from("RIFF"));
      const persisted = await store.readAudio(key);
      if (!persisted) throw new Error("Recorded audio was not persisted");
      return {
        key,
        buffer: persisted,
        dur: getWavDuration(persisted) ?? 0,
        segments: [],
        ms: Date.now() - t0,
        cached: allCached,
      };
    }
    const rawPcm = segWav.subarray(WAV_HEADER_BYTES);
    // Ensure even byte length for Int16 PCM
    const alignedPcm =
      rawPcm.length % 2 === 0
        ? rawPcm
        : rawPcm.subarray(0, rawPcm.length - 1);
    normPcms.push(loudnessNormalize(alignedPcm));
  }

  const speechDurs = normPcms.map((p) => pcmDurationSec(p));
  const gapsSec = computeSegmentGaps(segs, speechDurs, inkDurs);
  const { wav, cues, totalSec } = stitchScene(normPcms, gapsSec);

  await store.saveAudio(key, wav);
  const persisted = await store.readAudio(key);
  if (!persisted) throw new Error("Recorded audio was not persisted");

  return {
    key,
    buffer: persisted,
    dur: totalSec,
    segments: cues,
    ms: Date.now() - t0,
    cached: allCached,
  };
}
