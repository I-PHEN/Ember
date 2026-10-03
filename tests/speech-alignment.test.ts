import { expect, test } from "bun:test";
import { validateWordTiming, phrasesForScene } from "../src/lib/video/speech-alignment";
const text = "Row two then row two.";
const words = [
  { text: "Row", start: 0.1, end: 0.3 }, { text: "two", start: 0.3, end: 0.7 },
  { text: "then", start: 1, end: 1.2 }, { text: "row", start: 1.4, end: 1.6 }, { text: "two.", start: 1.6, end: 2 },
];
test("validates full transcript and maps repeated phrases to distinct measured intervals", () => {
  expect(validateWordTiming(text, words, 2.5)).toEqual(words);
  const scene = { chapter: "C", narration: text, beats: [{ type: "write" as const, text: "2", say: "row two" }, { type: "write" as const, text: "2", say: "row two" }] };
  expect(phrasesForScene(scene, 0, words, 2.5)).toEqual([
    { id: "s0b1", start: 0.1, end: 0.7 }, { id: "s0b2", start: 1.4, end: 2 },
  ]);
});
test("rejects omissions, substitutions, overlaps and audio overrun", () => {
  expect(validateWordTiming(text, words.slice(1), 2.5)).toBeNull();
  expect(validateWordTiming("Row three then row two", words, 2.5)).toBeNull();
  expect(validateWordTiming(text, words.map((w,i) => i === 2 ? { ...w, start: 0.2 } : w), 2.5)).toBeNull();
  expect(validateWordTiming(text, words, 1)).toBeNull();
  expect(validateWordTiming(text, [{ text, start: NaN, end: 1 }], 2)).toBeNull();
});
test("does not invent word-level timing inside compound spans", () => {
  const scene = { chapter: "C", narration: "two by three", beats: [{ type: "write" as const, text: "3", say: "three" }] };
  expect(phrasesForScene(scene, 0, [{ text: "two by three", start: 0, end: 2 }], 2.5)).toBeNull();
});
test("missing authored anchors fail closed and playback speed rescales measured times", () => {
  const scene = { chapter: "C", narration: text, beats: [{ type: "write" as const, text: "2", say: "row two" }] };
  expect(phrasesForScene(scene, 0, words, 2.5, 2)).toEqual([{ id: "s0b1", start: 0.05, end: 0.35 }]);
  scene.beats[0].say = "missing";
  expect(phrasesForScene(scene, 0, words, 2.5)).toBeNull();
});

