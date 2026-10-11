import { renderFrame } from "../../src/lib/video/render";
import { THEMES, sceneStart } from "../../src/lib/video/types";
import { getFilmState, showcaseTimeline } from "./story";
import { compileTimeline } from "../../src/lib/video/compile";
import { SAMPLE_CALCULUS } from "../../src/lib/samples";

// Deliberately small visual vocabulary: ink, chalk, amber, and the studio surface.
const C = { ink: "#111315", chalk: "#f1eee7", amber: "#e6b784", muted: "#96999e", line: "#343639", surface: "#1a1d20" };
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => { const p = clamp(v); return p * p * (3 - 2 * p); };
const mix = (a: number, b: number, p: number) => a + (b - a) * p;
let board: HTMLCanvasElement;
let sampleBoard: HTMLCanvasElement;
const sampleTimeline = compileTimeline(SAMPLE_CALCULUS);

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size = 42, color = C.chalk, align: CanvasTextAlign = "left", weight = 400, face = "Geist") {
  ctx.font = `${weight} ${size}px ${face}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "alphabetic"; ctx.fillText(value, x, y);
}
function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius = 22, fill = C.surface, stroke?: string) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
}
function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color = C.line, width = 2) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
function reveal(ctx: CanvasRenderingContext2D, progress: number, paint: () => void, dy = 28) {
  const p = ease(progress); if (!p) return;
  ctx.save(); ctx.globalAlpha *= p; ctx.translate(0, dy * (1 - p)); paint(); ctx.restore();
}
function swash(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, progress = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(width / 120, width / 120);
  ctx.beginPath(); ctx.rect(0, -10, 120 * clamp(progress), 32); ctx.clip();
  ctx.beginPath(); ctx.moveTo(4, 12); ctx.bezierCurveTo(30, 9.6, 68, 9.2, 92, 9.8); ctx.bezierCurveTo(102, 10.1, 108.5, 8.2, 110.5, 4.8);
  ctx.strokeStyle = C.amber; ctx.lineWidth = 3.4; ctx.lineCap = "round"; ctx.stroke();
  if (progress > .92) { ctx.beginPath(); ctx.arc(109, 2.4, 2, 0, 7); ctx.fillStyle = C.amber; ctx.fill(); }
  ctx.restore();
}
function brand(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, p = 1) {
  text(ctx, "Ember", x, y, size, C.chalk, "left", 600); swash(ctx, x, y + size * .13, size * 2.35, p);
}
function narrative(ctx: CanvasRenderingContext2D, lines: string[], p: number, y = 184, size = 70) {
  lines.forEach((value, i) => reveal(ctx, p - i * .16, () => text(ctx, value, 960, y + i * size * 1.16, size, C.chalk, "center", 450)));
}
function tag(ctx: CanvasRenderingContext2D, value: string, y = 1000) { text(ctx, value, 960, y, 26, C.muted, "center", 400); }

/** Film edit time maps onto native handwriting time without changing the engine. */
function boardTime(seconds: number) {
  const s = showcaseTimeline.scenes;
  if (seconds < 4) return mix(0, s[0].dur, clamp(seconds / 4));
  if (seconds < 10) return sceneStart(showcaseTimeline, 1) + mix(0, s[1].dur, clamp((seconds - 4) / 6));
  return sceneStart(showcaseTimeline, 2) + mix(0, s[2].dur, clamp((seconds - 10) / 4));
}
function boardImage(t: number): HTMLCanvasElement {
  if (!board) { board = document.createElement("canvas"); board.width = 1280; board.height = 720; }
  renderFrame(board.getContext("2d")!, showcaseTimeline, boardTime(t), THEMES.blackboard, { pen: true });
  return board;
}

function composer(ctx: CanvasRenderingContext2D, t: number) {
  const arrive = ease((t - 7.2) / 1.2);
  const leave = ease((t - 12.7) / .8);
  const scale = mix(.86, 1, arrive) + leave * .14;
  ctx.save(); ctx.translate(960, 578); ctx.scale(scale, scale); ctx.translate(-960, -578);
  ctx.globalAlpha = arrive * (1 - leave);
  rect(ctx, 310, 376, 1300, 360, 28, C.surface, C.line);
  const value = "Solve x + 2 = 5";
  const typed = Math.floor(clamp((t - 8.8) / 1.8) * value.length);
  text(ctx, value.slice(0, typed), 365, 488, 58);
  if (t < 11) line(ctx, 367 + ctx.measureText(value.slice(0, typed)).width, 441, 367 + ctx.measureText(value.slice(0, typed)).width, 499, C.amber, 3);
  text(ctx, "What would you like to understand?", 365, 682, 27, C.muted);
  rect(ctx, 1202, 622, 354, 72, 16, C.amber);
  text(ctx, "Create a lesson  ↗", 1379, 669, 31, C.ink, "center", 550);
  ctx.restore();
  if (t > 9) reveal(ctx, (t - 9) / .6, () => tag(ctx, "Prepared demonstration · edited for length", 1022));
}

function lesson(ctx: CanvasRenderingContext2D, t: number) {
  const entry = ease((t - 13.35) / .65);
  const pull = ease((t - 27.1) / 2.1);
  // Same board continuously pulls into the studio; no cut to a duplicate card.
  const x = mix(190, 112, pull), y = mix(295, 318, pull), w = mix(1540, 1210, pull);
  ctx.save(); ctx.globalAlpha = entry;
  rect(ctx, x, y, w, w * .5625, 24, "#131417", C.line);
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, w * .5625, 24); ctx.clip();
  ctx.drawImage(boardImage(Math.max(0, t - 14)), x, y, w, w * .5625); ctx.restore(); ctx.restore();
  if (t >= 14 && t < 28) {
    narrative(ctx, ["See why each step works."], (t - 14) / .8, 180, 72);
    tag(ctx, "Edited lesson excerpt · real Ember handwriting", 1022);
  }
  if (pull > 0) {
    ctx.save(); ctx.globalAlpha = pull;
    rect(ctx, 1350, 318, 458, 680, 24, C.surface, C.line);
    text(ctx, "Chapters", 1390, 380, 31, C.chalk, "left", 550);
    text(ctx, "Office Hours", 1575, 380, 26, C.muted);
    line(ctx, 1385, 410, 1770, 410);
    ["Start with the equation", "Subtract 2 from", "Read the solution"].forEach((v, i) => {
      if (i === 1) rect(ctx, 1374, 525, 410, 110, 14, "#302920");
      text(ctx, `0${i + 1}`, 1400, 484 + i * 102, 24, i === 1 ? C.amber : C.muted, "left", 400, "GeistMono");
      text(ctx, v, 1450, 484 + i * 102, 25, i === 1 ? C.amber : C.chalk);
      if (i === 1) text(ctx, "both sides", 1450, 619, 25, C.amber);
    });
    ctx.restore();
  }
}

function revisit(ctx: CanvasRenderingContext2D, t: number) {
  const p = ease((t - 28) / 1.1);
  const rewinding = ease((t - 29.6) / .85);
  const bt = mix(14, 9.9, rewinding);
  // Preserve the exact outgoing board rectangle from the previous scene.
  const pull = ease((t - 27.1) / 2.1);
  const x = mix(190, 112, pull), y = mix(295, 318, pull), w = mix(1540, 1210, pull);
  lesson(ctx, t);
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, w * .5625, 24); ctx.clip(); ctx.drawImage(boardImage(bt), x, y, w, w * .5625); ctx.restore();
  narrative(ctx, ["Go back to the moment it clicks."], p, 180, 66);
  rect(ctx, 156, 910, 1120, 65, 12, "#1c2024");
  line(ctx, 213, 941, 1217, 941, "#45484d", 4);
  line(ctx, 213, 941, mix(1160, 705, rewinding), 941, C.amber, 4);
  ctx.beginPath(); ctx.arc(mix(1160, 705, rewinding), 941, 8, 0, 7); ctx.fillStyle = C.amber; ctx.fill();
  tag(ctx, t > 29.6 ? "Revisiting: subtract 2 from both sides" : "Your lesson. Your pace.", 1040);
}

function office(ctx: CanvasRenderingContext2D, t: number) {
  const enter = ease((t - 35) / 1.2);
  // Chapter rail becomes the conversation. The equation remains in view.
  const x = mix(1350, 780, enter), w = mix(458, 1000, enter);
  ctx.save(); ctx.globalAlpha = 1 - enter * .82;
  ctx.drawImage(boardImage(9.9), mix(112, -515, enter), mix(318, 358, enter), 1210, 680); ctx.restore();
  narrative(ctx, ["And ask the next question."], (t - 35) / 1.1, 180, 72);
  rect(ctx, x, 318, w, 670, 24, C.surface, C.line);
  ctx.save(); ctx.beginPath(); ctx.roundRect(x + 20, 330, w - 40, 640, 16); ctx.clip();
  text(ctx, "Office Hours", x + 52, 394, 34, C.amber, "left", 550);
  text(ctx, "Professor Ember", x + 52, 434, 25, C.muted);
  line(ctx, x + 44, 465, x + w - 44, 465);
  reveal(ctx, (t - 36.2) / .8, () => {
    rect(ctx, x + 165, 501, w - 215, 122, 18, "#302b25");
    text(ctx, "Why subtract 2 from both sides?", x + 199, 575, 34);
  });
  reveal(ctx, (t - 37.7) / .9, () => {
    text(ctx, "To keep the two sides equal.", x + 52, 708, 37);
    text(ctx, "Subtracting 2 undoes the + 2,", x + 52, 763, 37);
    text(ctx, "so x is left on its own.", x + 52, 818, 37);
  });
  rect(ctx, x + 44, 883, w - 88, 65, 14, C.ink, C.line);
  text(ctx, "Ask Ember about this step…", x + 66, 925, 27, C.muted);
  ctx.restore();
  tag(ctx, "Prepared Office Hours example", 1040);
}

function gallery(ctx: CanvasRenderingContext2D, t: number) {
  const p = ease((t - 43) / 1.1);
  narrative(ctx, ["More questions.", "Same workspace."], (t - 43) / .7, 265, 86);
  ctx.save(); ctx.globalAlpha = p; ctx.translate(0, mix(80, 0, p));
  // Verified subject navigation from the actual gallery, without invented lessons or metrics.
  rect(ctx, 180, 472, 1560, 502, 26, C.surface, C.line);
  text(ctx, "Gallery", 230, 541, 38, C.chalk, "left", 550);
  line(ctx, 230, 568, 1690, 568);
  const subjects = ["Calculus", "Mechanics", "Physics", "ODEs", "Circuits", "Chemistry"];
  subjects.forEach((v, i) => text(ctx, v, 230 + i * 242, 622, 32, i === 0 ? C.amber : C.chalk));
  line(ctx, 230, 638, 346, 638, C.amber, 3);
  if (!sampleBoard) {
    sampleBoard = document.createElement("canvas"); sampleBoard.width = 1280; sampleBoard.height = 720;
    renderFrame(sampleBoard.getContext("2d")!, sampleTimeline, sampleTimeline.scenes[0].writeEnd, THEMES.blackboard, { pen: false });
  }
  ctx.save(); ctx.beginPath(); ctx.roundRect(230, 675, 476, 267, 16); ctx.clip();
  ctx.drawImage(sampleBoard, 230, 675, 476, 267); ctx.restore();
  text(ctx, "Integration by Parts", 765, 761, 46, C.chalk, "left", 500);
  text(ctx, "Built-in Calculus lesson", 765, 817, 31, C.muted);
  text(ctx, "Watch lesson  ↗", 765, 901, 31, C.amber);
  ctx.restore();
  tag(ctx, "Ember Gallery · subject navigation and built-in sample", 1022);
}

export function renderFilmFrame(ctx: CanvasRenderingContext2D, seconds: number): void {
  const { time: t } = getFilmState(seconds);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  ctx.fillStyle = C.ink; ctx.fillRect(0, 0, 1920, 1080); ctx.lineCap = "round";
  if (t < 4) {
    reveal(ctx, t / .9, () => text(ctx, "Some questions need", 960, 478, 92, C.chalk, "center", 450));
    reveal(ctx, (t - .85) / .9, () => text(ctx, "more than an answer.", 960, 597, 92, C.chalk, "center", 450));
    const p = ease((t - 2.4) / 1.6);
    swash(ctx, mix(565, 725, p), mix(669, 623, p), mix(780, 455, p), ease((t - 1.9) / 1.5));
  } else if (t < 8) {
    const move = ease((t - 7) / 1);
    reveal(ctx, (t - 4) / .8, () => brand(ctx, mix(725, 140, move), mix(589, 120, move), mix(180, 40, move), ease((t - 4) / 1.2)));
    ctx.save(); ctx.globalAlpha = 1 - move;
    reveal(ctx, (t - 5) / .9, () => text(ctx, "A question becomes a lesson.", 960, 770, 44, C.muted, "center"));
    ctx.restore();
    if (t > 7.2) composer(ctx, t);
  } else if (t < 14) {
    brand(ctx, 140, 120, 40);
    ctx.save(); ctx.globalAlpha = 1 - ease((t - 13.1) / .7);
    narrative(ctx, ["Bring a question."], (t - 8) / .9, 250, 86); ctx.restore();
    composer(ctx, t);
    if (t > 13.1) lesson(ctx, t);
  } else if (t < 28) lesson(ctx, t);
  else if (t < 35) revisit(ctx, t);
  else if (t < 43) office(ctx, t);
  else if (t < 48) gallery(ctx, t);
  else {
    reveal(ctx, (t - 48) / .8, () => brand(ctx, 760, 437, 148, ease((t - 48) / 1.2)));
    reveal(ctx, (t - 48.5) / .8, () => text(ctx, "Every problem, a lesson.", 960, 668, 78, C.chalk, "center", 450));
    reveal(ctx, (t - 49.3) / .8, () => text(ctx, "Create your first lesson.  ↗", 960, 834, 39, C.amber, "center"));
  }
  ctx.restore();
}
