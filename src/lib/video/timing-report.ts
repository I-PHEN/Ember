export interface MeasuredSceneTiming {
  sceneIndex: number;
  audioDurationMs: number;
  writeEndMs: number;
}
const MAX_DURATION_MS = 30 * 60 * 1000;
export function parseMeasuredSceneTiming(raw: unknown, sceneCount: number): MeasuredSceneTiming | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) ||
      !Number.isInteger(sceneCount) || sceneCount < 1) return null;
  const prototype = Object.getPrototypeOf(raw);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const keys = Object.keys(raw);
  if (keys.length !== 3 || !keys.every(k => ["sceneIndex", "audioDurationMs", "writeEndMs"].includes(k))) return null;
  const { sceneIndex, audioDurationMs, writeEndMs } = raw as Record<string, unknown>;
  if (typeof sceneIndex !== "number" || !Number.isInteger(sceneIndex) || sceneIndex < 0 || sceneIndex >= sceneCount) return null;
  if (typeof audioDurationMs !== "number" || !Number.isFinite(audioDurationMs) ||
      audioDurationMs <= 0 || audioDurationMs > MAX_DURATION_MS) return null;
  // A narrated pause may intentionally contain no ink.
  if (typeof writeEndMs !== "number" || !Number.isFinite(writeEndMs) ||
      writeEndMs < 0 || writeEndMs > MAX_DURATION_MS) return null;
  return { sceneIndex, audioDurationMs, writeEndMs };
}
export function upsertMeasuredSceneTiming(existing: MeasuredSceneTiming[], next: MeasuredSceneTiming): MeasuredSceneTiming[] {
  return [...existing.filter(item => item.sceneIndex !== next.sceneIndex), { ...next }]
    .sort((a, b) => a.sceneIndex - b.sceneIndex);
}

