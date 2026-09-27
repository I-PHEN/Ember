/* ------------------------------------------------------------------
   Hand-drawing helpers: deterministic rough paths so the board looks
   human-written but stays perfectly stable when seeking (the jitter
   is baked at compile time from a seeded RNG — never Math.random()).
------------------------------------------------------------------- */

import type { BBox, Pt } from "./types";

export function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngFor(...parts: (string | number)[]): () => number {
  return mulberry32(hashStr(parts.join("|")));
}

const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);

/** subdivide a segment so no piece is longer than maxStep */
function subdiv(a: Pt, b: Pt, maxStep: number): Pt[] {
  const d = dist(a, b);
  const n = Math.max(1, Math.ceil(d / maxStep));
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    pts.push({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n });
  }
  return pts;
}

/** perturb a polyline with gentle perpendicular wobble (in place copy) */
export function jitterPolyline(pts: Pt[], amp: number, rng: () => number): Pt[] {
  if (pts.length < 2) return pts.slice();
  // densify
  let dense: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const seg = subdiv(pts[i], pts[i + 1], 26);
    dense.push(...(i === 0 ? seg : seg.slice(1)));
  }
  // small perpendicular offsets, zeroed at the ends
  const out = dense.map((p) => ({ ...p }));
  for (let i = 1; i < out.length - 1; i++) {
    const prev = dense[i - 1];
    const next = dense[i + 1];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L;
    const ny = dx / L;
    const k = (rng() * 2 - 1) * amp;
    out[i].x += nx * k;
    out[i].y += ny * k;
    // tiny tangential wobble
    out[i].x += (dx / L) * (rng() * 2 - 1) * amp * 0.35;
    out[i].y += (dy / L) * (rng() * 2 - 1) * amp * 0.35;
  }
  return out;
}

/** rough hand line between two points */
export function roughLine(
  a: Pt,
  b: Pt,
  amp: number,
  rng: () => number
): Pt[] {
  return jitterPolyline([a, b], amp, rng);
}

/** hand-drawn rectangle: 3 strokes with overshooting corners */
export function roughRect(
  x: number,
  y: number,
  w: number,
  h: number,
  amp: number,
  rng: () => number
): Pt[][] {
  const os = Math.min(10, w * 0.06); // overshoot
  const tl = { x, y };
  const tr = { x: x + w, y };
  const br = { x: x + w, y: y + h };
  const bl = { x, y: y + h };
  return [
    jitterPolyline(
      [
        { x: tl.x - os * 0.6, y: tl.y + h * 0.12 },
        tl,
        tr,
        { x: tr.x + os, y: tr.y + h * 0.2 },
      ],
      amp,
      rng
    ),
    jitterPolyline([bl, br], amp, rng),
    jitterPolyline(
      [
        // approach hugs the bottom-right corner (corner crossing) — a
        // start mid-edge reads as a stray dangling stroke, not a gesture
        { x: br.x + os * 0.6, y: br.y + os * 0.5 },
        br,
        bl,
        { x: bl.x - os * 0.4, y: bl.y - h * 0.1 },
      ],
      amp,
      rng
    ),
  ];
}

/** hand-drawn ellipse (wobbly, slightly overlapping like a real loop) */
export function roughEllipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  amp: number,
  rng: () => number
): Pt[] {
  const start = -Math.PI * 0.62;
  const total = Math.PI * 2.14; // overlap like a human loop
  const steps = 34;
  const pts: Pt[] = [];
  const jr = 1 + amp * 0.02;
  const rx1 = rx * (0.96 + rng() * 0.1);
  const ry1 = ry * (0.94 + rng() * 0.12);
  for (let i = 0; i <= steps; i++) {
    const t = start + (total * i) / steps;
    const wob = 1 + (rng() * 2 - 1) * 0.02 * jr;
    pts.push({
      x: cx + Math.cos(t) * rx1 * wob,
      y: cy + Math.sin(t) * ry1 * wob,
    });
  }
  return pts;
}

/** curved arrow from a to b with a quadratic bend and a small head */
export function roughArrow(
  a: Pt,
  b: Pt,
  bend: number,
  amp: number,
  rng: () => number
): Pt[][] {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  const c = { x: mx + nx * bend, y: my + ny * bend };
  // sample the quadratic
  const steps = Math.max(8, Math.floor(L / 16));
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push({
      x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
      y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
    });
  }
  // arrowhead — direction from the last segment
  const p0 = pts[pts.length - 2];
  const p1 = pts[pts.length - 1];
  const hdx = p1.x - p0.x;
  const hdy = p1.y - p0.y;
  const hl = Math.hypot(hdx, hdy) || 1;
  const ux = hdx / hl;
  const uy = hdy / hl;
  const head = 13;
  const spread = 0.46;
  const h1 = {
    x: p1.x - head * (ux * Math.cos(spread) - uy * Math.sin(spread)),
    y: p1.y - head * (uy * Math.cos(spread) + ux * Math.sin(spread)),
  };
  const h2 = {
    x: p1.x - head * (ux * Math.cos(spread) + uy * Math.sin(spread)),
    y: p1.y - head * (uy * Math.cos(spread) - ux * Math.sin(spread)),
  };
  return [
    jitterPolyline(pts, amp, rng),
    [h1, p1],
    [p1, h2],
  ];
}

/** bbox of a point cloud, with padding */
export function bboxOf(pts: Pt[], pad = 0): BBox {
  if (!pts.length) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
}

export function unionBBox(a: BBox | null, b: BBox): BBox {
  if (!a) return { ...b };
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    w: Math.max(a.x + a.w, b.x + b.w) - x,
    h: Math.max(a.y + a.h, b.y + b.h) - y,
  };
}
