import { sceneStart, type Timeline } from "./types";

export type Chapter = { sceneIndex: number; t: number; label: string };

/** Detached values from the player's current (possibly retimed) timeline. */
export function chapterSnapshot(tl: Timeline): Chapter[] {
  const chapters: Chapter[] = [];
  let t = 0;
  tl.scenes.forEach((scene, sceneIndex) => {
    if (!scene.intro) chapters.push({ sceneIndex, t, label: scene.chapter });
    t += scene.dur;
  });
  return chapters;
}

export function chapterSeekTime(tl: Timeline, sceneIndex: number): number | null {
  if (!Number.isInteger(sceneIndex) || sceneIndex < 0 || sceneIndex >= tl.scenes.length) return null;
  return sceneStart(tl, sceneIndex) + Math.min(0.01, tl.scenes[sceneIndex].dur / 2);
}
