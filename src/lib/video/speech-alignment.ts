import { matchSpeechAnchors, type PhraseTiming } from "./timing";
import type { SolveScene } from "./types";

/** Seconds in the original audio, before any player playback-rate adjustment. */
export interface WordTiming { text: string; start: number; end: number }
export type AlignmentStatus = "aligned" | "unavailable" | "invalid" | "timeout";
export interface SpeechAlignment {
  status: AlignmentStatus;
  words: WordTiming[];
  duration?: number;
  engine?: string;
}
const tokens = (text: string) => text.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

export function validateWordTiming(text: string, raw: unknown, duration: number): WordTiming[] | null {
  if (!Number.isFinite(duration) || duration <= 0 || duration > 1800 ||
      !Array.isArray(raw) || !raw.length || raw.length > 2048) return null;
  const words: WordTiming[] = [];
  let previousEnd = 0;
  for (const value of raw) {
    if (!value || typeof value !== "object" || typeof value.text !== "string" ||
        !tokens(value.text).length || typeof value.start !== "number" || typeof value.end !== "number" ||
        !Number.isFinite(value.start) || !Number.isFinite(value.end) || value.start < previousEnd ||
        value.end <= value.start || value.end > duration) return null;
    words.push({ text: value.text, start: value.start, end: value.end });
    previousEnd = value.end;
  }
  const expected = tokens(text);
  const actual = words.flatMap(w => tokens(w.text));
  if (actual.length !== expected.length || actual.some((token, i) => token !== expected[i])) return null;
  return words;
}

/** Exact boundary mapping only. A whole span may contain multiple lexical tokens,
 * but we never interpolate a time for a token inside that span. */
export function phrasesForScene(
  scene: SolveScene, sceneIndex: number, raw: unknown, rawDuration: number, playbackRate = 1,
): PhraseTiming[] | null {
  if (!Number.isFinite(playbackRate) || playbackRate <= 0) return null;
  const words = validateWordTiming(scene.narration, raw, rawDuration);
  if (!words) return null;
  const beats = scene.beats.map((beat, i) => ({
    id: `s${sceneIndex}b${i + 1}`, t0: i, t1: i + 1,
    say: "say" in beat ? beat.say : undefined,
  }));
  const anchors = matchSpeechAnchors(scene.narration, beats);
  if (!anchors.length || anchors.length !== beats.filter(b => b.say).length) return null;
  const starts = new Map<number, number>();
  const ends = new Map<number, number>();
  let index = 0;
  for (const word of words) {
    starts.set(index, word.start);
    index += tokens(word.text).length;
    ends.set(index, word.end);
  }
  const phrases: PhraseTiming[] = [];
  for (const anchor of anchors) {
    const start = starts.get(anchor.wordStart);
    const end = ends.get(anchor.wordEnd);
    if (start === undefined || end === undefined) return null;
    phrases.push({ id: anchor.id, start: start / playbackRate, end: end / playbackRate });
  }
  return phrases;
}

