import { sceneStart, totalDuration, type Timeline } from "./types";

/**
 * Selects an optimal, visually compelling settled frame for video thumbnails
 * according to the Whiteboard Thumbnail Blueprint:
 * 1. Prioritizes scenes containing rich geometric/vector diagrams (e.g. Free-Body Diagrams).
 * 2. Prioritizes scenes with climax derivations or boxed final answers.
 * 3. Bypasses sparse introductory frames where the board is mostly empty.
 * 4. Samples the settled moment right after writing completes, before board erase.
 */
export function thumbnailTime(timeline: Timeline): number {
  if (!timeline.scenes || timeline.scenes.length === 0) return 0;

  const nonIntro = timeline.scenes
    .map((scene, idx) => ({ scene, idx }))
    .filter(({ scene }) => !scene.intro);

  if (nonIntro.length === 0) return Math.max(0, totalDuration(timeline) * 0.5);

  let bestIdx = nonIntro[0].idx;
  let highestScore = -10000;

  for (const { scene, idx } of nonIntro) {
    // Exclude banner strokes from scoring (banner is pre-mounted at t=0 in scene 0)
    const contentStrokes = scene.strokes.filter(
      (s) => !(idx === 0 && s.t0 <= 0.06 && s.dur <= 0.1)
    );

    let score = contentStrokes.length * 2;

    // Detect if scene has geometric diagrams or freebody force vectors
    const hasDiagram = scene.groups.some(
      (g) =>
        g.text &&
        (g.text.toLowerCase().includes("freebody") ||
          g.text.toLowerCase().includes("diagram") ||
          g.text.toLowerCase().includes("graph"))
    );
    if (hasDiagram) score += 600;

    // Detect if scene contains boxed results or emphasized theorem statements
    const hasBox = scene.groups.some(
      (g) => g.id.includes("box") || (g.text && g.text.toLowerCase().includes("box"))
    );
    if (hasBox) score += 200;

    // Penalize Scene 0 so we prefer the climax derivation or diagram over early introductory notes
    if (idx === 0) {
      score -= 150;
    }

    if (score > highestScore) {
      highestScore = score;
      bestIdx = idx;
    }
  }

  const bestScene = timeline.scenes[bestIdx];
  const firstErase = bestScene.erases.reduce(
    (earliest, erase) => Math.min(earliest, erase.at),
    Number.POSITIVE_INFINITY
  );
  const latestVisibleMoment = Math.min(
    bestScene.writeEnd + 0.45,
    firstErase - 0.35,
    bestScene.dur - 0.35
  );
  const sceneMoment = Math.max(bestScene.head + 0.35, latestVisibleMoment);

  return sceneStart(timeline, bestIdx) + sceneMoment;
}
