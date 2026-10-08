import type { Timeline } from "./types";

export function timingWarning(timeline: Timeline): string | null {
  const warnings = timeline.scenes.flatMap((scene, index) => {
    if (scene.timing?.feasibility !== "needs-revision") return [];
    const details = scene.timing.issues.map(issue => issue.kind === "overflow"
      ? `${issue.beatId}: ${(issue.seconds ?? 0).toFixed(1)}s over speech window`
      : `${issue.beatId}: missing speech anchor`).join("; ");
    return [`Scene ${index + 1} (${scene.chapter}): ${details}`];
  });
  return warnings.length ? `Timing needs revision — ${warnings.join(" · ")}` : null;
}
