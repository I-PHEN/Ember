/* ------------------------------------------------------------------
   Motion graphics math helpers: easing, springs, interpolation,
   and camera transformations for Ember Launch Film.
------------------------------------------------------------------- */

export function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function norm(val: number, start: number, end: number): number {
  return clamp((val - start) / (end - start));
}

export function mapRange(
  val: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  easeFn = (t: number) => t
): number {
  const p = norm(val, inMin, inMax);
  return lerp(outMin, outMax, easeFn(p));
}

export const Ease = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => t * (2 - t),
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  outCubic: (t: number) => --t * t * t + 1,
  inOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  outExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t: number) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if ((t *= 2) < 1) return 0.5 * Math.pow(2, 10 * (t - 1));
    return 0.5 * (-Math.pow(2, -10 * --t) + 2);
  },
  outBack: (t: number, s = 1.70158) => {
    t = t - 1;
    return t * t * ((s + 1) * t + s) + 1;
  },
  outElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1;
  },
};

/** Camera 2D state for zooms, pans, and cinematic punch-ins */
export interface Camera {
  x: number;
  y: number;
  scale: number;
  rotate?: number;
}
