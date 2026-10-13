import type { WordTiming } from "./types";

/**
 * Count syllables in an English word (heuristic based on vowel clusters).
 */
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w || w.length <= 2) return 1;

  // Common single-syllable word endings
  const cleaned = w
    .replace(/(?:[^laeiouy]|ed|es|e)$/, "")
    .replace(/^y/, "");

  const matches = cleaned.match(/[aeiouy]{1,2}/g);
  return Math.max(1, matches ? matches.length : 1);
}

/**
 * Parse standard WebVTT / SRT subtitle string into word timings.
 */
export function parseSubtitleTimings(subtitles: string): WordTiming[] {
  if (!subtitles.trim()) return [];
  const lines = subtitles.split(/\r?\n/);
  const out: WordTiming[] = [];

  const timeRegex =
    /(?:(\d{2}):)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(?:(\d{2}):)?(\d{2}):(\d{2})[.,](\d{3})/;

  let currentStart = 0;
  let currentEnd = 0;
  let hasTime = false;

  const toSeconds = (
    h: string | undefined,
    m: string,
    s: string,
    ms: string
  ): number => {
    const hours = h ? parseInt(h, 10) : 0;
    const mins = parseInt(m, 10);
    const secs = parseInt(s, 10);
    const millis = parseInt(ms, 10);
    return hours * 3600 + mins * 60 + secs + millis / 1000;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === "WEBVTT" || /^\d+$/.test(trimmed)) continue;

    const match = trimmed.match(timeRegex);
    if (match) {
      currentStart = toSeconds(match[1], match[2], match[3], match[4]);
      currentEnd = toSeconds(match[5], match[6], match[7], match[8]);
      hasTime = true;
      continue;
    }

    if (hasTime && trimmed) {
      const cleanLine = trimmed.replace(/<[^>]+>/g, ""); // strip cue tags
      const words = cleanLine.split(/\s+/).filter(Boolean);
      if (words.length) {
        const span = Math.max(0.05, currentEnd - currentStart);
        const wordDur = span / words.length;
        words.forEach((w, i) => {
          out.push({
            w,
            t0: Math.round((currentStart + i * wordDur) * 1000) / 1000,
            t1: Math.round((currentStart + (i + 1) * wordDur) * 1000) / 1000,
          });
        });
      }
      hasTime = false;
    }
  }

  return out;
}

/**
 * Generate syllable/pause-weighted word timestamps from narration text.
 * When totalDur is provided (from the real audio track), scales timestamps
 * so the sequence spans exactly from speech start to speech end.
 */
export function estimateWordTimings(
  narration: string,
  totalDur?: number
): WordTiming[] {
  const trimmed = narration.trim();
  if (!trimmed) return [];

  const rawWords = trimmed.split(/\s+/).filter(Boolean);
  if (!rawWords.length) return [];

  interface WordWeight {
    word: string;
    speechWeight: number;
    pauseAfter: number;
  }

  const weights: WordWeight[] = rawWords.map((word) => {
    const syl = countSyllables(word);
    const charLen = word.replace(/[^a-zA-Z0-9]/g, "").length;
    // Blend syllable weight (tempo) and character length
    const speechWeight = Math.max(0.12, syl * 0.16 + charLen * 0.02);

    let pauseAfter = 0.06; // standard inter-word gap
    if (/[.!?—]/.test(word)) {
      pauseAfter = 0.32; // sentence boundary pause
    } else if (/[,;:]/.test(word)) {
      pauseAfter = 0.18; // clause boundary pause
    }

    return { word, speechWeight, pauseAfter };
  });

  const sumSpeech = weights.reduce((acc, w) => acc + w.speechWeight, 0);
  const sumPause = weights.reduce((acc, w) => acc + w.pauseAfter, 0);
  const totalBase = sumSpeech + sumPause;

  // Speech padding
  const headMargin = 0.08;
  const targetDur =
    totalDur && totalDur > 0.5 ? Math.max(0.5, totalDur - headMargin) : totalBase;
  const scale = targetDur / totalBase;

  const result: WordTiming[] = [];
  let cur = headMargin;

  for (let i = 0; i < weights.length; i++) {
    const { word, speechWeight, pauseAfter } = weights[i];
    const dur = Math.max(0.04, speechWeight * scale);
    const pause = Math.max(0.02, pauseAfter * scale);

    const t0 = Math.round(cur * 1000) / 1000;
    const t1 = Math.round((cur + dur) * 1000) / 1000;
    result.push({ w: word, t0, t1 });

    cur = t1 + pause;
  }

  return result;
}

/**
 * Extract duration in seconds from a standard WAV (RIFF) buffer.
 */
export function getWavDuration(buffer: Buffer): number | null {
  if (buffer.length < 44) return null;
  if (buffer.toString("ascii", 0, 4) !== "RIFF") return null;
  if (buffer.toString("ascii", 8, 12) !== "WAVE") return null;

  // Search chunks for fmt and data
  let offset = 12;
  let byteRate = 0;
  let dataSize = 0;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    if (chunkId === "fmt " && chunkSize >= 16) {
      byteRate = buffer.readUInt32LE(offset + 16);
    } else if (chunkId === "data") {
      dataSize = chunkSize;
      break;
    }
    offset += 8 + chunkSize;
  }

  if (byteRate > 0 && dataSize > 0) {
    return Math.round((dataSize / byteRate) * 1000) / 1000;
  }

  return null;
}
