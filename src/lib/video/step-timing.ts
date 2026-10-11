import type { StepKind } from "./teaching-steps";

/** Real audio is the clock. Never fit readable ink by speeding it up. */
export function stepTiming(naturalWriteEnd: number, rawAudioDuration: number, kind: StepKind, wordCount = 0) {
  if (!Number.isFinite(naturalWriteEnd) || naturalWriteEnd < 0 || !Number.isFinite(rawAudioDuration) || rawAudioDuration <= 0) throw new Error("Invalid measured step timing");
  const speechRate = Math.min(.9, rawAudioDuration / Math.max(.08, naturalWriteEnd, wordCount * .5));
  if (speechRate < .65) throw new Error("Speech is too short for readable writing; split or rewrite this teaching step");
  return { speechRate, duration: rawAudioDuration / speechRate + (kind === "ask" ? .6 : .15) };
}
