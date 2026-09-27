/* ------------------------------------------------------------------
   The renderer: draws the exact board state at global time t.
   Pure function of (timeline, t, theme) → perfect seeking, live
   theme switching, and frame-accurate thumbnails.
------------------------------------------------------------------- */

import {
  BOARD_H,
  BOARD_W,
  type BoardTheme,
  type PathStroke,
  type Pt,
  type Stroke,
  type Timeline,
  eraseTime,
  sceneAt,
  sceneStart,
} from "./types";
import { markerColor } from "./types";

/* --------------------------- static chrome ------------------------ */

let noiseCanvas: HTMLCanvasElement | null = null;
let vignetteCache: Record<string, CanvasGradient> = {};

function getNoise(): HTMLCanvasElement {
  if (noiseCanvas) return noiseCanvas;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  const img = g.createImageData(256, 256);
  let seed = 1234567;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (rnd() * 2 - 1) * 110;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  noiseCanvas = c;
  return c;
}

function getVignette(
  ctx: CanvasRenderingContext2D,
  theme: BoardTheme
): CanvasGradient {
  if (vignetteCache[theme.id]) return vignetteCache[theme.id];
  const g = ctx.createRadialGradient(
    BOARD_W / 2,
    BOARD_H / 2,
    BOARD_H * 0.3,
    BOARD_W / 2,
    BOARD_H / 2,
    BOARD_W * 0.72
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, theme.vignette);
  vignetteCache[theme.id] = g;
  return g;
}

export function drawBoard(
  ctx: CanvasRenderingContext2D,
  theme: BoardTheme
): void {
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, BOARD_W, BOARD_H);
  const n = getNoise();
  ctx.save();
  ctx.globalAlpha = theme.noise;
  ctx.globalCompositeOperation = "overlay";
  const pat = ctx.createPattern(n, "repeat");
  if (pat) {
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, BOARD_W, BOARD_H);
  }
  ctx.restore();
  ctx.fillStyle = getVignette(ctx, theme);
  ctx.fillRect(0, 0, BOARD_W, BOARD_H);
}

/* --------------------------- stroke utils ------------------------- */

/** accumulated displacement of a stroke at global time t (erase slides) */
export function strokeDelta(
  tl: Timeline,
  s: Stroke,
  t: number
): { dx: number; dy: number } {
  if (!s.moves?.length) return { dx: 0, dy: 0 };
  let dx = 0;
  let dy = 0;
  for (const m of s.moves) {
    if (t >= sceneStart(tl, m.scene) + m.at) {
      dx += m.dx;
      dy += m.dy;
    }
  }
  return { dx, dy };
}

export function pointAtLen(s: PathStroke, target: number): Pt {
  const { pts, cum } = s;
  if (target <= 0) return pts[0];
  if (target >= s.len) return pts[pts.length - 1];
  // binary search the segment
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  const i = Math.max(1, lo);
  const segStart = cum[i - 1];
  const segLen = cum[i] - segStart;
  const k = segLen > 0 ? (target - segStart) / segLen : 0;
  return {
    x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k,
    y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k,
  };
}

function drawPartialPath(
  ctx: CanvasRenderingContext2D,
  s: PathStroke,
  p: number,
  dx = 0,
  dy = 0
): void {
  const target = p * s.len;
  ctx.beginPath();
  ctx.moveTo(s.pts[0].x + dx, s.pts[0].y + dy);
  for (let i = 1; i < s.pts.length; i++) {
    if (s.cum[i] <= target) {
      ctx.lineTo(s.pts[i].x + dx, s.pts[i].y + dy);
    } else {
      const pt = pointAtLen(s, target);
      ctx.lineTo(pt.x + dx, pt.y + dy);
      break;
    }
  }
  ctx.stroke();
}

/* ------------------------------ pen -------------------------------- */

interface PenState {
  x: number;
  y: number;
  color: string;
  mode: "write" | "travel" | "rest" | "hidden";
  alpha: number;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function computePen(tl: Timeline, t: number, theme: BoardTheme): PenState | null {
  const idx = sceneAt(tl, t);
  if (idx < 0) return null;
  const scene = tl.scenes[idx];
  const start = sceneStart(tl, idx);
  const rel = t - start;
  if (!scene.strokes.length) return null;

  // active stroke being written right now?
  let active: PathStroke | null = null;
  let activeAbs0 = 0;
  for (const s of scene.strokes) {
    if (s.kind !== "path") continue;
    const abs0 = start + s.t0;
    if (rel >= s.t0 && rel < s.t0 + s.dur) {
      active = s;
      activeAbs0 = abs0;
    }
  }
  if (active) {
    const p = Math.min(1, (t - activeAbs0) / active.dur);
    const pt = pointAtLen(active, p * active.len);
    // deictic hold (point beat): pen rests ON a referenced term — a gentle,
    // deterministic hand sway sells the pointing gesture
    if (active.len < 0.5) {
      return {
        x: pt.x + Math.sin(t * 2.3) * 2.6,
        y: pt.y + Math.cos(t * 1.8) * 1.6,
        color: markerColor(theme, active.color),
        mode: "write",
        alpha: 1,
      };
    }
    return {
      x: pt.x,
      y: pt.y,
      color: markerColor(theme, active.color),
      mode: "write",
      alpha: 1,
    };
  }

  // between strokes → travel toward the next one
  let next: PathStroke | null = null;
  for (const s of scene.strokes) {
    if (s.kind !== "path") continue;
    if (s.t0 > rel) {
      if (!next || s.t0 < next.t0) next = s;
    }
  }
  let prev: PathStroke | null = null;
  for (const s of scene.strokes) {
    if (s.kind !== "path") continue;
    const endRel = s.t0 + s.dur;
    if (endRel <= rel) {
      if (!prev || endRel > prev.t0 + prev.dur) prev = s;
    }
  }

  if (next && next.t0 - rel < 0.6) {
    const from = prev
      ? prev.pts[prev.pts.length - 1]
      : next.pts[0];
    const to = next.pts[0];
    const gapStart = prev ? prev.t0 + prev.dur : next.t0 - 0.3;
    const gapDur = Math.max(0.03, next.t0 - gapStart);
    const gp = Math.min(1, Math.max(0, (rel - gapStart) / gapDur));
    const e = easeInOut(gp);
    return {
      x: from.x + (to.x - from.x) * e,
      y: from.y + (to.y - from.y) * e,
      color: markerColor(theme, next.color),
      mode: "travel",
      alpha: 1,
    };
  }

  // pen just lifted from the board — drift down-and-away (like a teacher
  // releasing the marker) while fading, so it never sits parked on the text
  if (prev && rel - (prev.t0 + prev.dur) < 1.15) {
    const end = prev.pts[prev.pts.length - 1];
    const idle = rel - (prev.t0 + prev.dur);
    const drift = easeInOut(Math.min(1, idle / 0.9));
    return {
      x: end.x + 16 * drift,
      y: end.y + 20 * drift,
      color: markerColor(theme, prev.color),
      mode: "rest",
      alpha: 1 - Math.max(0, (idle - 0.5) / 0.6),
    };
  }
  return null;
}

function drawPen(
  ctx: CanvasRenderingContext2D,
  pen: PenState,
  t: number
): void {
  const writing = pen.mode === "write";
  const lift = pen.mode === "travel" ? 15 : pen.mode === "rest" ? 9 : 0;
  const wobble = writing ? Math.sin(t * 9.5) * 0.018 : 0;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, pen.alpha));
  // contact shadow
  ctx.save();
  ctx.translate(pen.x, pen.y + 2);
  ctx.rotate(-0.62 + wobble);
  ctx.fillStyle = "rgba(0,0,0,0.30)";
  ctx.beginPath();
  ctx.ellipse(-6 - lift * 0.3, 4, 16, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // pen body (tip at origin, extending up-right)
  ctx.translate(pen.x, pen.y - lift);
  ctx.rotate(-0.66 + wobble);
  // ink tip
  ctx.fillStyle = pen.color;
  ctx.beginPath();
  ctx.moveTo(0, 1.5);
  ctx.lineTo(3.6, -9);
  ctx.lineTo(-3.6, -9);
  ctx.closePath();
  ctx.fill();
  // nib ring
  ctx.fillStyle = "rgba(20,22,28,0.9)";
  ctx.beginPath();
  ctx.roundRect(-4.6, -13, 9.2, 5, 1.6);
  ctx.fill();
  // body
  const grad = ctx.createLinearGradient(-5, 0, 5, 0);
  grad.addColorStop(0, "#3a3f4b");
  grad.addColorStop(0.5, "#e8ebf2");
  grad.addColorStop(1, "#575d6b");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(-5.2, -56, 10.4, 44, 5);
  ctx.fill();
  // ink band near the top (marker style)
  ctx.fillStyle = pen.color;
  ctx.beginPath();
  ctx.roundRect(-5.2, -50, 10.4, 9, 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.roundRect(-4.4, -55, 2.2, 40, 1);
  ctx.fill();
  ctx.restore();
  // ink dot at contact while writing
  if (writing) {
    ctx.save();
    ctx.globalAlpha = 0.5 * pen.alpha;
    ctx.fillStyle = pen.color;
    ctx.beginPath();
    ctx.arc(pen.x, pen.y, 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/* ----------------------------- eraser ------------------------------ */

function drawEraserSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.12);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(4, 12, 26, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // classic black+white eraser block
  ctx.fillStyle = "#e9e6df";
  ctx.beginPath();
  ctx.roundRect(-30, -18, 60, 30, 5);
  ctx.fill();
  ctx.fillStyle = "#2e3239";
  ctx.beginPath();
  ctx.roundRect(-30, -18, 60, 12, 5);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-30, -18, 60, 30, 5);
  ctx.stroke();
  ctx.restore();
}

/* ---------------------------- main frame --------------------------- */

export interface RenderOpts {
  pen?: boolean;
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  tl: Timeline,
  t: number,
  theme: BoardTheme,
  opts: RenderOpts = {}
): void {
  drawBoard(ctx, theme);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // strokes (previous scenes stay visible until erased)
  for (let i = 0; i < tl.scenes.length; i++) {
    const start = sceneStart(tl, i);
    if (start > t) break;
    for (const s of tl.scenes[i].strokes) {
      const abs0 = start + s.t0;
      if (abs0 > t) continue;
      const p = Math.min(1, (t - abs0) / s.dur);
      let alpha = 1;
      const et = eraseTime(tl, s);
      if (et !== null && t >= et) {
        alpha = 1 - (t - et) / 0.24;
        if (alpha <= 0) continue;
      }
      ctx.globalAlpha = alpha;
      if (s.kind === "highlight") {
        const d = strokeDelta(tl, s, t);
        const hx = s.rect.x + d.dx;
        const hy = s.rect.y + d.dy;
        // a marker sweeping a soft rounded swatch (progressive width),
        // slightly translucent so the text beneath stays crisp
        const hw = Math.max(Math.min(8, s.rect.w), s.rect.w * p);
        ctx.save();
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillStyle = theme.highlight;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(hx, hy, hw, s.rect.h, Math.min(7, hw / 2, s.rect.h / 2));
        } else {
          ctx.rect(hx, hy, hw, s.rect.h);
        }
        ctx.fill();
        ctx.restore();
      } else {
        const d = strokeDelta(tl, s, t);
        ctx.strokeStyle = markerColor(theme, s.color);
        ctx.lineWidth = s.width;
        if (s.glow) {
          ctx.save();
          ctx.shadowColor = markerColor(theme, s.color);
          ctx.shadowBlur = 14;
          drawPartialPath(ctx, s, p, d.dx, d.dy);
          ctx.restore();
        } else {
          drawPartialPath(ctx, s, p, d.dx, d.dy);
        }
      }
    }
  }
  ctx.globalAlpha = 1;

  // eraser sweeps (current scene only — visual sprite)
  const idx = sceneAt(tl, t);
  if (idx >= 0) {
    const start = sceneStart(tl, idx);
    const rel = t - start;
    for (const sw of tl.scenes[idx].erases) {
      const dt = rel - sw.at;
      if (dt < 0 || dt > 0.95) continue;
      const prog = Math.min(1, dt / 0.8);
      const x = sw.region.x - 50 + prog * (sw.region.w + 100);
      const y = sw.region.y + sw.region.h / 2;
      drawEraserSprite(ctx, x, y);
      // a few dust streaks behind the eraser
      ctx.save();
      ctx.globalAlpha = 0.25 * (1 - prog);
      ctx.fillStyle = theme.id === "blackboard" ? "#cfd3da" : "#8a8577";
      for (let k = 0; k < 5; k++) {
        const dx = x - 34 - k * 14;
        const dy = y - 8 + ((k * 37) % 22);
        ctx.beginPath();
        ctx.ellipse(dx, dy, 5 + (k % 3), 2.4, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // the pen
  if (opts.pen !== false) {
    const pen = computePen(tl, t, theme);
    if (pen) drawPen(ctx, pen, t);
  }
}

/** render one frame to an offscreen canvas (thumbnails / hero) */
export function renderToImage(
  tl: Timeline,
  theme: BoardTheme,
  t: number,
  outW = 640
): string {
  const c = document.createElement("canvas");
  c.width = outW;
  c.height = Math.round((outW * BOARD_H) / BOARD_W);
  const g = c.getContext("2d")!;
  g.scale(outW / BOARD_W, outW / BOARD_W);
  renderFrame(g, tl, t, theme);
  return c.toDataURL("image/jpeg", 0.72);
}
