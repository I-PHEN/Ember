/* ------------------------------------------------------------------
   Scene 7: 3 Board Themes & The Library of Thought (Frames 1230 -> 1335 / 0:41 -> 0:44.5)
   Fast rhythmic showcase of Blackboard, Whiteboard, and Engineering
   Paper themes + Community Solves Gallery.
------------------------------------------------------------------- */

import { C, F, W, H } from "../theme";
import { mapRange, Ease, clamp, lerp } from "../math";
import { drawLiveBoard, FLAGSHIP_TIMELINE } from "../board-bridge";
import { drawStudioBackdrop, drawGlassPill, drawMixedCenteredLine } from "../fx";

export function renderScene7(ctx: CanvasRenderingContext2D, f: number): void {
  const rel = f - 1230; // 0 -> 105 frames (3.5 seconds)

  drawStudioBackdrop(ctx, f, 0.24, W / 2, H * 0.25);

  drawGlassPill(ctx, "SWITCHABLE LIVE SURFACES  ·  COMMUNITY GALLERY", W / 2, 74, {
    amber: true,
    fontSize: 12,
  });

  drawMixedCenteredLine(
    ctx,
    [
      { text: "Three live surfaces. ", font: `700 50px ${F.sans}`, color: C.inkHi },
      { text: "The Library of Thought.", font: `600 54px ${F.hand}`, color: C.amber },
    ],
    W / 2,
    144
  );

  const themes = [
    {
      id: "blackboard" as const,
      title: "Blackboard",
      sub: "Warm charcoal slate (#131417) with organic chalk dust",
      badge: "DEFAULT STUDIO",
    },
    {
      id: "whiteboard" as const,
      title: "Whiteboard",
      sub: "Crisp dry-erase marker (#fbfaf6) for bright study rooms",
      badge: "HIGH CONTRAST",
    },
    {
      id: "paper" as const,
      title: "Engineering Paper",
      sub: "Warm cream sheet (#f6efdd) for structural derivations",
      badge: "NOTEBOOK FEEL",
    },
  ];

  const cardW = 550;
  const cardH = 440;
  const gap = 34;
  const startX = (W - (3 * cardW + 2 * gap)) / 2;
  const cardY = 200;

  themes.forEach((th, idx) => {
    const delay = idx * 8;
    const enter = mapRange(rel, delay, delay + 20, 0, 1, Ease.outBack);
    const cx = startX + idx * (cardW + gap);

    ctx.save();
    ctx.translate(cx + cardW / 2, cardY + cardH / 2);
    ctx.scale(lerp(0.88, 1.0, enter), lerp(0.88, 1.0, enter));
    ctx.translate(-(cx + cardW / 2), -(cardY + cardH / 2));
    ctx.globalAlpha = clamp(enter);

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.72)";
    ctx.shadowBlur = 44;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = "#11141a";
    ctx.beginPath();
    ctx.roundRect(cx, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle =
      idx === 0 ? "rgba(230, 183, 132, 0.45)" : "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = idx === 0 ? 1.8 : 1.2;
    ctx.beginPath();
    ctx.roundRect(cx, cardY, cardW, cardH, 20);
    ctx.stroke();

    // Cached real board snapshot in each theme showing the full derivation + boxed answer
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cx + 10, cardY + 10, cardW - 20, cardH - 110, 14);
    ctx.clip();
    drawLiveBoard(
      ctx,
      FLAGSHIP_TIMELINE.duration * 0.96,
      th.id,
      cx + 10,
      cardY + 10,
      cardW - 20,
      cardH - 110
    );
    ctx.restore();

    // Card Footer
    ctx.fillStyle = C.amber;
    ctx.font = `700 11px ${F.mono}`;
    ctx.textAlign = "right";
    ctx.fillText(th.badge, cx + cardW - 24, cardY + cardH - 64);

    ctx.fillStyle = C.inkHi;
    ctx.font = `600 20px ${F.sans}`;
    ctx.textAlign = "left";
    ctx.fillText(th.title, cx + 24, cardY + cardH - 60);

    ctx.fillStyle = C.muted;
    ctx.font = `400 14px ${F.sans}`;
    ctx.fillText(th.sub, cx + 24, cardY + cardH - 30);

    ctx.restore();
  });

  // Bottom Feature Strip
  const pillars = [
    ["DETERMINISTIC TIMELINE", "Seek to any millisecond — rendering is a pure function of time"],
    ["FREE-BODY DIAGRAMS & GRAPHS", "Curated physics ramps, force vectors, tables, and function plots"],
    ["COMMUNITY GALLERY", "Publish your solves or search peer lectures across 6 STEM fields"],
  ];

  pillars.forEach(([title, desc], idx) => {
    const px = startX + idx * (cardW + gap);
    const py = cardY + cardH + 44;

    ctx.fillStyle = "#12151b";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.roundRect(px, py, cardW, 118, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = C.amber;
    ctx.font = `700 12px ${F.mono}`;
    ctx.textAlign = "left";
    ctx.fillText(`0${idx + 1}  ·  ${title}`, px + 24, py + 40);

    ctx.fillStyle = C.inkHi;
    ctx.font = `400 15px ${F.sans}`;
    ctx.fillText(desc, px + 24, py + 76);
  });
}
