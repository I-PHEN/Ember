/* ------------------------------------------------------------------
   Ember Launch Film: Visual FX, 2.5D Card Projection & Kinetic Type
   Provides What Ships consumer-grade motion polish while strictly
   honoring Ember's frozen brand tokens (#111315 base, #e6b784 amber).
------------------------------------------------------------------- */

import { C, F, W, H } from "./theme";
import { clamp, lerp, mapRange, Ease } from "./math";

export interface LoadedAssets {
  galleryImg: HTMLImageElement | null;
  composerImg: HTMLImageElement | null;
  directorImg: HTMLImageElement | null;
  studioImg: HTMLImageElement | null;
  voiceBuffer: ArrayBuffer | null;
}

export const ASSETS: LoadedAssets = {
  galleryImg: null,
  composerImg: null,
  directorImg: null,
  studioImg: null,
  voiceBuffer: null,
};

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function preloadFilmAssets(): Promise<void> {
  // Load BoardHand font so canvas 2D uses the exact app handwriting font
  try {
    const font = new FontFace("BoardHand", "url(/public/fonts/board-hand.woff2)");
    const loaded = await font.load();
    (document as any).fonts.add(loaded);
  } catch {
    // Fallback to cursive if font fails
  }

  const [g, c, d, s, v] = await Promise.all([
    loadImg("/public/demo-assets/1-gallery.png"),
    loadImg("/public/demo-assets/2-composer.png"),
    loadImg("/public/demo-assets/3-director.png"),
    loadImg("/public/demo-assets/4-studio.png"),
    fetch("/public/demo-audio.mp3")
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .catch(() => null),
  ]);

  ASSETS.galleryImg = g;
  ASSETS.composerImg = c;
  ASSETS.directorImg = d;
  ASSETS.studioImg = s;
  ASSETS.voiceBuffer = v;
}

// Pre-cached 256x256 film grain tile (0.1ms draw per frame)
let grainCanvas: HTMLCanvasElement | null = null;
function getGrainTile(): HTMLCanvasElement {
  if (!grainCanvas) {
    grainCanvas = document.createElement("canvas");
    grainCanvas.width = 220;
    grainCanvas.height = 220;
    const gctx = grainCanvas.getContext("2d")!;
    const img = gctx.createImageData(220, 220);
    let seed = 1337;
    for (let i = 0; i < img.data.length; i += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const v = 220 + (seed & 31);
      img.data[i] = v;
      img.data[i + 1] = v - 3;
      img.data[i + 2] = v - 8;
      img.data[i + 3] = 9; // subtle 3.5% warm grain
    }
    gctx.putImageData(img, 0, 0);
  }
  return grainCanvas;
}

/**
 * Draws Ember's signature warm charcoal room (#111315) with the breathing
 * overhead amber lamp pool and subtle surface grain.
 */
export function drawStudioBackdrop(
  ctx: CanvasRenderingContext2D,
  frame: number,
  lampIntensity = 0.22,
  lampX = W / 2,
  lampY = H * 0.34
): void {
  ctx.fillStyle = C.base;
  ctx.fillRect(0, 0, W, H);

  // Top charcoal gradient wash
  const wash = ctx.createLinearGradient(0, 0, 0, H);
  wash.addColorStop(0, "#101214");
  wash.addColorStop(0.45, "#111315");
  wash.addColorStop(1, "#0d0f12");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);

  // Breathing overhead warm lamp pool
  const breathe = 1 + Math.sin(frame * 0.04) * 0.08;
  const r = 740 * breathe;
  const lamp = ctx.createRadialGradient(lampX, lampY, 20, lampX, lampY, r);
  lamp.addColorStop(0, `rgba(230, 183, 132, ${lampIntensity})`);
  lamp.addColorStop(0.45, `rgba(230, 183, 132, ${lampIntensity * 0.32})`);
  lamp.addColorStop(1, "rgba(17, 19, 21, 0)");
  ctx.fillStyle = lamp;
  ctx.fillRect(0, 0, W, H);

  // Subtle surface grain
  const pat = ctx.createPattern(getGrainTile(), "repeat");
  if (pat) {
    ctx.save();
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

/**
 * Draws a centered single line of mixed-font text (e.g. sans + BoardHand amber)
 * with exact width measurement so segments NEVER overlap.
 */
export interface TextSegment {
  text: string;
  font: string;
  color: string;
  dy?: number;
}

export function drawMixedCenteredLine(
  ctx: CanvasRenderingContext2D,
  segments: TextSegment[],
  cx: number,
  cy: number
): void {
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const widths: number[] = [];
  let totalW = 0;
  for (const s of segments) {
    ctx.font = s.font;
    const w = ctx.measureText(s.text).width;
    widths.push(w);
    totalW += w;
  }

  let x = cx - totalW / 2;
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    ctx.font = s.font;
    ctx.fillStyle = s.color;
    ctx.fillText(s.text, x, cy + (s.dy || 0));
    x += widths[i];
  }
  ctx.restore();
}

/**
 * Draws a glowing specular glass pill badge (eyebrow or feature callout).
 */
export function drawGlassPill(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  opts: {
    amber?: boolean;
    dotColor?: string;
    scale?: number;
    alpha?: number;
    fontSize?: number;
  } = {}
): void {
  const { amber = false, dotColor, scale = 1, alpha = 1, fontSize = 13 } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  ctx.font = `600 ${fontSize}px ${F.mono}`;
  const tw = ctx.measureText(text).width;
  const dotSpace = dotColor ? 18 : 0;
  const pw = tw + dotSpace + 34;
  const ph = fontSize + 20;

  ctx.fillStyle = amber ? "rgba(230, 183, 132, 0.13)" : "rgba(20, 23, 30, 0.88)";
  ctx.strokeStyle = amber ? "rgba(230, 183, 132, 0.42)" : "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2);
  ctx.fill();
  ctx.stroke();

  if (dotColor) {
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(-pw / 2 + 18, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = amber ? C.amber : C.inkHi;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, dotSpace / 2, 1);
  ctx.restore();
}

/**
 * Draws the official Ember Wordmark + spark swash at any center position and scale.
 */
export function drawEmberWordmark(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale = 1,
  swashProgress = 1
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // "Ember" text
  ctx.fillStyle = C.ink;
  ctx.font = `700 64px ${F.sans}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Ember", 0, 0);

  // The stroke that raises a spark (exact SVG path from Wordmark.tsx)
  if (swashProgress > 0) {
    ctx.save();
    ctx.translate(-92, 10);
    ctx.scale(1.55, 1.55);
    ctx.strokeStyle = C.amber;
    ctx.lineWidth = 3.4;
    ctx.lineCap = "round";

    const p = clamp(swashProgress);
    const endX = lerp(4, 110.5, p);
    const endY = lerp(12, 4.8, Math.pow(p, 1.5));

    ctx.beginPath();
    ctx.moveTo(4, 12);
    ctx.bezierCurveTo(
      lerp(4, 30, p),
      lerp(12, 9.6, p),
      lerp(4, 88, p),
      lerp(12, 9.5, p),
      endX,
      endY
    );
    ctx.stroke();

    if (p > 0.82) {
      const dotP = mapRange(p, 0.82, 1, 0, 1, Ease.outBack);
      ctx.fillStyle = C.amber;
      ctx.shadowColor = C.amber;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(109, 2.4, 2.3 * dotP, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws a crisp glowing mouse cursor with optional click ripple ring.
 */
export function drawCursor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  clickProgress = 0
): void {
  ctx.save();
  ctx.translate(x, y);

  if (clickProgress > 0 && clickProgress < 1) {
    ctx.strokeStyle = `rgba(230, 183, 132, ${1 - clickProgress})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(4, 4, 8 + clickProgress * 34, 0, Math.PI * 2);
    ctx.stroke();
  }

  const s = clickProgress > 0 && clickProgress < 0.4 ? 0.88 : 1;
  ctx.scale(s, s);

  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;

  ctx.fillStyle = "#f4f4f6";
  ctx.strokeStyle = "#111315";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 24);
  ctx.lineTo(6.5, 18.5);
  ctx.lineTo(12.5, 28);
  ctx.lineTo(16.5, 25.5);
  ctx.lineTo(10.5, 16);
  ctx.lineTo(19, 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
