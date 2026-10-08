import type { Timeline, SceneTime, Stroke, Group, EraseSweep, StrokeMove } from "./types";
import { compileBeatTiming, mapTimingTime, type BeatTiming, type VoiceTiming } from "./timing";

interface Baseline {
  beats: BeatTiming[];
  strokes: { target: Stroke; t0: number; dur: number; travel?: { t0: number; dur: number } }[];
  groups: { target: Group; born: number }[];
  erases: { target: EraseSweep; at: number }[];
  erased: { target: Stroke; at: number }[];
  moves: { target: StrokeMove; at: number }[];
}
const baselines = new WeakMap<SceneTime, Baseline>();

/** Capture once after ALL scenes exist, before any timing is applied.
 * Future erasures/slides can be stored on earlier scenes' strokes. */
export function captureTimelineTiming(timeline: Timeline, marks: BeatTiming[][]): void {
  const allStrokes = new Set(timeline.scenes.flatMap(scene => scene.strokes));
  timeline.scenes.forEach((scene, index) => {
    baselines.set(scene, {
      beats: marks[index].map(b => ({ ...b, spans: b.spans?.map(s => ({ ...s })) })),
      strokes: scene.strokes.map(target => ({ target, t0: target.t0, dur: target.dur,
        travel: target.kind === "path" && target.travel ? { ...target.travel } : undefined })),
      groups: scene.groups.map(target => ({ target, born: target.born })),
      erases: scene.erases.map(target => ({ target, at: target.at })),
      erased: [...allStrokes].filter(st => st.eraseScene === index && st.eraseAt !== undefined)
        .map(target => ({ target, at: target.eraseAt! })),
      moves: [...allStrokes].flatMap(st => (st.moves ?? []).filter(m => m.scene === index)
        .map(target => ({ target, at: target.at }))),
    });
  });
}

/** Rebuild every scene-relative clock from immutable source values.
 * Once a scene has played/been committed by seeking, not even duration can change. */
export function applySceneTiming(scene: SceneTime, voice: VoiceTiming): boolean {
  if (scene.locked || !Number.isFinite(voice.duration) || voice.duration <= 0) return false;
  const base = baselines.get(scene);
  if (!base) return false;
  let plan;
  try { plan = compileBeatTiming(base.beats, scene.narration, voice); }
  catch { return false; }
  for (const { target, t0, dur, travel } of base.strokes) {
    target.t0 = mapTimingTime(plan, t0);
    target.dur = Math.max(0, mapTimingTime(plan, t0 + dur, "end") - target.t0);
    if (target.kind === "path" && travel) {
      const start = mapTimingTime(plan, travel.t0);
      target.travel = { t0: start, dur: travel.dur === 0 ? 0 : Math.max(0, mapTimingTime(plan, travel.t0 + travel.dur, "end") - start) };
    }
  }
  for (const { target, born } of base.groups) target.born = mapTimingTime(plan, born);
  for (const { target, at } of base.erases) target.at = mapTimingTime(plan, at);
  for (const { target, at } of base.erased) target.eraseAt = mapTimingTime(plan, at);
  for (const { target, at } of base.moves) target.at = mapTimingTime(plan, at);
  scene.writeEnd = plan.writeEnd;
  scene.head = scene.strokes[0]?.t0 ?? 0;
  scene.dur = Math.max(plan.writeEnd, voice.duration) + 0.5;
  scene.paced = true;
  scene.pacedFor = voice.duration;
  scene.timing = plan;
  if (!voice.estimated) scene.audioDur = voice.duration;
  return true;
}

