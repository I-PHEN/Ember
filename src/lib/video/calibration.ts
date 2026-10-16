/* ------------------------------------------------------------------
   Calibrated handwriting constants — fitted to measured reference
   footage (docs/research/handwriting-calibration-data.json, sourced
   from the Organic Chemistry Tutor "Intro to Matrices" lecture).
   DO NOT hand-tune: change only with new measurement data (spec §10);
   tests/calibration-constants.test.ts pins this module to the JSON.
------------------------------------------------------------------- */

export const CAL = {
  source: "OCT Intro to Matrices — docs/research/handwriting-calibration-data.json",
  gamma0: 43,
  fitts: { a: 0.05, b: 0.131463 },
  hesitations: {
    charStart: 0.06666666666668941, // 67 ms — measured hold P40
    wordStart: 0.09999999999999243, // 100 ms — measured hold P60
    operator: 0.15, // 150 ms — measured hold P75
    glyph: 0.0,
    ballistic: 0.02,
  },
  settleMs: 80, // measured hold P30 (was invented 180 ms)
  dutyCycle: { min: 0.2580565684438747, max: 0.2580565684438747 },
  paceWindowSec: [9.1, 12.8] as [number, number],
} as const;
