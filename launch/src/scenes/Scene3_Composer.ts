/* ------------------------------------------------------------------
   Scene 3: The Composer (Frames 270 -> 480 / 0:09 -> 0:16)
   2.5D camera dolly onto the live Ember Hero & Prompt Composer.
   Uses drawMixedCenteredLine so "Every problem, a lesson." never overlaps.
------------------------------------------------------------------- */

import { C, F, W, H } from "../theme";
import { mapRange, Ease, clamp, lerp } from "../math";
import {
  drawStudioBackdrop,
  drawMixedCenteredLine,
  drawGlassPill,
  drawCursor,
  ASSETS,
} from "../fx";

export function renderScene3(ctx: CanvasRenderingContext2D, f: number): void {
  const rel = f - 270; // 0 -> 210 (7.0s)

  drawStudioBackdrop(ctx, f, 0.28, W / 2, H * 0.3);

  // Subtle ambient background frame from real 2-composer.png (if loaded)
  if (ASSETS.composerImg) {
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.drawImage(ASSETS.composerImg, 0, 0, W, H);
    ctx.restore();
  }

  // Smooth What-Ships camera dolly into the composer bar as typing progresses
  const camZoom = mapRange(rel, 20, 165, 1.0, 1.22, Ease.inOutCubic);
  const camFocusY = mapRange(rel, 20, 165, H / 2, H / 2 + 55, Ease.inOutCubic);

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(camZoom, camZoom);
  ctx.translate(-W / 2, -camFocusY);

  // 1. Studio Window Frame
  const winW = 1520;
  const winH = 860;
  const winX = (W - winW) / 2;
  const winY = (H - winH) / 2;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.78)";
  ctx.shadowBlur = 64;
  ctx.shadowOffsetY = 28;
  ctx.fillStyle = "#0b0d11";
  ctx.beginPath();
  ctx.roundRect(winX, winY, winW, winH, 24);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.09)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(winX, winY, winW, winH, 24);
  ctx.stroke();

  // Top Header Bar inside Window
  ctx.fillStyle = "rgba(14, 17, 23, 0.95)";
  ctx.beginPath();
  ctx.roundRect(winX, winY, winW, 64, [24, 24, 0, 0]);
  ctx.fill();

  ctx.strokeStyle = C.hair;
  ctx.beginPath();
  ctx.moveTo(winX, winY + 64);
  ctx.lineTo(winX + winW, winY + 64);
  ctx.stroke();

  // Wordmark in Header
  ctx.fillStyle = C.ink;
  ctx.font = `700 22px ${F.sans}`;
  ctx.textAlign = "left";
  ctx.fillText("Ember", winX + 44, winY + 38);
  ctx.strokeStyle = C.amber;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(winX + 44, winY + 46);
  ctx.lineTo(winX + 106, winY + 46);
  ctx.stroke();

  // Header Right Actions
  ctx.fillStyle = C.muted2;
  ctx.font = `500 13px ${F.sans}`;
  ctx.textAlign = "right";
  ctx.fillText("Gallery      Sign In", winX + winW - 165, winY + 38);

  ctx.fillStyle = "#14171d";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.beginPath();
  ctx.roundRect(winX + winW - 140, winY + 17, 104, 30, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.inkHi;
  ctx.font = `600 12px ${F.sans}`;
  ctx.textAlign = "center";
  ctx.fillText("Open Studio", winX + winW - 88, winY + 36);

  // 2. Hero Eyebrow + Non-Overlapping Headline
  drawGlassPill(ctx, "AI blackboard tutor", W / 2, winY + 138, {
    amber: false,
    fontSize: 12,
  });

  drawMixedCenteredLine(
    ctx,
    [
      { text: "Every problem, ", font: `600 60px ${F.sans}`, color: C.inkHi },
      { text: "a lesson.", font: `600 66px ${F.hand}`, color: C.amber },
    ],
    W / 2,
    winY + 222
  );

  ctx.fillStyle = C.muted;
  ctx.font = `400 19px ${F.sans}`;
  ctx.textAlign = "center";
  ctx.fillText(
    "Paste any STEM problem. Ember plans the lesson, writes it on the board by hand, and explains it aloud.",
    W / 2,
    winY + 266
  );

  // 3. Focused Prompt Composer Well
  const compW = 920;
  const compH = 168;
  const compX = W / 2 - compW / 2;
  const compY = winY + 308;

  const focused = rel >= 16;
  ctx.save();
  if (focused) {
    ctx.shadowColor = "rgba(230, 183, 132, 0.22)";
    ctx.shadowBlur = 32;
  }
  ctx.fillStyle = "#11141b";
  ctx.strokeStyle = focused ? "rgba(230, 183, 132, 0.65)" : "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = focused ? 1.8 : 1;
  ctx.beginPath();
  ctx.roundRect(compX, compY, compW, compH, 20);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Typewriter prompt
  const fullPrompt =
    "Evaluate the indefinite integral ∫ x · e^(2x) dx using integration by parts.";
  const charCount = Math.floor(
    mapRange(rel, 22, 132, 0, fullPrompt.length, Ease.linear)
  );
  const typed = fullPrompt.slice(0, charCount);

  ctx.fillStyle = C.inkHi;
  ctx.font = `500 22px ${F.sans}`;
  ctx.textAlign = "left";
  ctx.fillText(typed, compX + 28, compY + 54);

  // Caret blink
  if (rel < 155 && (rel < 132 || Math.floor(rel / 7) % 2 === 0)) {
    const tw = ctx.measureText(typed).width;
    ctx.fillStyle = C.amber;
    ctx.fillRect(compX + 31 + tw, compY + 32, 2.8, 26);
  }

  // Composer Divider + Bottom Action Row
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(compX + 20, compY + compH - 58);
  ctx.lineTo(compX + compW - 20, compY + compH - 58);
  ctx.stroke();

  ctx.fillStyle = C.muted2;
  ctx.font = `400 13px ${F.sans}`;
  ctx.textAlign = "left";
  ctx.fillText("Press Enter to start", compX + 28, compY + compH - 24);

  // "Start lesson →" button
  const clickP = mapRange(rel, 168, 195, 0, 1, Ease.outCubic);
  const isPressed = rel >= 166 && rel <= 180;
  const btnScale = isPressed ? 0.94 : 1.0;
  const btnW = 152;
  const btnH = 40;
  const btnCx = compX + compW - 22 - btnW / 2;
  const btnCy = compY + compH - 29;

  ctx.save();
  ctx.translate(btnCx, btnCy);
  ctx.scale(btnScale, btnScale);
  ctx.fillStyle = C.amber;
  ctx.shadowColor = "rgba(230, 183, 132, 0.45)";
  ctx.shadowBlur = isPressed ? 24 : 12;
  ctx.beginPath();
  ctx.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
  ctx.fill();

  ctx.fillStyle = C.amberInk;
  ctx.font = `700 14px ${F.sans}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Start lesson  →", 0, 1);
  ctx.restore();

  // 4. Starter Chips Row below Composer
  const chips = [
    "∫ x · e^(2x) dx",
    "RLC Underdamped Response",
    "Kinetic Theory Derivation",
  ];
  let chipX = W / 2 - 280;
  const chipY = compY + compH + 26;

  ctx.fillStyle = C.muted2;
  ctx.font = `400 13px ${F.sans}`;
  ctx.textAlign = "left";
  ctx.fillText("Try:", chipX - 36, chipY + 19);

  chips.forEach((chip, idx) => {
    ctx.font = idx === 0 ? `500 12.5px ${F.mono}` : `500 12.5px ${F.sans}`;
    const cw = ctx.measureText(chip).width + 26;
    ctx.fillStyle = idx === 0 ? "rgba(230, 183, 132, 0.14)" : "#11141c";
    ctx.strokeStyle =
      idx === 0 ? "rgba(230, 183, 132, 0.45)" : "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.roundRect(chipX, chipY, cw, 30, 9);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = idx === 0 ? C.amber : C.muted;
    ctx.fillText(chip, chipX + 13, chipY + 19);
    chipX += cw + 12;
  });

  // 5. Animated Mouse Cursor + Click Ripple
  if (rel >= 115) {
    const moveP = mapRange(rel, 115, 164, 0, 1, Ease.inOutCubic);
    const curX = lerp(compX + 520, btnCx + 8, moveP);
    const curY = lerp(compY + 62, btnCy + 4, moveP);
    drawCursor(ctx, curX, curY, clickP);
  }

  ctx.restore();
}
