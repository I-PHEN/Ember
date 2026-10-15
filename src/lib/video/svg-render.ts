/* ------------------------------------------------------------------
   Headless SVG Renderer for Timeline Keyframes & Autonomous Visual Audit.
   Renders any instant t of a Timeline to an exact, deterministic SVG
   document, which can be rasterized via Sharp for multimodal inspection.
------------------------------------------------------------------- */

import {
  BOARD_W,
  BOARD_H,
  THEMES,
  markerColor,
  type BoardTheme,
  type PathStroke,
  type Pt,
  type Stroke,
  type Timeline,
} from "./types";
import { sceneAt, sceneStart } from "./types";
import { strokeDelta, computePen, pointAtLen } from "./render";
import { strokeProgressAt } from "./kinematics";

export function renderTimelineToSvg(
  tl: Timeline,
  t: number,
  theme: BoardTheme = THEMES.blackboard,
  opts: { pen?: boolean } = { pen: true }
): string {
  const elements: string[] = [];

  // 1. Board Background
  elements.push(
    `<rect width="${BOARD_W}" height="${BOARD_H}" fill="${theme.bg}" />`
  );

  // 2. Subtle board framing border
  elements.push(
    `<rect x="1" y="1" width="${BOARD_W - 2}" height="${BOARD_H - 2}" fill="none" stroke="${theme.id === "blackboard" ? "#2a2d33" : "#d8d3c5"}" stroke-width="2" />`
  );

  // 3. Render strokes across visible scenes
  const curSceneIdx = sceneAt(tl, t);
  const maxScene = curSceneIdx >= 0 ? curSceneIdx : tl.scenes.length - 1;

  for (let scIdx = 0; scIdx <= maxScene; scIdx++) {
    const sc = tl.scenes[scIdx];
    const start = sceneStart(tl, scIdx);

    for (const s of sc.strokes) {
      const abs0 = start + s.t0;
      if (t < abs0) continue;

      let p = 1;
      if (t < abs0 + s.dur) {
        const rawP = Math.min(1, Math.max(0, (t - abs0) / s.dur));
        p = s.kind === "path" ? strokeProgressAt(s, rawP) : rawP;
      }

      // Erase fade-out check
      let alpha = 1;
      if (s.eraseScene !== undefined && s.eraseAt !== undefined) {
        const et = sceneStart(tl, s.eraseScene) + s.eraseAt;
        if (t >= et + 0.16) continue;
        if (t >= et) {
          alpha = Math.max(0, 1 - (t - et) / 0.16);
          if (alpha <= 0) continue;
        }
      }

      const d = strokeDelta(tl, s, t);

      if (s.kind === "highlight") {
        const hx = s.rect.x + d.dx;
        const hy = s.rect.y + d.dy;
        const hw = Math.max(Math.min(8, s.rect.w), s.rect.w * p);
        elements.push(
          `<rect x="${hx.toFixed(2)}" y="${hy.toFixed(2)}" width="${hw.toFixed(2)}" height="${s.rect.h.toFixed(2)}" rx="6" fill="${theme.highlight}" opacity="${(alpha * 0.9).toFixed(3)}" />`
        );
      } else if (s.kind === "path" && s.len >= 0.2 && s.width > 0.02) {
        const targetLen = p * s.len;
        const pts: Pt[] = [];

        pts.push({ x: s.pts[0].x + d.dx, y: s.pts[0].y + d.dy });
        for (let i = 1; i < s.pts.length; i++) {
          if (s.cum[i] <= targetLen) {
            pts.push({ x: s.pts[i].x + d.dx, y: s.pts[i].y + d.dy });
          } else {
            const pt = pointAtLen(s, targetLen);
            pts.push({ x: pt.x + d.dx, y: pt.y + d.dy });
            break;
          }
        }

        if (pts.length >= 2) {
          let dStr = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
          for (let i = 1; i < pts.length; i++) {
            dStr += ` L ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)}`;
          }

          const strokeCol = markerColor(theme, s.color);
          const glowFilter = s.glow ? ` filter="drop-shadow(0 0 6px ${strokeCol})"` : "";
          elements.push(
            `<path d="${dStr}" stroke="${strokeCol}" stroke-width="${s.width.toFixed(2)}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${alpha.toFixed(3)}"${glowFilter} />`
          );
        }
      }
    }
  }

  // 4. Render Pen State
  if (opts.pen !== false) {
    const pen = computePen(tl, t, theme);
    if (pen && pen.alpha > 0.05) {
      if (pen.mode === "point") {
        // Deictic pointer (lifted z >= 16px)
        elements.push(
          `<ellipse cx="${(pen.x + 5).toFixed(2)}" cy="${(pen.y + 12).toFixed(2)}" rx="9" ry="3.5" fill="rgba(0,0,0,0.22)" />`
        );
        elements.push(
          `<circle cx="${pen.x.toFixed(2)}" cy="${pen.y.toFixed(2)}" r="6.0" stroke="${pen.color}" stroke-width="1.3" fill="none" opacity="${(pen.alpha * 0.55).toFixed(3)}" />`
        );
        elements.push(
          `<circle cx="${pen.x.toFixed(2)}" cy="${pen.y.toFixed(2)}" r="2.6" fill="${pen.color}" opacity="${(pen.alpha * 0.90).toFixed(3)}" />`
        );
      } else if (pen.lift > 2) {
        // Airborne transit flight
        const zOff = pen.lift * 0.35;
        elements.push(
          `<ellipse cx="${(pen.x + zOff * 0.4).toFixed(2)}" cy="${(pen.y + zOff).toFixed(2)}" rx="4.2" ry="2.0" fill="rgba(0,0,0,0.16)" />`
        );
        elements.push(
          `<circle cx="${pen.x.toFixed(2)}" cy="${pen.y.toFixed(2)}" r="3.4" fill="${pen.color}" opacity="${(pen.alpha * 0.95).toFixed(3)}" />`
        );
      } else {
        // Grounded writing nib
        const restAlpha = pen.mode === "rest" ? 0.45 : 0.95;
        elements.push(
          `<circle cx="${pen.x.toFixed(2)}" cy="${pen.y.toFixed(2)}" r="3.4" fill="${pen.color}" opacity="${(pen.alpha * restAlpha).toFixed(3)}" />`
        );
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOARD_W} ${BOARD_H}" width="${BOARD_W}" height="${BOARD_H}">
${elements.join("\n")}
</svg>`;
}
