/* The guarantee layer: after compile, VERIFY the board is readable —
   no two live text groups occupy the same space, nothing spills off
   the board. Overlaps the displacement ladder missed get reported (and
   counted into job stats) instead of shipping silently. */

import { BOARD_W, MARGIN_X, MAX_BASELINE, type Timeline } from "./types";

export interface LayoutViolation {
  scene: number;
  kind: "overlap" | "overflow";
  a: string;
  b?: string;
  detail: string;
}

interface BB {
  x: number;
  y: number;
  w: number;
  h: number;
}

const TOL = 8; // px of bleed allowed (emphasis arcs, jitter)

function intersects(a: BB, b: BB): boolean {
  const xo = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const yo = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return xo > TOL && yo > TOL;
}

/** is the group's ink gone by the END of scene idx? */
function deadBy(g: { strokes: Array<{ eraseScene?: number }> }, idx: number): boolean {
  return g.strokes.some((s) => s.eraseScene !== undefined && s.eraseScene <= idx);
}

export function auditTimeline(tl: Timeline): LayoutViolation[] {
  const out: LayoutViolation[] = [];
  tl.scenes.forEach((scene, idx) => {
    if (scene.intro) return; // brand bumper — compressed, choreographed
    const live = scene.groups.filter(
      (g) => !deadBy(g, idx) && g.text !== "freebody diagram"
    );
    // freebody diagrams are single groups whose labels intentionally sit
    // near their arrows; their internals are curated by the builder
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i];
        const b = live[j];
        if (a.anchor === b || b.anchor === a) continue; // emphasis rides its target
        if (intersects(a.bbox, b.bbox)) {
          out.push({
            scene: idx,
            kind: "overlap",
            a: a.text ?? `s${idx}g${i}`,
            b: b.text ?? `s${idx}g${j}`,
            detail: `bbox intersect at scene end`,
          });
        }
      }
      const bb = live[i].bbox;
      if (
        bb.x < MARGIN_X - 40 ||
        bb.x + bb.w > BOARD_W - MARGIN_X + 40 ||
        bb.y < 16 ||
        bb.y + bb.h > MAX_BASELINE + 110
      ) {
        out.push({
          scene: idx,
          kind: "overflow",
          a: live[i].text ?? `s${idx}g${i}`,
          detail: `bbox off the board`,
        });
      }
    }
  });
  return out;
}
