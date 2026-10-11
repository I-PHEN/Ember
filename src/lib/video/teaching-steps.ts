import type { Beat, SolveScene } from "./types";

export type StepKind = "work" | "explain" | "ask";
export interface TeachingStep { narration: string; beats: Beat[]; kind: StepKind }

/** Board repairs may change ink, never the immutable recorded speech slices. */
export function preservesSpeechPartition(original: SolveScene, candidate: SolveScene): boolean {
  try {
    const partition = (scene: SolveScene) => planTeachingSteps(scene).map(({ narration, kind }) => ({ narration, kind }));
    return JSON.stringify(partition(original)) === JSON.stringify(partition(candidate));
  } catch { return false; }
}

const contentTypes = new Set(["write", "title", "fraction", "graph", "freebody", "numberline", "table"]);
const numberWords = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(" ");

function arithmeticKey(text:string):string|null {
  let key=text.toLowerCase();
  numberWords.forEach((word,n)=>{ key=key.replace(new RegExp(`\\b${word}\\b`,"g"),String(n)); });
  key=key.replace(/\bplus\b/g,"+").replace(/\bminus\b/g,"-").replace(/\btimes\b/g,"*").replace(/\bdivided by\b/g,"/").replace(/×/g,"*").replace(/÷/g,"/").replace(/\s+/g,"");
  return /^[\da-z+*/().^\-]+$/.test(key) ? key : null;
}

/** Narrow exact arithmetic safeguard; never fuzzy-match a mathematical question. */
export function validatePredictionOrder(steps:TeachingStep[]):void {
  const revealed=new Set<string>();
  for(const step of steps) {
    if(step.kind==="ask") {
      const question=step.narration.match(/what (?:is|does) (.+?)(?: equal)?\?/i)?.[1];
      const key=question ? arithmeticKey(question) : null;
      if(key && revealed.has(key)) throw new Error("Prediction answer was already revealed on the board");
    }
    for(const beat of step.beats) {
      if(beat.type!=="write" || !beat.text.includes("=")) continue;
      const key=arithmeticKey(beat.text.split("=")[0]);
      if(key) revealed.add(key);
    }
  }
}

/** Exact normalized words with raw offsets. No fuzzy or backwards matching. */
function words(text: string) {
  return [...text.matchAll(/[\p{L}\p{N}]+/gu)].map(m => ({ text: m[0].toLowerCase(), start: m.index!, end: m.index! + m[0].length }));
}

function anchorRange(text: string, phrase: string, from: number): [number, number] {
  const source = words(text), wanted = words(phrase);
  if (!wanted.length) throw new Error("Missing speech anchor");
  for (let i = 0; i <= source.length - wanted.length; i++) {
    if (source[i].start < from) continue;
    if (wanted.every((w, j) => w.text === source[i + j].text)) return [source[i].start, source[i + wanted.length - 1].end];
  }
  throw new Error("Speech anchor is missing or out of order");
}

/** Separate questions even when they follow an operation's spoken explanation. */
function addSpeech(out: TeachingStep[], text: string, beats: Beat[] = []) {
  let from = 0;
  let first = true;
  const add = (speech: string, kind?: StepKind) => {
    const narration = speech.trim();
    if (!narration) return;
    const ink = first && kind !== "ask" ? beats : [];
    out.push({ narration, beats: ink, kind: kind ?? (ink.length ? "work" : "explain") });
    first = false;
  };
  for (const match of text.matchAll(/[^.!?]*\?/g)) {
    add(text.slice(from, match.index));
    if (first && beats.length) throw new Error("A writing anchor cannot start with a question");
    add(match[0], "ask");
    from = match.index! + match[0].length;
  }
  add(text.slice(from));
}

/** A scene's authoring contract, independent of provider, DB or playback. */
export function planTeachingSteps(scene: SolveScene): TeachingStep[] {
  const narration = scene.narration.trim();
  if (!narration) throw new Error("A teaching step needs narration");
  const anchors: Array<{ start: number; end: number; beats: Beat[] }> = [];
  const opening: Beat[] = [];
  let cursor = 0;
  for (let beat of scene.beats) {
    if (beat.type === "title") {
      const text = beat.text.replace(/^(?:solve(?: for [a-z])?|find [a-z])\s*:\s*/i, "");
      // A chapter heading is metadata, not a compulsory board preamble.
      if (!/[=\d∫∑]/.test(text)) continue;
      beat = { type: "write", text, ...(beat.say ? { say: beat.say } : {}), ...(beat.color ? { color: beat.color } : {}) };
    }
    if (contentTypes.has(beat.type)) {
      const say = (beat as { say?: string }).say;
      if (!say) throw new Error("Every writing operation needs a speech anchor");
      if (say.includes("?")) throw new Error("A result-writing anchor cannot include a question");
      const [start, end] = anchorRange(narration, say, cursor);
      cursor = end;
      anchors.push({ start, end, beats: [...(anchors.length ? [] : opening), beat] });
    } else if (beat.type !== "underline") {
      (anchors.at(-1)?.beats ?? opening).push(beat);
    }
  }
  const out: TeachingStep[] = [];
  if (!anchors.length) addSpeech(out, narration);
  else {
    addSpeech(out, narration.slice(0, anchors[0].start));
    anchors.forEach((anchor, i) => {
      const end = anchors[i + 1]?.start ?? narration.length;
      addSpeech(out, narration.slice(anchor.start, end), anchor.beats);
    });
  }
  if (!out.length || out.length > 12) throw new Error("Teaching scene has an invalid step count");
  validatePredictionOrder(out);
  return out;
}
