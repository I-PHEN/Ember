import type { Timeline, Stroke } from "./types";

export interface SceneTimingMetric {
  sceneIndex: number;
  scheduledDurationMs: number;
  writeEndMs: number;
  audioDurationMs: number | null;
  /** End-of-ink minus audio duration; this is not phrase-level synchronization error. */
  writeVsAudioMs: number | null;
  strokeCount: number;
  medianInkPxPerSec: number | null;
}
export interface TimelineMetrics {
  scenes: SceneTimingMetric[];
  totalInkStrokes: number;
  medianInkPxPerSec: number | null;
  pendingAudioScenes: number;
}
function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 ? sorted[middle] : sorted[middle - 1] / 2 + sorted[middle] / 2;
  return Math.round(value * 10) / 10;
}
const ms = (seconds: number) => Number.isFinite(seconds) && seconds >= 0 ? Math.round(seconds * 1000) : 0;

export function measureTimeline(timeline: Timeline): TimelineMetrics {
  const seen = new Set<Stroke>();
  const allSpeeds: number[] = [];
  let pendingAudioScenes = 0;
  const scenes = timeline.scenes.map((scene, sceneIndex) => {
    const speeds: number[] = [];
    for (const stroke of scene.strokes) {
      if (seen.has(stroke)) continue;
      seen.add(stroke);
      if (stroke.kind !== "path" || stroke.glow || !Number.isFinite(stroke.len) ||
          stroke.len <= 0 || !Number.isFinite(stroke.dur) || stroke.dur <= 0) continue;
      const speed = stroke.len / stroke.dur;
      if (Number.isFinite(speed) && Number.isFinite(speed * 10)) speeds.push(speed);
    }
    allSpeeds.push(...speeds);
    const audioDurationMs = scene.audioDur !== undefined && Number.isFinite(scene.audioDur) && scene.audioDur > 0
      ? ms(scene.audioDur) : null;
    if (audioDurationMs === null && scene.narration.trim()) pendingAudioScenes++;
    const writeEndMs = ms(scene.writeEnd);
    return {
      sceneIndex, scheduledDurationMs: ms(scene.dur), writeEndMs, audioDurationMs,
      writeVsAudioMs: audioDurationMs === null ? null : writeEndMs - audioDurationMs,
      strokeCount: speeds.length, medianInkPxPerSec: median(speeds),
    };
  });
  return { scenes, totalInkStrokes: allSpeeds.length, medianInkPxPerSec: median(allSpeeds), pendingAudioScenes };
}

