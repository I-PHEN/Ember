/* Modality adherence, measurable: how much of the board's text is
   duplicated in the narration (Mayer's redundancy principle). Target
   is a LOW number — the board is a skeleton, not a transcript. */

import type { SolveScript } from "./types";

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "to", "of", "in", "on", "at", "for", "with", "and", "or", "but", "so",
  "we", "our", "you", "your", "it", "its", "this", "that", "these",
  "those", "as", "by", "from", "if", "then", "than", "will", "can",
  "do", "does", "did", "have", "has", "had", "not", "no", "here",
]);

export function contentWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

export function contentWordOverlap(beatTexts: string[], narration: string): number {
  const board = new Set(beatTexts.flatMap(contentWords));
  const spoken = new Set(contentWords(narration));
  if (!board.size || !spoken.size) return 0;
  let shared = 0;
  for (const w of board) if (spoken.has(w)) shared += 1;
  return shared / (board.size + spoken.size - shared); // Jaccard
}

export function scriptOverlap(script: SolveScript): number {
  if (!script.scenes.length) return 0;
  let total = 0;
  let weight = 0;
  for (const scene of script.scenes) {
    const texts = scene.beats
      .filter((b) => b.type === "write" || b.type === "title" || b.type === "fraction")
      .map((b) => ("text" in b ? String(b.text) : ""))
      .filter(Boolean);
    const w = Math.max(1, texts.length);
    total += contentWordOverlap(texts, scene.narration) * w;
    weight += w;
  }
  return weight ? total / weight : 0;
}
