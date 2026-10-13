/* ------------------------------------------------------------------
   Scene 8: Outro & Call to Action (Frames 1335 -> 1440 / 0:44.5 -> 0:48.0)
   Brand payoff, Professor Ember signature flourish, and final CTA.
------------------------------------------------------------------- */

import { C, F, W, H } from "../theme";
import { mapRange, Ease } from "../math";
import {
  drawStudioBackdrop,
  drawEmberWordmark,
  drawMixedCenteredLine,
  drawGlassPill,
} from "../fx";

export function renderScene8(ctx: CanvasRenderingContext2D, f: number): void {
  const relF = f - 1335; // 0 -> 105 (3.5 seconds)

  // Warm breathing ambient light pool
  const lampAlpha = mapRange(relF, 0, 24, 0.22, 0.42, Ease.outCubic);
  drawStudioBackdrop(ctx, f, lampAlpha, W / 2, H * 0.42);

  // Top eyebrow pill
  const pillAlpha = mapRange(relF, 2, 18, 0, 1, Ease.outCubic);
  drawGlassPill(ctx, "AVAILABLE NOW  ·  PROFESSOR EMBER", W / 2, 230, {
    amber: true,
    dotColor: C.amber,
    alpha: pillAlpha,
  });

  // Main Ember Wordmark + spark swash
  const wordScale = mapRange(relF, 0, 22, 1.35, 1.65, Ease.outBack);
  const swashP = mapRange(relF, 6, 30, 0, 1, Ease.outCubic);
  const wordAlpha = mapRange(relF, 0, 16, 0, 1, Ease.outCubic);

  ctx.save();
  ctx.globalAlpha = wordAlpha;
  drawEmberWordmark(ctx, W / 2, 415, wordScale, swashP);
  ctx.restore();

  // Mixed-font non-overlapping tagline
  const tagAlpha = mapRange(relF, 14, 32, 0, 1, Ease.outCubic);
  const tagY = mapRange(relF, 14, 32, 535, 515, Ease.outCubic);
  ctx.save();
  ctx.globalAlpha = tagAlpha;
  drawMixedCenteredLine(
    ctx,
    [
      { text: "Every problem, ", font: `600 44px ${F.sans}`, color: C.inkHi },
      { text: "a lesson.", font: `700 54px ${F.hand}`, color: C.amber, dy: 2 },
    ],
    W / 2,
    tagY
  );
  ctx.restore();

  // Final CTA Pill ("Start your first lesson ->")
  if (relF >= 24) {
    const btnIn = mapRange(relF, 24, 44, 0, 1, Ease.outBack);
    const pulse = 1 + Math.sin(relF * 0.14) * 0.015;
    ctx.save();
    ctx.globalAlpha = mapRange(relF, 24, 36, 0, 1, Ease.outCubic);
    ctx.translate(W / 2, 625);
    ctx.scale(btnIn * pulse, btnIn * pulse);

    const btnW = 340;
    const btnH = 62;

    ctx.shadowColor = "rgba(230, 183, 132, 0.38)";
    ctx.shadowBlur = 32;
    ctx.fillStyle = C.amber;
    ctx.beginPath();
    ctx.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 16);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = C.amberInk;
    ctx.font = `700 19px ${F.sans}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Start your first lesson  →", 0, 1);
    ctx.restore();

    // Sub-URL & Stack credits
    const subAlpha = mapRange(relF, 34, 52, 0, 1, Ease.outCubic);
    ctx.save();
    ctx.globalAlpha = subAlpha;
    ctx.fillStyle = C.muted;
    ctx.font = `500 15px ${F.mono}`;
    ctx.textAlign = "center";
    ctx.fillText(
      "ember.study   ·   Multi-Agent Chalkboard + Live Office Hours",
      W / 2,
      715
    );
    ctx.restore();
  }
}
