/* ------------------------------------------------------------------
   Scene 5: The Live Blackboard Engine (Frames 690 -> 1020 / 0:23 -> 0:34)
   Hero showcase of Ember's deterministic frame-accurate blackboard:
   live single-stroke Hershey chalk handwriting, synchronized voice
   waveform + captions, and real-time feature callouts.
------------------------------------------------------------------- */

import { C, F, W, H } from "../theme";
import { mapRange, Ease, clamp, lerp } from "../math";
import { drawLiveBoard, FLAGSHIP_TIMELINE } from "../board-bridge";
import { drawStudioBackdrop, drawGlassPill } from "../fx";

export function renderScene5(ctx: CanvasRenderingContext2D, f: number): void {
  const rel = f - 690; // 0 -> 330 frames (11.0 seconds)

  drawStudioBackdrop(ctx, f, 0.2, W / 2, H / 2);

  // Advance through the full continuous calculus derivation + yellow boxed answer
  const dur = FLAGSHIP_TIMELINE.duration;
  const boardTimeSec = mapRange(rel, 0, 315, dur * 0.14, dur * 0.99, Ease.linear);

  // Subtle cinematic camera push-in onto the board
  const camScale = mapRange(rel, 0, 330, 0.98, 1.03, Ease.inOutQuad);

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(camScale, camScale);
  ctx.translate(-W / 2, -H / 2);

  const boardW = 1520;
  const boardH = 855;
  const boardX = (W - boardW) / 2;
  const boardY = 78;

  // Deep shadow + outer frame
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
  ctx.shadowBlur = 70;
  ctx.shadowOffsetY = 28;
  ctx.fillStyle = "#0b0d11";
  ctx.beginPath();
  ctx.roundRect(boardX - 10, boardY - 10, boardW + 20, boardH + 20, 22);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "rgba(230, 183, 132, 0.25)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(boardX - 10, boardY - 10, boardW + 20, boardH + 20, 22);
  ctx.stroke();

  // Render Ember's REAL single-stroke Hershey chalkboard
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(boardX, boardY, boardW, boardH, 16);
  ctx.clip();
  drawLiveBoard(ctx, boardTimeSec, "blackboard", boardX, boardY, boardW, boardH);
  ctx.restore();

  // Top-left Chapter HUD inside the board
  const chapterName =
    rel < 105
      ? "01 · Understanding the integral & LIATE strategy"
      : rel < 215
      ? "02 · Assigning u, dv and computing du, v"
      : "03 · Evaluating the final integral & boxing result";

  ctx.fillStyle = "rgba(12, 14, 18, 0.86)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.beginPath();
  ctx.roundRect(boardX + 24, boardY + 22, 460, 40, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = C.live;
  ctx.beginPath();
  ctx.arc(boardX + 44, boardY + 42, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = C.inkHi;
  ctx.font = `600 13px ${F.sans}`;
  ctx.textAlign = "left";
  ctx.fillText(chapterName, boardX + 60, boardY + 47);

  // Top-right Engine Badge
  drawGlassPill(
    ctx,
    "SINGLE-STROKE HERSHEY ENGINE · 165 PX/S",
    boardX + boardW - 215,
    boardY + 42,
    { amber: true, fontSize: 11.5 }
  );

  // Bottom Live Voice + Caption Bar inside the board
  const capW = 1060;
  const capH = 62;
  const capX = W / 2 - capW / 2;
  const capY = boardY + boardH - 82;

  ctx.fillStyle = "rgba(12, 14, 18, 0.9)";
  ctx.strokeStyle = "rgba(230, 183, 132, 0.32)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(capX, capY, capW, capH, 16);
  ctx.fill();
  ctx.stroke();

  // Animated Aoede voice waveform bars on left of caption bar
  for (let i = 0; i < 14; i++) {
    const h = 8 + Math.abs(Math.sin(rel * 0.28 + i * 0.7)) * 24;
    ctx.fillStyle = C.amber;
    ctx.beginPath();
    ctx.roundRect(capX + 22 + i * 7, capY + 31 - h / 2, 4, h, 2);
    ctx.fill();
  }

  const spokenLine =
    rel < 110
      ? "“Since algebraic x comes before exponential e^(2x) in LIATE, we choose u = x.”"
      : rel < 220
      ? "“Differentiating u gives du = dx, and integrating dv gives v = ½ e^(2x).”"
      : "“Integrating e^(2x) brings down another ½ — giving ½ x·e^(2x) − ¼ e^(2x) + C.”";

  ctx.fillStyle = C.inkHi;
  ctx.font = `500 17px ${F.sans}`;
  ctx.textAlign = "left";
  ctx.fillText(spokenLine, capX + 135, capY + 37);

  ctx.restore();
}
