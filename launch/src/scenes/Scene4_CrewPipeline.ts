/* ------------------------------------------------------------------
   Scene 4: The Multi-Agent Studio Crew (Frames 480 -> 690 / 0:16 -> 0:23)
   Left: Exact GenerateOverlay.tsx modal with monotonic progress & ETA.
   Right: Dynamic 4-stage AI crew pipeline with live signal pulses.
------------------------------------------------------------------- */

import { C, F, W, H } from "../theme";
import { mapRange, Ease, clamp, lerp } from "../math";
import { drawStudioBackdrop, drawGlassPill, ASSETS } from "../fx";

export function renderScene4(ctx: CanvasRenderingContext2D, f: number): void {
  const rel = f - 480; // 0 -> 210 (7.0s)

  drawStudioBackdrop(ctx, f, 0.25, W * 0.35, H * 0.5);

  if (ASSETS.directorImg) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.drawImage(ASSETS.directorImg, 0, 0, W, H);
    ctx.restore();
  }

  const pct = Math.min(100, Math.floor(mapRange(rel, 8, 185, 12, 100, Ease.inOutCubic)));

  // ------------------------------------------------------------------
  // 1. Left Column: Exact GenerateOverlay Waiting Room Card
  // ------------------------------------------------------------------
  const cardIn = mapRange(rel, 0, 18, 0, 1, Ease.outBack);
  const cardW = 540;
  const cardH = 690;
  const cardX = 150;
  const cardY = (H - cardH) / 2;

  ctx.save();
  ctx.translate(cardX + cardW / 2, cardY + cardH / 2);
  ctx.scale(lerp(0.92, 1.0, cardIn), lerp(0.92, 1.0, cardIn));
  ctx.translate(-(cardX + cardW / 2), -(cardY + cardH / 2));
  ctx.globalAlpha = clamp(cardIn);

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 56;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = "#171b1d";
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 22);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "#34383c";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 22);
  ctx.stroke();

  // Clapperboard badge
  ctx.fillStyle = "rgba(230, 183, 132, 0.12)";
  ctx.strokeStyle = "rgba(230, 183, 132, 0.32)";
  ctx.beginPath();
  ctx.roundRect(cardX + 30, cardY + 30, 48, 48, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = C.amber;
  ctx.font = `700 18px ${F.mono}`;
  ctx.textAlign = "center";
  ctx.fillText("▸", cardX + 54, cardY + 60);

  ctx.textAlign = "left";
  ctx.fillStyle = C.inkHi;
  ctx.font = `600 17px ${F.sans}`;
  ctx.fillText("Ember is making your lesson", cardX + 92, cardY + 50);

  ctx.fillStyle = C.amber;
  ctx.font = `500 16px ${F.hand}`;
  ctx.fillText("Evaluate ∫ x · e^(2x) dx using integration by parts", cardX + 92, cardY + 72);

  // Monotonic server progress %
  ctx.fillStyle = C.inkHi;
  ctx.font = `700 34px ${F.mono}`;
  ctx.fillText(`${pct}%`, cardX + 30, cardY + 132);

  const phaseText =
    pct < 30
      ? "planning the lecture"
      : pct < 60
      ? "writing the words"
      : pct < 92
      ? "choreographing the board"
      : "ready to watch";
  ctx.fillStyle = C.muted2;
  ctx.font = `500 13px ${F.sans}`;
  ctx.textAlign = "right";
  ctx.fillText(phaseText, cardX + cardW - 30, cardY + 130);

  // Progress bar
  const barW = cardW - 60;
  ctx.fillStyle = "#23262a";
  ctx.beginPath();
  ctx.roundRect(cardX + 30, cardY + 146, barW, 8, 4);
  ctx.fill();

  ctx.fillStyle = C.amber;
  ctx.beginPath();
  ctx.roundRect(cardX + 30, cardY + 146, (barW * pct) / 100, 8, 4);
  ctx.fill();

  // 4 Crew Rows inside GenerateOverlay
  const rows = [
    {
      name: "Ember (Director)",
      sub: pct >= 28 ? "lesson arc ready — handed to transcript planner" : "reading the question, shaping the lecture arc…",
      done: pct >= 28,
      active: pct < 28,
    },
    {
      name: "Lecture script",
      sub: pct >= 58 ? "transcript ready — every word planned" : "writing every word she'll say — engaging, unhurried…",
      done: pct >= 58,
      active: pct >= 28 && pct < 58,
    },
    {
      name: "Scene writers — 6/6 boarded",
      sub: "3 writers working at once, each on its slice of the script",
      done: pct >= 88,
      active: pct >= 58 && pct < 88,
      tiles: true,
    },
    {
      name: "Voice (Aoede)",
      sub: pct >= 94 ? "opening scenes recorded — streaming ready" : "recording in playback order — scene 1 is always first",
      done: pct >= 94,
      active: pct >= 48 && pct < 94,
    },
  ];

  rows.forEach((r, idx) => {
    const ry = cardY + 182 + idx * 82;
    ctx.fillStyle = r.done
      ? "rgba(92, 219, 149, 0.14)"
      : r.active
      ? "rgba(230, 183, 132, 0.16)"
      : "rgba(255, 255, 255, 0.04)";
    ctx.strokeStyle = r.done
      ? "rgba(92, 219, 149, 0.4)"
      : r.active
      ? "rgba(230, 183, 132, 0.48)"
      : "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.roundRect(cardX + 30, ry, 36, 36, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = r.done ? C.live : r.active ? C.amber : C.muted2;
    ctx.font = `700 14px ${F.mono}`;
    ctx.textAlign = "center";
    ctx.fillText(r.done ? "✓" : `0${idx + 1}`, cardX + 48, ry + 23);

    ctx.textAlign = "left";
    ctx.fillStyle = C.inkHi;
    ctx.font = `600 14px ${F.sans}`;
    ctx.fillText(r.name, cardX + 80, ry + 15);

    ctx.fillStyle = r.active ? C.amber : C.muted;
    ctx.font = `400 12px ${F.sans}`;
    ctx.fillText(r.sub, cardX + 80, ry + 33);

    if (r.tiles) {
      const doneTiles = Math.floor(mapRange(pct, 52, 88, 0, 8, Ease.linear));
      for (let t = 0; t < 8; t++) {
        ctx.fillStyle = t < doneTiles ? C.amber : "rgba(241, 238, 231, 0.12)";
        ctx.beginPath();
        ctx.roundRect(cardX + 80 + t * 28, ry + 42, 22, 9, 3);
        ctx.fill();
      }
    }
  });

  // Honest ETA Callout
  const etaY = cardY + cardH - 122;
  ctx.fillStyle = "rgba(230, 183, 132, 0.09)";
  ctx.strokeStyle = "rgba(230, 183, 132, 0.28)";
  ctx.beginPath();
  ctx.roundRect(cardX + 30, etaY, barW, 74, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = C.amber;
  ctx.font = `600 14px ${F.sans}`;
  ctx.fillText(
    pct >= 92 ? "Your video is ready — launching board now…" : "Playback starts before the job finishes",
    cardX + 46,
    etaY + 28
  );
  ctx.fillStyle = C.muted;
  ctx.font = `400 12px ${F.sans}`;
  ctx.fillText(
    "Scene 1 voices first so you watch immediately while remaining scenes finish.",
    cardX + 46,
    etaY + 50
  );
  ctx.restore();

  // ------------------------------------------------------------------
  // 2. Right Column: What-Ships Kinetic Architecture Breakdown
  // ------------------------------------------------------------------
  const rightX = 760;
  const rightIn = mapRange(rel, 12, 36, 0, 1, Ease.outCubic);
  ctx.save();
  ctx.globalAlpha = rightIn;

  drawGlassPill(ctx, "MULTI-AGENT PEDAGOGY ENGINE", rightX + 165, 195, {
    amber: true,
    fontSize: 12,
  });

  ctx.fillStyle = C.inkHi;
  ctx.font = `700 52px ${F.sans}`;
  ctx.textAlign = "left";
  ctx.fillText("Planned like a real lecture.", rightX, 268);
  ctx.fillStyle = C.amber;
  ctx.font = `600 54px ${F.hand}`;
  ctx.fillText("Verified before you see a stroke.", rightX, 328);

  const stages = [
    {
      step: "01 · DIRECTOR",
      title: "6-Stage University Lecture Arc",
      desc: "Understand → Gather given → Name the ask → Plan → Solve → Sanity check.",
      threshold: 15,
    },
    {
      step: "02 · TRANSCRIPT PLANNER",
      title: "One Unhurried Spoken Narrative",
      desc: "Written in a single pass so every transition flows like a great professor.",
      threshold: 42,
    },
    {
      step: "03 · SCENE WRITERS ×3 + BLIND SOLVER",
      title: "Exact Say/Write Sync + Symbolic Math Check",
      desc: "Every board line is tagged to the exact spoken words and symbolically verified.",
      threshold: 70,
    },
  ];

  stages.forEach((st, i) => {
    const sy = 385 + i * 150;
    const active = pct >= st.threshold;
    const cardW2 = 980;
    const cardH2 = 128;

    ctx.fillStyle = active ? "rgba(230, 183, 132, 0.08)" : "#12151b";
    ctx.strokeStyle = active ? "rgba(230, 183, 132, 0.42)" : "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = active ? 1.5 : 1;
    ctx.beginPath();
    ctx.roundRect(rightX, sy, cardW2, cardH2, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = active ? C.amber : C.muted2;
    ctx.font = `700 12px ${F.mono}`;
    ctx.fillText(st.step, rightX + 28, sy + 34);

    ctx.fillStyle = C.inkHi;
    ctx.font = `600 22px ${F.sans}`;
    ctx.fillText(st.title, rightX + 28, sy + 68);

    ctx.fillStyle = C.muted;
    ctx.font = `400 15px ${F.sans}`;
    ctx.fillText(st.desc, rightX + 28, sy + 98);
  });

  ctx.restore();
}
