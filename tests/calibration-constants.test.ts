import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CAL } from "../src/lib/video/calibration";

/* CAL must never drift from the measured data — hand edits are caught. */
describe("calibration constants", () => {
  test("CAL matches docs/research/handwriting-calibration-data.json", () => {
    const data = JSON.parse(
      readFileSync(join(import.meta.dir, "../docs/research/handwriting-calibration-data.json"), "utf8")
    ) as {
      fitted: {
        gamma0: number;
        fittsA: number;
        fittsB: number;
        hesitations: { charStart: number; wordStart: number; operator: number };
        settleMs: number;
        dutyCycle: { min: number; max: number };
      };
      derived: { paceWindowSec: [number, number] };
    };
    expect(CAL.gamma0).toBe(data.fitted.gamma0);
    expect(CAL.fitts.a).toBeCloseTo(data.fitted.fittsA, 5);
    expect(CAL.fitts.b).toBeCloseTo(data.fitted.fittsB, 5);
    expect(CAL.hesitations.charStart).toBe(data.fitted.hesitations.charStart);
    expect(CAL.hesitations.wordStart).toBe(data.fitted.hesitations.wordStart);
    expect(CAL.hesitations.operator).toBe(data.fitted.hesitations.operator);
    expect(CAL.settleMs).toBe(data.fitted.settleMs);
    expect(CAL.dutyCycle.min).toBe(data.fitted.dutyCycle.min);
    expect(CAL.dutyCycle.max).toBe(data.fitted.dutyCycle.max);
    expect([...CAL.paceWindowSec]).toEqual(data.derived.paceWindowSec);
  });
});
