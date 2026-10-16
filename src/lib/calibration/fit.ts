/* ------------------------------------------------------------------
   Fitting: turn measured handwriting metrics into engine constants.
   gamma0 is fitted against the REAL KinematicStrokeSynthesizer by
   binary search — the synthesizer's effective speed is not a closed
   form (curvature, envelopes and acceleration limits all shape it).
------------------------------------------------------------------- */

import { percentile, type HandwritingMetrics } from "./analyze";
import { KinematicStrokeSynthesizer } from "../video/kinematics";

/** Ember board CAP.md — the letter height calibration normalizes to */
export const EMBER_CAP_MD = 38;

/** the stroke gamma0 is fitted on: a medium-curvature sine arc at cap 38 */
function referenceStroke(): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= 40; i++) {
    const x = 100 + (i / 40) * 160;
    const y = 200 + 28 * Math.sin(((i / 40) * Math.PI * 2) / 1);
    pts.push({ x, y });
  }
  return pts;
}

/** gamma0 saturates: past ~300 the acceleration limit and min-jerk
 *  envelope cap stroke speed (~423 px/s on the reference stroke). When
 *  the measured target exceeds the engine's physical ceiling, return
 *  the SATURATION ONSET — the fastest setting the engine can honor. */
export function fitGamma0(targetPxPerSec: number, capHeight = EMBER_CAP_MD): number {
  const speedAt = (g: number): number => {
    const synth = new KinematicStrokeSynthesizer();
    synth.gamma0 = g;
    const prof = synth.synthesize(referenceStroke(), 3.6, undefined, capHeight);
    return prof.totalLength / prof.duration;
  };
  const gMax = 3000;
  const sMax = speedAt(gMax);
  if (targetPxPerSec >= sMax * 0.98) {
    // saturation onset: smallest g within 2 % of the ceiling
    let lo = 10;
    let hi = gMax;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (speedAt(mid) >= sMax * 0.98) hi = mid;
      else lo = mid;
    }
    return Math.round(hi);
  }
  let lo = 10;
  let hi = gMax;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (speedAt(mid) < targetPxPerSec) lo = mid;
    else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}

export interface Fitted {
  gamma0: number;
  fittsA: number;
  fittsB: number;
  hesitations: { charStart: number; wordStart: number; operator: number };
  settleMs: number;
  dutyCycle: { min: number; max: number };
  speedPxPerSec: { p25: number; p50: number; p75: number };
  /** p50 speed normalized: cap-heights per second, board-independent */
  speedCapHeightsPerSec: number;
  capHeightPx: number;
  pauseSec: {
    lineP50: number;
    holdP50: number;
    holdP30: number;
    holdP40: number;
    holdP60: number;
    holdP75: number;
  };
  note: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function fitConstants(m: HandwritingMetrics): Fitted {
  const p25 = percentile(m.speedsPxPerSec, 25);
  const p50 = percentile(m.speedsPxPerSec, 50);
  const p75 = percentile(m.speedsPxPerSec, 75);
  const cap = Math.max(2, m.capHeightPx);
  const chPerSec = p50 / cap;
  const emberPxPerSec = chPerSec * EMBER_CAP_MD;

  const holds = m.pauses.filter((p) => p.kind === "hold").map((p) => p.dur);
  const lines = m.pauses.filter((p) => p.kind === "line").map((p) => p.dur);
  const hold = (p: number) => percentile(holds, p);

  /* Fitts a/b by least squares over hold pauses: T = a + b·log2(1 + D/W),
     D = the measured pen travel across each pause, rescaled from frame
     coordinates to the 720p board (the engine works in board px, W = 12).
     Falls back to the prior constants when samples are too few. */
  const holdPauses = m.pauses.filter((p) => p.kind === "hold");
  const boardScale = 720 / m.frameH;
  let fittsA = 0.11;
  let fittsB = 0.09;
  if (holdPauses.length >= 8) {
    const xs = holdPauses.map((p) =>
      Math.log2(1 + (Math.max(1, p.distPx) * boardScale) / 12)
    );
    const ys = holdPauses.map((p) => p.dur);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    let num = 0;
    let den = 0;
    for (let i = 0; i < xs.length; i++) {
      num += (xs[i] - mx) * (ys[i] - my);
      den += (xs[i] - mx) ** 2;
    }
    if (den > 1e-9) {
      fittsB = clamp(num / den, 0.02, 0.2);
      fittsA = clamp(my - fittsB * mx, 0.05, 0.3);
    }
  }

  return {
    gamma0: fitGamma0(emberPxPerSec),
    fittsA,
    fittsB,
    hesitations: {
      // wide clamps — measured data wins; ceilings only guard sampling
      // artifacts (sub-resolution pauses at low fps)
      charStart: clamp(hold(40), 0.03, 0.2),
      wordStart: clamp(hold(60), 0.08, 0.5),
      operator: clamp(hold(75), 0.15, 0.7),
    },
    settleMs: Math.round(clamp(hold(30), 0.08, 0.3) * 1000),
    dutyCycle: {
      min: clamp(percentile([m.dutyCycle], 10), 0.08, 0.3),
      max: clamp(percentile([m.dutyCycle], 90), 0.15, 0.45),
    },
    speedPxPerSec: { p25, p50, p75 },
    speedCapHeightsPerSec: chPerSec,
    capHeightPx: m.capHeightPx,
    pauseSec: {
      lineP50: percentile(lines, 50),
      holdP50: hold(50),
      holdP30: hold(30),
      holdP40: hold(40),
      holdP60: hold(60),
      holdP75: hold(75),
    },
    note: "fitted against the real synthesizer; hold-pause percentiles map to hesitations",
  };
}
