import { sceneStart, totalDuration, type Timeline } from "./types";

/**
 * Select a stable frame from the first lesson scene. Brand bumpers are
 * intentionally ignored so a card previews the problem the viewer will learn.
 */
export function thumbnailTime(timeline: Timeline): number {
  const sceneIndex = timeline.scenes.findIndex((scene) => !scene.intro);
  if (sceneIndex < 0) return Math.max(0, totalDuration(timeline) * 0.5);

  const scene = timeline.scenes[sceneIndex];
  const firstErase = scene.erases.reduce(
    (earliest, erase) => Math.min(earliest, erase.at),
    Number.POSITIVE_INFINITY
  );
  const latestVisibleMoment = Math.min(
    scene.writeEnd + 0.55,
    firstErase - 0.35,
    scene.dur - 0.35
  );
  const sceneMoment = Math.max(scene.head + 0.35, latestVisibleMoment);

  return sceneStart(timeline, sceneIndex) + sceneMoment;
}
