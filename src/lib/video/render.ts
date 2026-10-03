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
  mode: "write" | "travel" | "point" | "rest" | "hidden";
  alpha: number;
  lift: number;
  angle: number;
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
    // deictic hold (point beat): marker hovers LIFTED off the board pointing toward the term
    if (active.len < 0.5) {
      const swayX = Math.sin(t * 2.2) * 3.5;
      const swayY = Math.cos(t * 1.8) * 2.0;
      return {
        x: pt.x + swayX,
        y: pt.y + swayY,
        color: markerColor(theme, active.color),
        mode: "point",
        alpha: 1,
        lift: 16 + Math.sin(t * 2.2) * 2.5,
        angle: -0.52 + Math.sin(t * 2.2) * 0.04,
      };
    }
    // writing stroke: dynamic wrist tilt along the stroke tangent
    const nextTarget = Math.min(active.len, p * active.len + 5);
    const nextPt = pointAtLen(active, nextTarget);
    const strokeAngle = Math.atan2(nextPt.y - pt.y, nextPt.x - pt.x);
    const dynamicTilt = Math.sin(strokeAngle) * 0.08;
    return {
      x: pt.x,
      y: pt.y,
      color: markerColor(theme, active.color),
      mode: "write",
      alpha: 1,
      lift: 0,
      angle: -0.64 + dynamicTilt,
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

  if (next && next.t0 - rel < 0.85) {
    const from = prev
      ? prev.pts[prev.pts.length - 1]
      : { x: next.pts[0].x - 30, y: next.pts[0].y + 20 };
    const to = next.pts[0];
    const gapStart = prev ? prev.t0 + prev.dur : Math.max(0, next.t0 - 0.7);
    const gapDur = Math.max(0.04, next.t0 - gapStart);
    const gp = Math.min(1, Math.max(0, (rel - gapStart) / gapDur));
    const e = easeInOut(gp);
    const arcH = Math.sin(Math.PI * gp);
    const lift = 22 * arcH;
    const lateralArc = arcH * 6;
    return {
      x: from.x + (to.x - from.x) * e + lateralArc,
      y: from.y + (to.y - from.y) * e,
      color: markerColor(theme, next.color),
      mode: "travel",
      alpha: 1,
      lift,
      angle: -0.66 + arcH * 0.08,
    };
  }

  // calm ready hover before the first stroke starts in the scene
  if (next && !prev && rel < next.t0) {
    const to = next.pts[0];
    const hoverSway = Math.sin(t * 1.6) * 3;
    return {
      x: to.x - 24 + hoverSway,
      y: to.y + 18 + Math.cos(t * 1.4) * 2,
      color: markerColor(theme, next.color),
      mode: "travel",
      alpha: Math.min(1, rel / 0.5),
      lift: 18,
      angle: -0.58,
    };
  }

  // pen just lifted from the board — drift down-and-away while fading
  if (prev && rel - (prev.t0 + prev.dur) < 1.3) {
    const end = prev.pts[prev.pts.length - 1];
    const idle = rel - (prev.t0 + prev.dur);
    const drift = easeInOut(Math.min(1, idle / 0.9));
    return {
      x: end.x + 18 * drift,
      y: end.y + 24 * drift,
      color: markerColor(theme, prev.color),
      mode: "rest",
      alpha: 1 - Math.max(0, (idle - 0.6) / 0.7),
      lift: 14 * drift,
      angle: -0.60,
    };
  }
  return null;
}

function drawPen(
  ctx: CanvasRenderingContext2D,
  pen: PenState,
  t: number
): void {
  const writing = pen.mode === "write" && pen.lift < 2;
  const pointing = pen.mode === "point";
  const rest = pen.mode === "rest";

  ctx.save();
  const baseAlpha = Math.max(0, Math.min(1, pen.alpha));
  ctx.globalAlpha = rest ? baseAlpha * 0.45 : baseAlpha;

  const dotX = pen.x;
  const dotY = pen.y - (writing ? 0 : Math.min(8, pen.lift * 0.3));

  // 1. Soft glowing aura (slightly larger and pulsing during deictic pointing)
  const haloR = pointing ? 9.0 + Math.sin(t * 3.5) * 1.5 : writing ? 6.0 : 4.5;
  const haloAlpha = pointing ? 0.40 + Math.sin(t * 3.5) * 0.15 : writing ? 0.25 : 0.15;

  ctx.save();
  ctx.fillStyle = pen.color;
  ctx.globalAlpha = baseAlpha * haloAlpha;
  ctx.beginPath();
  ctx.arc(dotX, dotY, haloR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Solid color disc (radius ~3.5px) matching current ink color
  const coreR = pointing ? 4.2 : 3.4;
  ctx.save();
  ctx.fillStyle = pen.color;
  ctx.globalAlpha = baseAlpha * 0.95;
  ctx.beginPath();
  ctx.arc(dotX, dotY, coreR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 3. Crisp white center pinpoint (radius ~1.4px) - the tablet stylus contact point
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = baseAlpha;
  ctx.beginPath();
  ctx.arc(dotX, dotY, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 4. In pointing mode: subtle pointing focus ring
  if (pointing) {
    ctx.save();
    ctx.strokeStyle = pen.color;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = baseAlpha * (0.5 + Math.sin(t * 4.0) * 0.25);
    ctx.beginPath();
    ctx.arc(dotX, dotY, 13 + Math.sin(t * 3.0) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

/* ----------------------------- eraser ------------------------------ */

function drawEraserSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tilt = -0.08
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);

  // soft shadow cast on the board
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.30)";
  ctx.beginPath();
  ctx.ellipse(3, 14, 28, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // dark felt erasing pad on the bottom
  ctx.fillStyle = "#23262a";
  ctx.beginPath();
  ctx.roundRect(-32, -4, 64, 14, [0, 0, 4, 4]);
  ctx.fill();

  // felt texture divider line
  ctx.strokeStyle = "#383c44";
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-32, 2);
  ctx.lineTo(32, 2);
  ctx.stroke();

  // natural hardwood handle on top (warm birch/oak block)
  const woodGrad = ctx.createLinearGradient(0, -22, 0, -4);
  woodGrad.addColorStop(0, "#d8a46e");
  woodGrad.addColorStop(0.5, "#c6925c");
  woodGrad.addColorStop(1, "#b57f49");
  ctx.fillStyle = woodGrad;
  ctx.beginPath();
  ctx.roundRect(-32, -22, 64, 18, [5, 5, 1, 1]);
  ctx.fill();

  // ergonomic grip indent along top
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath();
  ctx.roundRect(-22, -19, 44, 4, 2);
  ctx.fill();

  // subtle top highlight
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-30, -21);
  ctx.lineTo(30, -21);
  ctx.stroke();

  // outer border
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-32, -22, 64, 32, 5);
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
        alpha = 1 - (t - et) / 0.16;
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
      if (dt < 0 || dt > 0.65) continue;
      const prog = Math.min(1, dt / 0.55);
      const x = sw.region.x - 50 + prog * (sw.region.w + 100);
      const y = sw.region.y + sw.region.h / 2;
      const tilt = -0.06 + Math.sin(prog * Math.PI) * 0.05;
      drawEraserSprite(ctx, x, y, tilt);

      // realistic chalk dust plume behind the eraser felt pad
      ctx.save();
      const dustAlpha = 0.28 * Math.pow(1 - prog, 1.4);
      ctx.fillStyle = theme.id === "blackboard" ? "rgba(225,230,238," : "rgba(120,115,105,";
      for (let k = 0; k < 7; k++) {
        const dx = x - 32 - k * 16 - (k % 3) * 6;
        const dy = y - 10 + ((k * 43) % 24) + (prog * 6);
        const r = 4.5 + (k % 4) * 1.5;
        ctx.beginPath();
        ctx.fillStyle = `${theme.id === "blackboard" ? "rgba(225,230,238," : "rgba(120,115,105,"}${(dustAlpha * (1 - k / 8)).toFixed(3)})`;
        ctx.ellipse(dx, dy, r, r * 0.7, 0.2, 0, Math.PI * 2);
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
