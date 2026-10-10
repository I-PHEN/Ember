import { createHash } from "node:crypto";
import { normalizeVoice, TTS_MODEL, TEACHER_VOICE_STYLE } from "../ai/gemini";
import { speak } from "../tts-queue";
import { jobStore } from "./store";

interface AudioStore {
  readAudio(key: string): Promise<Buffer | null>;
  saveAudio(key: string, data: Buffer): Promise<void>;
}

export function audioKey(text: string, voice = "jam"): string {
  return createHash("sha256").update(JSON.stringify([
    "ember-audio-v2", voice, normalizeVoice(voice), TTS_MODEL, TEACHER_VOICE_STYLE, text,
  ])).digest("hex");
}

export async function ensureRecordedAudio(
  text: string, voice = "jam", store: AudioStore = jobStore, synthesize = speak,
  assignedKey = audioKey(text, voice),
): Promise<{ key: string; buffer: Buffer; ms: number; cached: boolean }> {
  if (!text.trim() || text.length > 1020) throw new Error("Narration must contain 1–1020 characters");
  const t0 = Date.now();
  const key = assignedKey;
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error("Invalid assigned audio identity");
  const existing = await store.readAudio(key);
  if (existing) return { key, buffer: existing, ms: Date.now() - t0, cached: true };
  const recorded = await synthesize(text, voice, 1);
  await store.saveAudio(key, recorded.buffer);
  // A competing caller may have stored the first immutable recording.
  const persisted = await store.readAudio(key);
  if (!persisted) throw new Error("Recorded audio was not persisted");
  return { key, buffer: persisted, ms: Date.now() - t0, cached: recorded.cached };
}
