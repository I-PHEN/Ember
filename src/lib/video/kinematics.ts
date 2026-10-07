/* ------------------------------------------------------------------
   Kinematic Synthesis & Biomechanical Modeling of Natural Handwriting
   Grounded in:
   - Motor Equivalence & Isochrony Principle (Viviani & Terzuolo, Plamondon)
   - Lacquaniti's Two-Thirds Power Law (v ~ kappa^(-1/3))
   - Flash & Hogan's Minimum Jerk Trajectory Optimization
   - Fitts' Law Airborne Pen-Up Flight Kinetics
   - Digital Ink Rheology & Variable Calligraphic Nib Physics
   - Multimodal Speech-Writing Elastic Pause Synchronization
------------------------------------------------------------------- */

import type { PathStroke, Pt } from "./types";

export type StrokeTag =
  | "operator"
  | "word-start"
  | "char-start"
  | "glyph-stroke"
  | "ballistic-line";

export interface KinematicProfile {
  /** Canonical geometry: cum and widths index this exact point array. */
  pts: Pt[];
  totalLength: number;
  cum: number[];
  duration: number;
  /** Monotonic normalized time [0..1] -> normalized arc length [0..1] */
  timeLut: number[];
  /** Dynamic calligraphic line width along polyline points */
  widths: number[];
  /** Diagnostic velocities sampled uniformly in arc length (not point indices). */
  velocities: number[];
}

/**
 * 1D Natural Cubic Spline with tridiagonal matrix solver (Thomas algorithm).
 * Provides exact C^2 continuity and analytical derivatives dx/ds, d^2x/ds^2.
 */
export class CubicSpline1D {
  private n: number;
  private x: number[];
  private y: number[];
  private M: number[];

  constructor(x: number[], y: number[]) {
    this.n = x.length;
    this.x = x;
    this.y = y;
    const n = this.n;

    if (n < 2) {
      this.M = [0];
      return;
    }
    if (n === 2) {
      this.M = [0, 0];
      return;
    }

    const h: number[] = new Array(n - 1);
    for (let i = 0; i < n - 1; i++) {
      h[i] = Math.max(1e-6, x[i + 1] - x[i]);
    }

    const m = n - 2;
    const diag: number[] = new Array(m);
    const sub: number[] = new Array(m - 1);
    const sup: number[] = new Array(m - 1);
    const rhs: number[] = new Array(m);

    for (let i = 0; i < m; i++) {
      const idx = i + 1;
      diag[i] = 2 * (h[idx - 1] + h[idx]);
      if (i > 0) sub[i - 1] = h[idx - 1];
      if (i < m - 1) sup[i] = h[idx];
      const d1 = (y[idx + 1] - y[idx]) / h[idx];
      const d0 = (y[idx] - y[idx - 1]) / h[idx - 1];
      rhs[i] = 6 * (d1 - d0);
    }

    const cPrime: number[] = new Array(m);
    const dPrime: number[] = new Array(m);

    cPrime[0] = sup[0] !== undefined ? sup[0] / diag[0] : 0;
    dPrime[0] = rhs[0] / diag[0];

    for (let i = 1; i < m; i++) {
      const mVal = diag[i] - sub[i - 1] * cPrime[i - 1];
      cPrime[i] = i < m - 1 ? sup[i] / mVal : 0;
      dPrime[i] = (rhs[i] - sub[i - 1] * dPrime[i - 1]) / mVal;
    }

    const sol: number[] = new Array(m);
    sol[m - 1] = dPrime[m - 1];
    for (let i = m - 2; i >= 0; i--) {
      sol[i] = dPrime[i] - cPrime[i] * sol[i + 1];
    }

    this.M = new Array(n);
    this.M[0] = 0;
    this.M[n - 1] = 0;
    for (let i = 0; i < m; i++) {
      this.M[i + 1] = sol[i];
    }
  }

  private findInterval(val: number): number {
    const x = this.x;
    if (val <= x[0]) return 0;
    if (val >= x[x.length - 1]) return x.length - 2;
    let lo = 0;
    let hi = x.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (x[mid] <= val) lo = mid;
      else hi = mid;
    }
    return lo;
  }

  eval(val: number): { y: number; dy: number; ddy: number } {
    if (this.n < 2) return { y: this.y[0] ?? 0, dy: 0, ddy: 0 };
    const i = this.findInterval(val);
    const xi = this.x[i];
    const xi1 = this.x[i + 1];
    const yi = this.y[i];
    const yi1 = this.y[i + 1];
    const h = Math.max(1e-6, xi1 - xi);
    const Mi = this.M[i];
    const Mi1 = this.M[i + 1];

    const dx1 = xi1 - val;
    const dx0 = val - xi;

    const y =
      (Mi * (dx1 ** 3) + Mi1 * (dx0 ** 3)) / (6 * h) +
      (yi / h - (Mi * h) / 6) * dx1 +
      (yi1 / h - (Mi1 * h) / 6) * dx0;

    const dy =
      (-Mi * (dx1 ** 2) + Mi1 * (dx0 ** 2)) / (2 * h) -
      (yi / h - (Mi * h) / 6) +
      (yi1 / h - (Mi1 * h) / 6);

    const ddy = (Mi * dx1 + Mi1 * dx0) / h;

    return { y, dy, ddy };
  }
}

/** Preprocess polyline to eliminate infinitesimal sub-segments (avoids curvature singularities) */
export function preprocessPolyline(raw: Pt[]): Pt[] {
  if (raw.length <= 2) return raw;
  const out: Pt[] = [raw[0]];
  for (let i = 1; i < raw.length; i++) {
    const p = raw[i];
    const prev = out[out.length - 1];
    const d = Math.hypot(p.x - prev.x, p.y - prev.y);
    if (d >= 0.35 || (i === raw.length - 1 && d > 0)) {
      out.push(p);
    }
  }
  return out;
}

/**
 * Fitts' Law Airborne Pen Flight Kinetics
 * T_flight = a + b * log2(1 + D / W)
 */
export function computeFittsFlightDuration(from: Pt, to: Pt, targetWidth = 12): number {
  const D = Math.hypot(to.x - from.x, to.y - from.y);
  const a = 0.11; // s
  const b = 0.09; // s/bit
  const id = Math.log2(1 + D / Math.max(1, targetWidth));
  const flight = a + b * id;
  return Math.max(0.08, Math.min(0.68, flight));
}

/**
 * Hierarchical neuromuscular transition pauses
 * Schedules cognitive chunking hesitations and air transit
 */
export function computeTransitionPause(
  from: Pt | null,
  to: Pt,
  tag?: StrokeTag | string
): number {
  if (!from) return 0;
  const flight = computeFittsFlightDuration(from, to, 12);
  let hesitation = 0;

  switch (tag) {
    case "operator":
      // Pre-operator hesitation: 400 - 800 ms (conceptual chunking before =, +, -, etc.)
      hesitation = 0.58;
      break;
    case "word-start":
      // Inter-word repositioning: 250 - 450 ms across lexical word spaces
      hesitation = 0.38;
      break;
    case "char-start":
      // Inter-character transition: 120 - 250 ms
      hesitation = 0.14;
      break;
    case "glyph-stroke":
      // Inter-stroke within same glyph: 80 - 180 ms (covered directly by Fitts flight)
      hesitation = 0.0;
      break;
    case "ballistic-line":
      // Fast flick line (fraction bar / vinculum): minimal hesitation
      hesitation = 0.04;
      break;
    default:
      hesitation = 0.06;
      break;
  }

  // The semantic pause includes the flight; adding both makes short equations
  // accumulate seconds of duplicate waiting.
  return Math.max(flight, hesitation);
}

/**
 * Sub-pixel physiological tremor (8-12 Hz mechanical resonance and 1-3 Hz corrective sway)
 */
export function sampleMicroTremor(
  t: number,
  speed: number,
  seed = 0
): { dx: number; dy: number } {
  const f1 = 9.5; // Hz
  const f2 = 3.2; // Hz
  const amp = 0.45; // px (at 720p/1080p)
  const vRef = 260.0;
  const speedScale = Math.min(1.0, Math.sqrt(Math.max(0, speed) / vRef));
  const phi1 = seed * 1.618;
  const phi2 = seed * 2.718;

  const dx =
    amp *
    (Math.sin(2 * Math.PI * f1 * t + phi1) +
      0.35 * Math.sin(2 * Math.PI * f2 * t + phi2)) *
    speedScale;
  const dy =
    amp *
    (Math.cos(2 * Math.PI * f1 * t + phi1) +
      0.35 * Math.cos(2 * Math.PI * f2 * t + phi2)) *
    speedScale;

  return { dx, dy };
}

/**
 * The Biomechanical Kinematic Stroke Synthesizer.
 * Synthesizes natural human velocity profiles and dynamic calligraphic widths.
 */
export class KinematicStrokeSynthesizer {
  public gamma0 = 80.0; // Initial Ember calibration; not a measured biological constant
  public beta = 0.3333; // Lacquaniti Two-Thirds Power Law exponent (1/3)
  public epsilon = 0.0075; // Curvature regularization offset (px^-1)
  public aMax = 3200.0; // Forearm/wrist tangential acceleration limit (px/s^2)
  public vClamp = 2400.0; // Ballistic velocity ceiling (px/s)
  public vMin = 26.0; // Apex/turnaround minimum velocity (px/s)
  public nibAngleRad = 42 * (Math.PI / 180); // 42° inclination angle
  public nibAspect = 2.2; // Major/minor axis ratio for chisel/oval marker
  public vRef = 260.0;
  public deltaV = 45.0;
  public alphaW = 0.22; // High-speed ink thinning exponent
  public betaW = 0.35; // Corner curvature ink thickening factor

  synthesize(
    points: Pt[],
    baseStrokeWidth = 3.6,
    tag?: StrokeTag | string
  ): KinematicProfile {
    if (points.length < 2 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y)) ||
        !Number.isFinite(baseStrokeWidth) || baseStrokeWidth <= 0) {
      throw new Error("Invalid stroke geometry or width");
    }
    const pts = preprocessPolyline(points);
    const n = pts.length;
    if (n < 2 || pts.every(p => p.x === pts[0].x && p.y === pts[0].y)) {
      return {
        pts: [pts[0], pts[0]],
        totalLength: 0,
        cum: [0, 0],
        duration: 0.065,
        timeLut: Array.from({length:64}, (_,i) => i/63),
        widths: [baseStrokeWidth, baseStrokeWidth],
        velocities: [0, 0],
      };
    }

    // Cumulative arc lengths
    const cum: number[] = [0];
    for (let i = 1; i < n; i++) {
      const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      cum.push(cum[cum.length - 1] + d);
    }
    const totalLength = cum[cum.length - 1];

    // Fast ballistic lines (fraction bar, vinculum, axis, coordinate line, crossout)
    const isBallistic = tag === "ballistic-line" || (n <= 3 && totalLength > 180);
    if (isBallistic) {
      // Quintic peak v = 1.875 L/T; peak |a| = (10/sqrt(3)) L/T².
      // A fixed upper duration would silently violate both limits for long bars.
      const dur = Math.max(0.18, 1.875 * totalLength / this.vClamp,
        Math.sqrt((10 / Math.sqrt(3)) * totalLength / this.aMax));
      const LUT_SIZE = 64;
      const timeLut: number[] = new Array(LUT_SIZE);
      for (let k = 0; k < LUT_SIZE; k++) {
        const u = k / (LUT_SIZE - 1);
        // Minimum jerk 5th order polynomial bell curve integral
        timeLut[k] = 10 * Math.pow(u, 3) - 15 * Math.pow(u, 4) + 6 * Math.pow(u, 5);
      }
      const widths = pts.map(() => baseStrokeWidth);
      const peakV = 1.875 * (totalLength / dur);
      const velocities = [peakV];
      return {
        pts,
        totalLength,
        cum,
        duration: dur,
        timeLut,
        widths,
        velocities,
      };
    }

    // Arc length re-timing & numerical evaluation
    const numEval = Math.max(48, Math.min(240, Math.ceil(totalLength * 1.8)));
    const sEval: number[] = new Array(numEval);
    for (let i = 0; i < numEval; i++) {
      sEval[i] = (i / (numEval - 1)) * totalLength;
    }
    const ds = totalLength / (numEval - 1);

    const spX = new CubicSpline1D(cum, pts.map((p) => p.x));
    const spY = new CubicSpline1D(cum, pts.map((p) => p.y));

    // Isochrony duration scaling: T ~ L^0.25 => v ~ L^0.75
    const isochronyScale = Math.pow(Math.max(totalLength, 15.0) / 50.0, 0.75);
    const gamma = this.gamma0 * isochronyScale;

    const vRaw: number[] = new Array(numEval);
    const curvatures: number[] = new Array(numEval);

    for (let i = 0; i < numEval; i++) {
      const s = sEval[i];
      const ex = spX.eval(s);
      const ey = spY.eval(s);
      const dx = ex.dy;
      const dy = ey.dy;
      const ddx = ex.ddy;
      const ddy = ey.ddy;

      const speedSq = Math.max(dx * dx + dy * dy, 1e-9);
      const kappa = Math.abs(dx * ddy - dy * ddx) / Math.pow(speedSq, 1.5);
      curvatures[i] = kappa;

      // Two-Thirds Power Law: v = gamma * (kappa + epsilon)^(-beta)
      const v = gamma * Math.pow(kappa + this.epsilon, -this.beta);
      vRaw[i] = Math.min(this.vClamp, Math.max(this.vMin, v));
    }

    // Flash & Hogan Minimum Jerk boundary envelope
    const boundaryWindow = Math.min(totalLength * 0.12, 8.0);
    const vBounded: number[] = new Array(numEval);
    for (let i = 0; i < numEval; i++) {
      const s = sEval[i];
      const rampIn = Math.min(1.0, Math.max(0.0, s / Math.max(boundaryWindow, 1e-3)));
      const rampOut = Math.min(1.0, Math.max(0.0, (totalLength - s) / Math.max(boundaryWindow, 1e-3)));
      const envIn = 10 * Math.pow(rampIn, 3) - 15 * Math.pow(rampIn, 4) + 6 * Math.pow(rampIn, 5);
      const envOut = 10 * Math.pow(rampOut, 3) - 15 * Math.pow(rampOut, 4) + 6 * Math.pow(rampOut, 5);
      const envelope = envIn * envOut;
      vBounded[i] = Math.max(this.vMin, vRaw[i] * envelope);
    }

    // Forward-backward acceleration limiting pass
    const vFiltered = [...vBounded];
    for (let i = 0; i < numEval - 1; i++) {
      const maxNext = Math.sqrt(vFiltered[i] ** 2 + 2 * this.aMax * ds);
      if (vFiltered[i + 1] > maxNext) {
        vFiltered[i + 1] = maxNext;
      }
    }
    for (let i = numEval - 1; i > 0; i--) {
      const maxPrev = Math.sqrt(vFiltered[i] ** 2 + 2 * this.aMax * ds);
      if (vFiltered[i - 1] > maxPrev) {
        vFiltered[i - 1] = maxPrev;
      }
    }

    // Time integration: dt = ds / v
    const tCumulative: number[] = [0];
    for (let i = 0; i < numEval - 1; i++) {
      const avgV = (vFiltered[i] + vFiltered[i + 1]) / 2;
      const dt = ds / Math.max(avgV, 1.0);
      tCumulative.push(tCumulative[tCumulative.length - 1] + dt);
    }
    const integratedDuration = tCumulative[tCumulative.length - 1];
    const totalDuration = Math.max(0.065, integratedDuration);

    // Monotonic normalized time LUT: 64 samples mapping u in [0, 1] to normalized s in [0, 1]
    const LUT_SIZE = 64;
    const timeLut: number[] = new Array(LUT_SIZE);
    timeLut[0] = 0;
    timeLut[LUT_SIZE - 1] = 1;
    for (let k = 1; k < LUT_SIZE - 1; k++) {
      // Normalize using the integrated duration, not the display minimum.
      // Otherwise short paths extrapolate beyond 100% then jump backwards.
      const targetT = (k / (LUT_SIZE - 1)) * integratedDuration;
      let lo = 0;
      let hi = numEval - 1;
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (tCumulative[mid] <= targetT) lo = mid;
        else hi = mid;
      }
      const t0 = tCumulative[lo];
      const t1 = tCumulative[hi];
      const frac = t1 > t0 ? (targetT - t0) / (t1 - t0) : 0;
      const sVal = sEval[lo] + (sEval[hi] - sEval[lo]) * frac;
      timeLut[k] = Math.max(timeLut[k - 1], Math.min(1, sVal / totalLength));
    }

    // Dynamic calligraphic width along stroke points
    const widths: number[] = new Array(pts.length);
    const b = baseStrokeWidth / (2.0 * Math.sqrt(this.nibAspect));
    const a = b * this.nibAspect;

    for (let i = 0; i < pts.length; i++) {
      const s = cum[i];
      const ex = spX.eval(s);
      const ey = spY.eval(s);
      const dx = ex.dy;
      const dy = ey.dy;
      const ddx = ex.ddy;
      const ddy = ey.ddy;
      const speedSq = Math.max(dx * dx + dy * dy, 1e-9);
      const kappa = Math.abs(dx * ddy - dy * ddx) / Math.pow(speedSq, 1.5);
      const thetaV = Math.atan2(dy, dx);

      // Calligraphic geometric projection
      const deltaTheta = thetaV - this.nibAngleRad;
      const wCal = 2.0 * Math.sqrt(
        Math.pow(a * Math.sin(deltaTheta), 2) + Math.pow(b * Math.cos(deltaTheta), 2)
      );

      // Instantaneous velocity thinning and curvature pooling
      const evalIdx = Math.min(
        numEval - 1,
        Math.max(0, Math.round((s / totalLength) * (numEval - 1)))
      );
      const localV = vFiltered[evalIdx];
      const thinning = Math.pow(this.vRef / (localV + this.deltaV), this.alphaW);
      const thickening = 1.0 + this.betaW * Math.tanh(kappa * 10.0);
      const wFinal = wCal * thinning * thickening;
      widths[i] = Math.max(baseStrokeWidth * 0.45, Math.min(baseStrokeWidth * 1.65, wFinal));
    }

    return {
      pts,
      totalLength,
      cum,
      duration: totalDuration,
      timeLut,
      widths,
      velocities: vFiltered.map(v => v * integratedDuration / totalDuration),
    };
  }
}

/** Global default synthesizer instance */
export const defaultSynthesizer = new KinematicStrokeSynthesizer();

/**
 * Samples stroke progress from normalized time fraction [0..1]
 * using the precomputed Two-Thirds Power Law time LUT.
 */
export function strokeProgressAt(s: PathStroke, rawP: number): number {
  if (rawP <= 0) return 0;
  if (rawP >= 1) return 1;
  if (s.timeLut && s.timeLut.length >= 2) {
    const lut = s.timeLut;
    const n = lut.length;
    const scaled = rawP * (n - 1);
    const idx = Math.floor(scaled);
    const frac = scaled - idx;
    if (idx >= n - 1) return lut[n - 1];
    return lut[idx] + (lut[idx + 1] - lut[idx]) * frac;
  }
  // Fallback to cubic smoothstep
  return rawP * rawP * (3 - 2 * rawP);
}
