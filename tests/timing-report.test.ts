import { expect, test } from "bun:test";
import { parseMeasuredSceneTiming, upsertMeasuredSceneTiming } from "../src/lib/video/timing-report";
const report = { sceneIndex: 1, audioDurationMs: 4200, writeEndMs: 3900 };
test("accepts numeric duration and zero ink for a narrated pause", () => {
  expect(parseMeasuredSceneTiming(report, 3)).toEqual(report);
  expect(parseMeasuredSceneTiming({ ...report, writeEndMs: 0 }, 3)).not.toBeNull();
});
for (const invalid of [
  null, [], { ...report, sceneIndex: "1" }, { ...report, sceneIndex: 3 },
  { ...report, sceneIndex: -1 }, { ...report, sceneIndex: 0.5 },
  { ...report, audioDurationMs: 0 }, { ...report, audioDurationMs: NaN },
  { ...report, audioDurationMs: Infinity }, { ...report, audioDurationMs: 1800001 },
  { ...report, writeEndMs: -1 }, { ...report, audioUrl: "private" },
]) test("reject malformed report " + JSON.stringify(invalid), () => {
  expect(parseMeasuredSceneTiming(invalid, 3)).toBeNull();
});
test("upserts by scene and never mutates old array", () => {
  const old = [report];
  const replaced = upsertMeasuredSceneTiming(old, { ...report, writeEndMs: 4000 });
  expect(old[0].writeEndMs).toBe(3900);
  expect(replaced).toHaveLength(1);
  expect(replaced[0].writeEndMs).toBe(4000);
  expect(upsertMeasuredSceneTiming(old, { ...report, sceneIndex: 0 }).map(r => r.sceneIndex)).toEqual([0, 1]);
});

