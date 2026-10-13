/* ------------------------------------------------------------------
   Bridge to Ember's real blackboard rendering engine.
   Renders deterministic single-stroke Hershey chalk strokes onto
   any HTML5 canvas at any timestamp t, with LRU frame caching so
   multi-board montages render in < 1ms per frame.
------------------------------------------------------------------- */

import { compileTimeline } from "../../src/lib/video/compile";
import { renderFrame } from "../../src/lib/video/render";
import { THEMES, BoardThemeId, Timeline, SolveScript } from "../../src/lib/video/types";

/**
 * Continuous single-board showcase script so the chalkboard accumulates
 * the full derivation + boxed final answer without mid-scene erases!
 */
export const LAUNCH_SHOWCASE_SCRIPT: SolveScript = {
  title: "Integration by Parts: ∫ x·e^(2x) dx",
  subject: "Calculus",
  question: "Evaluate the indefinite integral ∫ x · e^(2x) dx using integration by parts.",
  scenes: [
    {
      chapter: "Integration by Parts",
      narration:
        "Evaluate the integral of x times e to the two x dx using integration by parts. Formula integral of u dv equals u v minus integral of v du. Let u equal x so du equals dx, and dv equal e to the two x dx so v equals one half e to the two x. Applying the formula gives one half x e to the two x minus one half integral of e to the two x dx, which equals one half x e to the two x minus one fourth e to the two x plus C.",
      beats: [
        { type: "title", text: "Integration by Parts", color: "yellow" },
        {
          type: "write",
          text: "Evaluate:  ∫ x · e^(2x) dx",
          color: "blue",
          size: "lg",
        },
        {
          type: "write",
          text: "Formula:   ∫ u dv = u·v − ∫ v du",
          color: "orange",
          size: "md",
        },
        {
          type: "underline",
          target: "text:Formula:   ∫ u dv = u·v − ∫ v du",
          color: "orange",
        },
        {
          type: "write",
          text: "u = x  →  du = dx,   dv = e^(2x) dx  →  v = ½ e^(2x)",
          color: "white",
          size: "sm",
        },
        {
          type: "write",
          text: "∫ x·e^(2x) dx  =  ½ x·e^(2x) − ½ ∫ e^(2x) dx",
          color: "white",
          size: "md",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "½ x·e^(2x) − ¼ e^(2x) + C",
          color: "green",
          size: "lg",
        },
        {
          type: "box",
          target: "text:½ x·e^(2x) − ¼ e^(2x) + C",
          color: "yellow",
        },
        {
          type: "point",
          target: "text:½ x·e^(2x) − ¼ e^(2x) + C",
          ms: 1200,
        },
      ],
    },
  ],
};

// Precompile the continuous showcase timeline once
export const FLAGSHIP_TIMELINE: Timeline = compileTimeline(LAUNCH_SHOWCASE_SCRIPT);

const snapshotCache = new Map<string, HTMLCanvasElement>();

/**
 * Draws the real Ember chalkboard at progress `boardProgress` (or seconds)
 * directly into target context `ctx` scaled into `destRect`.
 */
export function drawLiveBoard(
  ctx: CanvasRenderingContext2D,
  boardTimeSeconds: number,
  themeId: BoardThemeId = "blackboard",
  destX = 0,
  destY = 0,
  destW = 1280,
  destH = 720
): void {
  const clampedT = Math.max(0, Math.min(FLAGSHIP_TIMELINE.duration, boardTimeSeconds));
  const qTime = Math.round(clampedT * 20) / 20;
  const key = `${themeId}:${qTime.toFixed(2)}`;
  let snap = snapshotCache.get(key);

  if (!snap) {
    snap = document.createElement("canvas");
    snap.width = 1280;
    snap.height = 720;
    const bCtx = snap.getContext("2d")!;
    const theme = THEMES[themeId] || THEMES.blackboard;
    renderFrame(bCtx, FLAGSHIP_TIMELINE, qTime, theme, { pen: true });

    if (snapshotCache.size > 4096) {
      const firstKey = snapshotCache.keys().next().value;
      if (firstKey) snapshotCache.delete(firstKey);
    }
    snapshotCache.set(key, snap);
  }

  ctx.drawImage(snap, 0, 0, 1280, 720, destX, destY, destW, destH);
}
