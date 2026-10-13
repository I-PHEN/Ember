/* ------------------------------------------------------------------
   Scene 6: Interactive Studio & Office Hours (Frames 1020 -> 1230 / 0:34 -> 0:41)
   Mirrors studio/page.tsx: YouTube-style seekable player on the left,
   Office Hours conversational Q&A + Board Edits on the right.
------------------------------------------------------------------- */

import { C, F, W, H } from "../theme";
import { mapRange, Ease, clamp, lerp } from "../math";
import { drawLiveBoard, FLAGSHIP_TIMELINE } from "../board-bridge";
import { drawStudioBackdrop, ASSETS } from "../fx";

export function renderScene6(ctx: CanvasRenderingContext2D, f: number): void {
  const rel = f - 1020; // 0 -> 210 (7.0s)

  drawStudioBackdrop(ctx, f, 0.22, W * 0.68, H * 0.48);

  if (ASSETS.studioImg) {
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.drawImage(ASSETS.studioImg, 0, 0, W, H);
    ctx.restore();
  }

  // Gentle camera lift without clipping left or right studio columns
  const zoom = mapRange(rel, 35, 130, 0.985, 1.015, Ease.inOutCubic);
  const focusX = mapRange(rel, 35, 130, W / 2, W / 2 + 12, Ease.inOutCubic);

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-focusX, -H / 2);

  // Studio Header Bar
  ctx.fillStyle = "#0b0d11";
  ctx.fillRect(40, 28, W - 80, 56);
  ctx.strokeStyle = C.hair2;
  ctx.strokeRect(40, 28, W - 80, 56);

  ctx.fillStyle = C.muted2;
  ctx.font = `500 13px ${F.sans}`;
  ctx.textAlign = "left";
  ctx.fillText("← Back", 68, 61);

  ctx.fillStyle = C.inkHi;
  ctx.font = `700 20px ${F.sans}`;
  ctx.fillText("Ember", 136, 61);

  ctx.fillStyle = "rgba(230, 183, 132, 0.16)";
  ctx.beginPath();
  ctx.roundRect(208, 44, 34, 22, 7);
  ctx.fill();
  ctx.fillStyle = C.amber;
  ctx.font = `600 11px ${F.mono}`;
  ctx.fillText("v1", 218, 59);

  // Header Right Buttons
  ctx.fillStyle = C.muted;
  ctx.font = `500 12.5px ${F.sans}`;
  ctx.textAlign = "right";
  ctx.fillText("History (4)     Publish to Gallery", W - 190, 60);

  ctx.fillStyle = C.amber;
  ctx.beginPath();
  ctx.roundRect(W - 165, 41, 102, 30, 9);
  ctx.fill();
  ctx.fillStyle = C.amberInk;
  ctx.font = `700 12px ${F.sans}`;
  ctx.textAlign = "center";
  ctx.fillText("New solve", W - 114, 60);

  // 1. Left Column: SolvePlayer + Professor Card
  const playerW = 1040;
  const playerH = 610;
  const playerX = 48;
  const playerY = 104;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(playerX, playerY, playerW, playerH, 18);
  ctx.clip();
  drawLiveBoard(
    ctx,
    FLAGSHIP_TIMELINE.duration * 0.96,
    "blackboard",
    playerX,
    playerY,
    playerW,
    playerH - 48
  );

  // Player Scrub Bar
  const scrubY = playerY + playerH - 48;
  ctx.fillStyle = "#101319";
  ctx.fillRect(playerX, scrubY, playerW, 48);

  ctx.fillStyle = C.inkHi;
  ctx.font = `14px sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText("⏸", playerX + 22, scrubY + 29);

  ctx.fillStyle = C.muted;
  ctx.font = `500 12px ${F.mono}`;
  ctx.fillText("03:14 / 07:12", playerX + 54, scrubY + 29);

  const trackX = playerX + 170;
  const trackW = playerW - 280;
  ctx.fillStyle = "#2b2f38";
  ctx.beginPath();
  ctx.roundRect(trackX, scrubY + 21, trackW, 6, 3);
  ctx.fill();

  ctx.fillStyle = C.amber;
  ctx.beginPath();
  ctx.roundRect(trackX, scrubY + 21, trackW * 0.56, 6, 3);
  ctx.fill();

  ctx.fillStyle = C.muted;
  ctx.font = `600 12px ${F.mono}`;
  ctx.fillText("1.25×   CC   🎨", playerX + playerW - 96, scrubY + 29);
  ctx.restore();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(playerX, playerY, playerW, playerH, 18);
  ctx.stroke();

  // Title + Professor Card below player
  ctx.fillStyle = C.inkHi;
  ctx.font = `600 24px ${F.sans}`;
  ctx.textAlign = "left";
  ctx.fillText(
    "Integration by Parts: Integral of x · e^(2x)",
    playerX,
    playerY + playerH + 42
  );

  // Professor Profile Card (matches studio/page.tsx)
  const profY = playerY + playerH + 62;
  ctx.fillStyle = "#12151b";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.beginPath();
  ctx.roundRect(playerX, profY, playerW, 88, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(230, 183, 132, 0.16)";
  ctx.beginPath();
  ctx.arc(playerX + 44, profY + 44, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.amber;
  ctx.font = `700 16px ${F.sans}`;
  ctx.textAlign = "center";
  ctx.fillText("E", playerX + 44, profY + 50);

  ctx.textAlign = "left";
  ctx.fillStyle = C.inkHi;
  ctx.font = `600 15px ${F.sans}`;
  ctx.fillText("Ember  ·  Lead Instructor", playerX + 82, profY + 38);
  ctx.fillStyle = C.muted;
  ctx.font = `400 13px ${F.sans}`;
  ctx.fillText(
    "She reads the problem with you first, gathers what's given, names the ask — and solves one move at a time.",
    playerX + 82,
    profY + 62
  );

  // 2. Right Column: Pinned Office Hours Sidebar
  const sideW = 750;
  const sideH = 856;
  const sideX = W - sideW - 48;
  const sideY = 104;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.72)";
  ctx.shadowBlur = 48;
  ctx.fillStyle = "#0e1015";
  ctx.beginPath();
  ctx.roundRect(sideX, sideY, sideW, sideH, 20);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "rgba(230, 183, 132, 0.32)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(sideX, sideY, sideW, sideH, 20);
  ctx.stroke();

  // Chapters vs Office Hours Tab switcher
  const tabW = (sideW - 36) / 2;
  ctx.fillStyle = "#07080a";
  ctx.beginPath();
  ctx.roundRect(sideX + 18, sideY + 18, sideW - 36, 46, 12);
  ctx.fill();

  ctx.fillStyle = C.muted;
  ctx.font = `600 13px ${F.sans}`;
  ctx.textAlign = "center";
  ctx.fillText("Chapters (6)", sideX + 18 + tabW / 2, sideY + 46);

  ctx.fillStyle = C.amber;
  ctx.beginPath();
  ctx.roundRect(sideX + 18 + tabW, sideY + 22, tabW - 4, 38, 10);
  ctx.fill();
  ctx.fillStyle = C.amberInk;
  ctx.font = `700 13px ${F.sans}`;
  ctx.fillText("✨ Office Hours", sideX + 18 + tabW + tabW / 2, sideY + 46);

  // Sub-header: Live Sync + Voice On
  ctx.fillStyle = C.live;
  ctx.beginPath();
  ctx.arc(sideX + 34, sideY + 90, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = C.amber;
  ctx.font = `600 12px ${F.mono}`;
  ctx.textAlign = "left";
  ctx.fillText("03:14  ·  Assigning u, dv and computing du, v", sideX + 48, sideY + 94);

  ctx.fillStyle = "rgba(230, 183, 132, 0.18)";
  ctx.strokeStyle = "rgba(230, 183, 132, 0.45)";
  ctx.beginPath();
  ctx.roundRect(sideX + sideW - 128, sideY + 76, 102, 28, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.amber;
  ctx.font = `600 11.5px ${F.sans}`;
  ctx.textAlign = "center";
  ctx.fillText("🔊 Voice On", sideX + sideW - 77, sideY + 94);

  // Student Question Card
  const qIn = mapRange(rel, 10, 28, 0, 1, Ease.outBack);
  ctx.save();
  ctx.globalAlpha = clamp(qIn);
  ctx.fillStyle = "#161b26";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.beginPath();
  ctx.roundRect(sideX + 26, sideY + 122, sideW - 52, 96, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = C.muted2;
  ctx.font = `600 11px ${F.mono}`;
  ctx.textAlign = "left";
  ctx.fillText("YOU ASKED AT TIMESTAMP 03:14", sideX + 48, sideY + 150);

  ctx.fillStyle = C.inkHi;
  ctx.font = `500 18px ${F.sans}`;
  ctx.fillText("“Why did we choose u = x instead of u = e^(2x)?”", sideX + 48, sideY + 186);
  ctx.restore();

  // Professor Ember Answer + Board Revision Capability
  if (rel >= 34) {
    const aIn = mapRange(rel, 34, 56, 0, 1, Ease.outBack);
    ctx.save();
    ctx.globalAlpha = clamp(aIn);

    ctx.fillStyle = "rgba(230, 183, 132, 0.09)";
    ctx.strokeStyle = "rgba(230, 183, 132, 0.38)";
    ctx.beginPath();
    ctx.roundRect(sideX + 26, sideY + 238, sideW - 52, 240, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = C.amber;
    ctx.font = `700 12.5px ${F.mono}`;
    ctx.textAlign = "left";
    ctx.fillText("PROFESSOR EMBER  ·  SPOKEN + LATEX EXPLANATION", sideX + 48, sideY + 272);

    ctx.fillStyle = C.inkHi;
    ctx.font = `400 16.5px ${F.sans}`;
    ctx.fillText(
      "By the LIATE rule, Algebraic terms (x) come before Exponential (e^(2x)).",
      sideX + 48,
      sideY + 310
    );
    ctx.fillText(
      "Differentiating u = x collapses it to du = dx — so the second integral",
      sideX + 48,
      sideY + 340
    );
    ctx.fillText(
      "has no x left inside at all!",
      sideX + 48,
      sideY + 370
    );

    // Math comparison pill inside reply
    ctx.fillStyle = "#0b0d12";
    ctx.strokeStyle = "rgba(230, 183, 132, 0.3)";
    ctx.beginPath();
    ctx.roundRect(sideX + 48, sideY + 394, sideW - 96, 56, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = C.chalkGreen;
    ctx.font = `600 16px ${F.mono}`;
    ctx.fillText("u = x  →  du = dx   (terminates cleanly ✓)", sideX + 70, sideY + 428);
    ctx.restore();
  }

  // Bottom Suggestion Carousel + Input Bar
  const sugY = sideY + sideH - 126;
  const pills = [
    "Why this formula?",
    "Make step simpler",
    "Explain current step",
    "Highlight answer in yellow",
  ];
  let px = sideX + 26;
  pills.forEach((pill, i) => {
    ctx.font = `500 12px ${F.sans}`;
    const pw = ctx.measureText(pill).width + 24;
    ctx.fillStyle = i === 0 ? "rgba(230, 183, 132, 0.14)" : "#161922";
    ctx.strokeStyle = i === 0 ? "rgba(230, 183, 132, 0.4)" : "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.roundRect(px, sugY, pw, 32, 9);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = i === 0 ? C.amber : C.muted;
    ctx.textAlign = "left";
    ctx.fillText(pill, px + 12, sugY + 20);
    px += pw + 10;
  });

  // Input box at bottom of Office Hours
  ctx.fillStyle = "#14171f";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.beginPath();
  ctx.roundRect(sideX + 26, sideY + sideH - 76, sideW - 52, 52, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = C.faint;
  ctx.font = `400 13.5px ${F.sans}`;
  ctx.textAlign = "left";
  ctx.fillText(
    "Ask Ember about this step, or tell her what to edit on the board…",
    sideX + 48,
    sideY + sideH - 45
  );

  ctx.restore();
}
