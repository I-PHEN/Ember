import { compileTimeline } from "../../src/lib/video/compile";
import type { SolveScript } from "../../src/lib/video/types";

export const FILM_DURATION = 52;
export const scenes = [
  { scene: "question", start: 0, end: 4 },
  { scene: "brand", start: 4, end: 8 },
  { scene: "composer", start: 8, end: 14 },
  { scene: "lesson", start: 14, end: 28 },
  { scene: "revisit", start: 28, end: 35 },
  { scene: "office", start: 35, end: 43 },
  { scene: "gallery", start: 43, end: 48 },
  { scene: "close", start: 48, end: 52 },
] as const;

export function getFilmState(seconds: number) {
  const time = Number.isFinite(seconds) ? Math.max(0, Math.min(52, seconds)) : 0;
  const shot = scenes.find(s => time < s.end) ?? scenes[scenes.length - 1];
  return { scene: shot.scene, local: time - shot.start, duration: shot.end - shot.start, time };
}

export const showcase: SolveScript = {
  title: "Solving a linear equation", subject: "Algebra", question: "Solve x + 2 = 5",
  scenes: [
    { chapter: "Start with the equation", narration: "", beats: [{ type: "write", text: "x + 2 = 5", size: "lg", x: .5, y: .26, align: "center" }] },
    { chapter: "Subtract 2 from both sides", narration: "", beats: [{ type: "write", text: "x + 2 - 2 = 5 - 2", size: "lg", x: .5, y: .48, align: "center", color: "orange" }] },
    { chapter: "Read the solution", narration: "", beats: [{ type: "write", text: "x = 3", size: "lg", x: .5, y: .70, align: "center" }] },
  ],
};
export const showcaseTimeline = compileTimeline(showcase);
