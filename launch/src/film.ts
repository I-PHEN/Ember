/* ------------------------------------------------------------------
   Ember Launch Film: Master Compositor (48.0 Seconds / 1440 Frames @ 30 FPS)
   Renders the complete motion graphics launch sequence frame-by-frame.
------------------------------------------------------------------- */

import { W, H } from "./theme";
import { renderScene1 } from "./scenes/Scene1_ColdOpen";
import { renderScene2 } from "./scenes/Scene2_TheSpark";
import { renderScene3 } from "./scenes/Scene3_Composer";
import { renderScene4 } from "./scenes/Scene4_CrewPipeline";
import { renderScene5 } from "./scenes/Scene5_Blackboard";
import { renderScene6 } from "./scenes/Scene6_OfficeHours";
import { renderScene7 } from "./scenes/Scene7_Ecosystem";
import { renderScene8 } from "./scenes/Scene8_Outro";

export const TOTAL_FRAMES = 1440; // Strictly 48.0 seconds @ 30 FPS (within 40-60s target)
export const TOTAL_SECONDS = 48;

export interface Chapter {
  name: string;
  frame: number;
  timeStr: string;
}

export const CHAPTERS: Chapter[] = [
  { name: "01 · The Problem", frame: 0, timeStr: "0:00" },
  { name: "02 · The Spark", frame: 150, timeStr: "0:05" },
  { name: "03 · The Composer", frame: 270, timeStr: "0:09" },
  { name: "04 · Multi-Agent Crew", frame: 480, timeStr: "0:16" },
  { name: "05 · Blackboard Engine", frame: 690, timeStr: "0:23" },
  { name: "06 · Live Office Hours", frame: 1020, timeStr: "0:34" },
  { name: "07 · Board Themes", frame: 1230, timeStr: "0:41" },
  { name: "08 · Every problem, a lesson", frame: 1335, timeStr: "0:44" },
];

/**
 * Deterministically renders frame `f` of the launch film onto `ctx`.
 */
export function renderFilmFrame(ctx: CanvasRenderingContext2D, f: number): void {
  const frame = Math.max(0, Math.min(TOTAL_FRAMES - 1, f));
  ctx.clearRect(0, 0, W, H);

  if (frame < 150) {
    renderScene1(ctx, frame);
  } else if (frame < 270) {
    renderScene2(ctx, frame);
  } else if (frame < 480) {
    renderScene3(ctx, frame);
  } else if (frame < 690) {
    renderScene4(ctx, frame);
  } else if (frame < 1020) {
    renderScene5(ctx, frame);
  } else if (frame < 1230) {
    renderScene6(ctx, frame);
  } else if (frame < 1335) {
    renderScene7(ctx, frame);
  } else {
    renderScene8(ctx, frame);
  }
}
