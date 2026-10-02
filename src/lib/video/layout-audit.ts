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

/** bounding box of the group as it appears during scene idx (undoing future slide reflows) */
function bboxAtScene(
  g: { bbox: BB; strokes: Array<{ moves?: Array<{ scene: number; dx: number; dy: number }> }> },
  idx: number
): BB {
  let futureDx = 0;
  let futureDy = 0;
  const firstStrokeMoves = g.strokes[0]?.moves ?? [];
  for (const m of firstStrokeMoves) {
    if (m.scene > idx) {
      futureDx += m.dx;
      futureDy += m.dy;
    }
  }
  return {
    x: g.bbox.x - futureDx,
    y: g.bbox.y - futureDy,
    w: g.bbox.w,
    h: g.bbox.h,
  };
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
      const aBox = bboxAtScene(live[i], idx);
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i];
        const b = live[j];
        if (a.anchor === b || b.anchor === a) continue; // emphasis rides its target
        const bBox = bboxAtScene(b, idx);
        if (intersects(aBox, bBox)) {
          out.push({
            scene: idx,
            kind: "overlap",
            a: a.text ?? `s${idx}g${i}`,
            b: b.text ?? `s${idx}g${j}`,
            detail: `bbox intersect at scene end`,
          });
        }
      }
      if (
        aBox.x < MARGIN_X - 40 ||
        aBox.x + aBox.w > BOARD_W - MARGIN_X + 40 ||
        aBox.y < 16 ||
        aBox.y + aBox.h > MAX_BASELINE + 110
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
