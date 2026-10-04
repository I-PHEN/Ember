import { expect, test } from "bun:test";
import { validateRecognizedTiming, recognizedPhrasesForScene } from "../src/lib/video/speech-alignment";
const words = [
  { text: "Now", start: 0, end: 0, probability: 0.9 },
  { text: "2x", start: 0.2, end: 0.8, probability: 0.9 },
  { text: "equals", start: 0.8, end: 1.1, probability: 0.9 },
  { text: "4", start: 1.1, end: 1.5, probability: 0.9 },
];
const scene = { chapter: "C", narration: "Now two x equals four", beats: [{ type: "write" as const, text: "2x=4", say: "two x equals four" }] };
test("recognition accepts narrow numeric equivalents without fabricated compound-word boundaries", () => {
  expect(validateRecognizedTiming(scene.narration, words, 2)).toEqual(words);
  expect(recognizedPhrasesForScene(scene, 0, words, 2)).toEqual([{ id: "s0b1", start: 0.2, end: 1.5 }]);
  expect(recognizedPhrasesForScene({ ...scene, beats: [{ ...scene.beats[0], say: "x equals four" }] }, 0, words, 2)).toBeNull();
});
test("recognition never accepts substitutions, omissions, homophones or malformed clocks", () => {
  for (const text of ["Now three x equals four", "two x equals four", "Now to x equals four", "Now two x equals for", "Now minus two x equals four"]) {
    expect(validateRecognizedTiming(text, words, 2)).toBeNull();
  }
  for (const bad of [{start: -1}, {end: 5}, {probability: NaN}, {probability: undefined}, {start: 0.9}, {end: -1}]) {
    expect(validateRecognizedTiming(scene.narration, words.map((w,i) => i === 1 ? {...w,...bad} : w), 2)).toBeNull();
  }
});
test("uncertainty inside an anchor fails closed, outside it does not; speed is applied once", () => {
  expect(recognizedPhrasesForScene(scene, 0, words.map((w,i) => i===1 ? {...w,probability:0.1} : w), 2)).toBeNull();
  expect(recognizedPhrasesForScene(scene, 0, words.map((w,i) => i===1 ? {...w,end:w.start} : w), 2)).toBeNull();
  expect(recognizedPhrasesForScene(scene, 0, words, 2, 2)).toEqual([{id:"s0b1",start:0.1,end:0.75}]);
  expect(recognizedPhrasesForScene(scene, 0, words, 2, 0)).toBeNull();
});
test("repeated recognized phrases map monotonically to their own intervals", () => {
  const repeated = {chapter:"C",narration:"row two then row two",beats:[{type:"write" as const,text:"2",say:"row two"},{type:"write" as const,text:"2",say:"row two"}]};
  const raw = ["row","2","then","row","2"].map((text,i)=>({text,start:i,end:i+0.5,probability:0.9}));
  expect(recognizedPhrasesForScene(repeated, 0, raw, 5)).toEqual([{id:"s0b1",start:0,end:1.5},{id:"s0b2",start:3,end:4.5}]);
});

test("numeric normalization never erases mathematical signs or operators", () => {
  for (const text of ["-2x", "+2x", "2/x", "2%x", "2^x", "$2x", "(2)x"]) {
    expect(validateRecognizedTiming("two x", [{text,start:0,end:1,probability:0.9}], 2)).toBeNull();
  }
  expect(validateRecognizedTiming("five x", [{text:".5x",start:0,end:1,probability:0.9}], 2)).toBeNull();
});

test("ratios, factorials and superscripts are not ordinary spoken number sequences", () => {
  for (const [narration, text] of [["two three","2:3"],["two three","2 : 3"],["five","5!"],["five","5 !"],["x two","x²"],["2.5 3.5","2.5:3.5"]]) {
    expect(validateRecognizedTiming(narration, [{text,start:0,end:1,probability:0.9}],2)).toBeNull();
  }
});
