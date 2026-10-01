/* Honest progress toward "your video is ready", as ONE number.
   Contract (the user asked for honest AND alive):
   - phase bands anchored by real milestones: directing <14, scripting <36,
     boarding <92, voicing <100, ready = 100 exactly;
   - inside a band the value creeps on a decaying time curve, so it is never
     frozen even when the only news is "still working";
   - the scene/voice counters pull it up faster than time alone;
   - it can NEVER read 100 before phase === "ready". */

export interface ProgressInput {
  phase:
    | "directing"
    | "scripting"
    | "boarding"
    | "voicing"
    | "ready"
    | "error";
  createdAt: number;
  scriptStartAt: number | null;
  boardingStartAt: number | null;
  scenesTotal: number;
  scenesDone: number;
  voicesTotal: number;
  voicesDone: number;
  script: unknown;
}

/* decaying approach: ~89% of a band by its expected duration, never quite 1 */
const decay = (t: number): number => 1 - Math.exp(-2.2 * Math.max(0, t));

const EXPECTED_DIRECTOR_MS = 25_000;
const EXPECTED_PLANNER_MS = 30_000;
const EXPECTED_WAVE_MS = 12_000; // one 3-writer wave, generous

export function computeWatchProgress(j: ProgressInput, now: number): number {
  const phaseElapsed = (from: number | null): number =>
    Math.max(0, now - (from ?? j.createdAt));

  if (j.phase === "ready") return 100;
  if (j.script) {
    const voiceFrac = j.voicesTotal > 0 ? j.voicesDone / j.voicesTotal : 0;
    return Math.min(99, 92 + 7 * voiceFrac);
  }
  if (j.phase === "voicing") return 92; // delivered but script not yet on the snapshot
  if (j.phase === "boarding") {
    const sceneFrac = j.scenesTotal > 0 ? j.scenesDone / j.scenesTotal : 0;
    const waves = Math.max(1, Math.ceil(Math.max(1, j.scenesTotal) / 3));
    const timeFrac =
      decay(phaseElapsed(j.boardingStartAt) / (waves * EXPECTED_WAVE_MS)) * 0.9;
    return 36 + 54 * Math.min(0.999, Math.max(sceneFrac, timeFrac));
  }
  if (j.phase === "scripting") {
    return 14 + 22 * decay(phaseElapsed(j.scriptStartAt) / EXPECTED_PLANNER_MS);
  }
  return 2 + 12 * decay(phaseElapsed(j.createdAt) / EXPECTED_DIRECTOR_MS);
}

/** monotonic guard — progress only ever goes up on a given job */
export function advanceProgress(prev: number, next: number): number {
  return Math.max(prev, Math.min(100, next));
}
