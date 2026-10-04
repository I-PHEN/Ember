import { matchSpeechAnchors, type PhraseTiming } from "./timing";
import type { SolveScene } from "./types";

/** Seconds in the original audio, before any player playback-rate adjustment. */
export interface WordTiming { text: string; start: number; end: number }
export type AlignmentStatus = "aligned" | "recognized" | "unavailable" | "invalid" | "timeout";
export interface SpeechAlignment {
  status: AlignmentStatus;
  words: WordTiming[];
  duration?: number;
  engine?: string;
}
const tokens = (text: string) => text.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

export interface RecognizedWord extends WordTiming { probability: number }
const numberNames = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(" ");
// Narrow English equivalences only. No homophones, fuzzy matching or decimal
// expansion. A compound provider span such as 2x retains its original boundaries.
// NFC preserves superscripts. Numeric colons are mathematical, unlike prose
// colons ("Remember:"); exclamation marks are retained because they can be factorials.
const speechTokens = (text: string) => (text.normalize("NFC").toLowerCase()
  .replace(/(?<=\d)\s*:\s*(?=\d)/gu, "∶")
  .match(/\d+(?:\.\d+)?|\.\d+|[\p{L}]+|[^\s.,?;:'"“”‘’]/gu) ?? [])
  .map(token => numberNames.includes(token) ? String(numberNames.indexOf(token)) : token);

/** Recognized candidates are not certified whole-track alignment. Zero-length
 * and low-probability words remain visible for phrase-level rejection. */
export function validateRecognizedTiming(text: string, raw: unknown, duration: number): RecognizedWord[] | null {
  if (!Number.isFinite(duration) || duration <= 0 || duration > 1800 || !Array.isArray(raw) || !raw.length || raw.length > 2048) return null;
  const result: RecognizedWord[] = [];
  let end = 0;
  for (const word of raw) {
    if (!word || typeof word.text !== "string" || !speechTokens(word.text).length ||
        typeof word.start !== "number" || typeof word.end !== "number" ||
        !Number.isFinite(word.start) || !Number.isFinite(word.end) || word.start < end ||
        word.end < word.start || word.end > duration || typeof word.probability !== "number" ||
        !Number.isFinite(word.probability) || word.probability < 0 || word.probability > 1) return null;
    result.push({text:word.text,start:word.start,end:word.end,probability:word.probability});
    end = word.end;
  }
  const expected = speechTokens(text);
  const actual = result.flatMap(word => speechTokens(word.text));
  if (!expected.length || expected.length !== actual.length || expected.some((token,i) => token !== actual[i])) return null;
  return result;
}

export function recognizedPhrasesForScene(scene: SolveScene, sceneIndex: number, raw: unknown, duration: number, playbackRate = 1): PhraseTiming[] | null {
  if (!Number.isFinite(playbackRate) || playbackRate <= 0) return null;
  const words = validateRecognizedTiming(scene.narration, raw, duration);
  if (!words) return null;
  const transcript = speechTokens(scene.narration);
  const spans: {word: RecognizedWord; first: number; last: number}[] = [];
  let position = 0;
  for (const word of words) {
    const first = position;
    position += speechTokens(word.text).length;
    spans.push({word,first,last:position});
  }
  let cursor = 0;
  const phrases: PhraseTiming[] = [];
  for (const [index, beat] of scene.beats.entries()) {
    if (!("say" in beat) || !beat.say) continue;
    const phrase = speechTokens(beat.say);
    if (!phrase.length) return null;
    let first = -1;
    for (let i = cursor; i <= transcript.length - phrase.length; i++) {
      if (phrase.every((token,j) => token === transcript[i+j])) { first = i; break; }
    }
    if (first < 0) return null;
    const last = first + phrase.length;
    const selected = spans.filter(span => span.first < last && span.last > first);
    if (!selected.length || selected[0].first !== first || selected.at(-1)!.last !== last ||
        selected.some(({word}) => word.end <= word.start || word.probability < 0.15)) return null;
    phrases.push({id:`s${sceneIndex}b${index+1}`,start:selected[0].word.start/playbackRate,end:selected.at(-1)!.word.end/playbackRate});
    cursor = last;
  }
  return phrases.length ? phrases : null;
}

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

