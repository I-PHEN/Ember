/* ------------------------------------------------------------------
   Scene 2: The Spark & Reveal (Frames 150 -> 270 / 0:05 -> 0:09)
   A glowing amber spark streaks across the dark canvas and ignites
   the Ember wordmark, tagline, and university STEM disciplines.
------------------------------------------------------------------- */

import { C, F, W, H } from "../theme";
import { mapRange, Ease, clamp, lerp } from "../math";
import { drawStudioBackdrop, drawEmberWordmark, drawMixedCenteredLine, drawGlassPill } from "../fx";

export function renderScene2(ctx: CanvasRenderingContext2D, f: number): void {
  const rel = f - 150; // 0 -> 120 (4.0s)

  const lampIntensity = mapRange(rel, 0, 45, 0.14, 0.42, Ease.outCubic);
  drawStudioBackdrop(ctx, f, lampIntensity, W / 2, H * 0.42);

  // 1. Glowing Ember Mark above Wordmark (rel: 0 -> 45)
  const sparkP = mapRange(rel, 0, 32, 0, 1, Ease.outCubic);
  ctx.save();
  ctx.translate(W / 2 - 64, H / 2 - 210);
  ctx.scale(4.0, 4.0);

  ctx.strokeStyle = C.amber;
  ctx.lineWidth = 3.8;
  ctx.lineCap = "round";
  ctx.shadowColor = C.amber;
  ctx.shadowBlur = 12;

  ctx.beginPath();
  ctx.moveTo(4, 22);
  ctx.bezierCurveTo(
    lerp(4, 10, sparkP),
    lerp(22, 19.8, sparkP),
    lerp(4, 21.5, sparkP),
    lerp(22, 20, sparkP),
    lerp(4, 27.5, sparkP),
    lerp(22, 14, sparkP)
  );
  ctx.stroke();

  if (sparkP > 0.65) {
    const dotS = mapRange(sparkP, 0.65, 1, 0, 1, Ease.outBack);
    ctx.fillStyle = C.amber;
    ctx.beginPath();
    ctx.arc(26.5, 7.5, 3.1 * dotS, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 2. Main Wordmark "Ember" + Swash (rel: 14 -> 60)
  if (rel >= 12) {
    const wordIn = mapRange(rel, 12, 34, 0, 1, Ease.outBack);
    const swashP = mapRange(rel, 24, 54, 0, 1, Ease.outCubic);

    ctx.save();
    ctx.globalAlpha = clamp(wordIn);
    const sc = lerp(0.88, 1.48, clamp(wordIn));
    drawEmberWordmark(ctx, W / 2, H / 2 - 20, sc, swashP);
    ctx.restore();
  }

  // 3. Tagline + Professor Signature (rel: 36 -> 120)
  if (rel >= 34) {
    const tagIn = mapRange(rel, 34, 54, 0, 1, Ease.outCubic);
    ctx.save();
    ctx.globalAlpha = tagIn;

    drawMixedCenteredLine(
      ctx,
      [
        { text: "Every problem, ", font: `500 38px ${F.sans}`, color: C.inkHi },
        { text: "a lesson.", font: `600 44px ${F.hand}`, color: C.amber },
      ],
      W / 2,
      H / 2 + 86
    );

    ctx.fillStyle = C.muted;
    ctx.font = `400 20px ${F.sans}`;
    ctx.textAlign = "center";
    ctx.fillText(
      "Planned like a university lecture. Handwritten on the board. Taught aloud.",
      W / 2,
      H / 2 + 136
    );
    ctx.restore();
  }

  // 4. Floating STEM Subject Pills fanning out at the bottom (rel >= 50)
  if (rel >= 50) {
    const subjects = ["CALCULUS", "MECHANICS", "CIRCUITS", "ODES", "THERMODYNAMICS", "CHEMISTRY"];
    const spacing = 190;
    const startX = W / 2 - ((subjects.length - 1) * spacing) / 2;

    subjects.forEach((subj, idx) => {
      const delay = 50 + idx * 4;
      const p = mapRange(rel, delay, delay + 16, 0, 1, Ease.outBack);
      if (p <= 0) return;
      drawGlassPill(ctx, subj, startX + idx * spacing, H / 2 + 215, {
        amber: idx === 0 || idx === 2,
        scale: clamp(p),
        alpha: clamp(p),
        fontSize: 12,
      });
    });
  }
}
