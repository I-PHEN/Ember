/* ------------------------------------------------------------------
   Scene 1: The Hook (Frames 0 -> 150 / 0:00 -> 0:05)
   What Ships consumer launch pacing: 120 BPM kinetic typography,
   floating chatbot card struck through with chalk, and the core
   thesis: "An answer is not a lesson."
------------------------------------------------------------------- */

import { C, F, W, H } from "../theme";
import { mapRange, Ease, clamp, lerp } from "../math";
import { drawStudioBackdrop, drawMixedCenteredLine, drawGlassPill } from "../fx";

export function renderScene1(ctx: CanvasRenderingContext2D, f: number): void {
  drawStudioBackdrop(ctx, f, 0.24);

  // Beat 1..3 (Frames 0 -> 48): "01:04 AM · Exam in three days."
  if (f < 52) {
    const enter = mapRange(f, 0, 14, 0, 1, Ease.outBack);
    const exit = f > 40 ? mapRange(f, 40, 52, 1, 0, Ease.inQuad) : 1;
    const scale = lerp(0.92, 1.0, enter);

    ctx.save();
    ctx.globalAlpha = clamp(enter) * exit;
    ctx.translate(W / 2, H / 2);
    ctx.scale(scale, scale);

    drawGlassPill(ctx, "01:04 AM  ·  EXAM IN 3 DAYS", 0, -110, {
      amber: true,
      dotColor: C.amber,
      fontSize: 14,
    });

    ctx.fillStyle = C.inkHi;
    ctx.font = `700 78px ${F.sans}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Stuck on problem four.", 0, -10);

    ctx.fillStyle = C.muted;
    ctx.font = `400 28px ${F.sans}`;
    ctx.fillText("You paste it into AI. It dumps the final answer in 0.2 seconds.", 0, 68);
    ctx.restore();
  }

  // Beat 4..6 (Frames 44 -> 98): The Chatbot Answer Dump Card + Chalk Strikeout
  if (f >= 44 && f < 102) {
    const rel = f - 44;
    const pop = mapRange(rel, 0, 14, 0, 1, Ease.outBack);
    const fadeOut = f > 90 ? mapRange(f, 90, 102, 1, 0, Ease.inQuad) : 1;

    ctx.save();
    ctx.globalAlpha = clamp(pop) * fadeOut;
    ctx.translate(W / 2, H / 2 - 10);
    const sc = lerp(0.9, 1.0, pop);
    ctx.scale(sc, sc);

    const cw = 980;
    const ch = 310;

    // Deep drop shadow
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.72)";
    ctx.shadowBlur = 50;
    ctx.shadowOffsetY = 24;
    ctx.fillStyle = "#14171f";
    ctx.beginPath();
    ctx.roundRect(-cw / 2, -ch / 2, cw, ch, 24);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-cw / 2, -ch / 2, cw, ch, 24);
    ctx.stroke();

    // Top bar
    ctx.fillStyle = "#6a7180";
    ctx.font = `600 13px ${F.mono}`;
    ctx.textAlign = "left";
    ctx.fillText("GENERIC AI CHATBOT  ·  INSTANT TEXT DUMP", -cw / 2 + 36, -ch / 2 + 44);

    // User bubble
    ctx.fillStyle = "#1d222e";
    ctx.beginPath();
    ctx.roundRect(-cw / 2 + 36, -ch / 2 + 66, 460, 48, 12);
    ctx.fill();
    ctx.fillStyle = C.inkHi;
    ctx.font = `500 18px ${F.sans}`;
    ctx.fillText("Evaluate  ∫ x · e^(2x) dx", -cw / 2 + 56, -ch / 2 + 96);

    // Bot wall-of-math dump
    ctx.fillStyle = "rgba(255, 122, 118, 0.08)";
    ctx.strokeStyle = "rgba(255, 122, 118, 0.28)";
    ctx.beginPath();
    ctx.roundRect(-cw / 2 + 36, -ch / 2 + 132, cw - 72, 136, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ff7a76";
    ctx.font = `600 26px ${F.mono}`;
    ctx.fillText("= ½ x·e^(2x) − ¼ e^(2x) + C", -cw / 2 + 60, -ch / 2 + 186);

    ctx.fillStyle = C.muted;
    ctx.font = `400 17px ${F.sans}`;
    ctx.fillText("No voice. No board. No why. Good luck on Friday's exam.", -cw / 2 + 60, -ch / 2 + 232);

    // Diagonal warm amber chalk strike-through across the chatbot card (rel >= 22)
    if (rel >= 20) {
      const strikeP = mapRange(rel, 20, 34, 0, 1, Ease.outExpo);
      ctx.strokeStyle = C.amber;
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.shadowColor = C.amber;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(-cw / 2 + 60, ch / 2 - 40);
      ctx.lineTo(
        lerp(-cw / 2 + 60, cw / 2 - 60, strikeP),
        lerp(ch / 2 - 40, -ch / 2 + 40, strikeP)
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  // Beat 7..10 (Frames 94 -> 150): Kinetic Thesis Statement
  if (f >= 94) {
    const rel = f - 94;
    const enter = mapRange(rel, 0, 14, 0, 1, Ease.outBack);
    const sc = lerp(0.92, 1.0, enter);

    ctx.save();
    ctx.globalAlpha = clamp(enter);
    ctx.translate(W / 2, H / 2);
    ctx.scale(sc, sc);

    drawMixedCenteredLine(
      ctx,
      [
        { text: "An answer is not ", font: `700 82px ${F.sans}`, color: C.inkHi },
        { text: "a lesson.", font: `600 88px ${F.hand}`, color: C.amber },
      ],
      0,
      -12
    );

    if (rel >= 12) {
      const subP = mapRange(rel, 12, 26, 0, 1, Ease.outCubic);
      ctx.globalAlpha = subP;
      ctx.fillStyle = C.muted;
      ctx.font = `400 28px ${F.sans}`;
      ctx.textAlign = "center";
      ctx.fillText(
        "You don't need a chat bubble. You need a professor at the board.",
        0,
        66
      );
    }

    ctx.restore();
  }
}
