/* ------------------------------------------------------------------
   The compiler: SolveScript (AI output) → Timeline (deterministic
   stroke schedule). All positions are computed here (flow cursor,
   wrapping, blocks) and all timing is baked as scene-relative
   (t0, dur) pairs, so the renderer can draw ANY instant instantly.
------------------------------------------------------------------- */

import {
  BOARD_W,
  MARGIN_X,
  FIRST_BASELINE,
  MAX_BASELINE,
  LINE_H,
  CAP,
  type Beat,
  type BeatSize,
  type BBox,
  type EraseSweep,
  type ForceArrow,
  type Group,
  type HighlightStroke,
  type MarkerName,
  type PathStroke,
  type Pt,
  type SceneTime,
  type SolveScript,
  type Stroke,
  type Timeline,
} from "./types";
import { layoutText, measureText, measureWrap } from "./text";
import {
  bboxOf,
  jitterPolyline,
  roughArrow,
  roughEllipse,
  roughLine,
  roughRect,
  rngFor,
  unionBBox,
} from "./hand";
import { tryCompileExpr } from "@/lib/expr";
import { normSpeechKey } from "../solve-schema";

/* ----------------------------- helpers ---------------------------- */

const HEAD = 0.7;

function penSpeed(cap: number): number {
  // px/second — calibrated with 2/3 power law curvature weighting to natural human pace
  return 210 * (0.8 + (0.2 * cap) / 38);
}

function polyLen(pts: Pt[]): { cum: number[]; len: number } {
  const cum = [0];
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    const segLen = Math.hypot(dx, dy);

    // 2/3 Power Law motor control: tight curves and loops add effective kinematic
    // distance so handwriting decelerates naturally into turns and accelerates on straights
    let turn = 0;
    if (i > 1) {
      const prevDx = pts[i - 1].x - pts[i - 2].x;
      const prevDy = pts[i - 1].y - pts[i - 2].y;
      const a1 = Math.atan2(dy, dx);
      const a0 = Math.atan2(prevDy, prevDx);
      let diff = Math.abs(a1 - a0);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      turn = diff;
    }
    const weight = 1.0 + 0.85 * Math.min(2.0, turn);
    len += segLen * weight;
    cum.push(len);
  }
  return { cum, len };
}

export function estimateNarration(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  // Calibrated to ~110 WPM (0.54s per word) matching The Organic Chemistry Tutor empirical lecture speed
  return Math.max(3.0, words * 0.54 + 1.2);
}

function fmtNum(v: number): string {
  if (Math.abs(v) >= 100) return String(Math.round(v));
  return String(Math.round(v * 100) / 100);
}

interface RawPath {
  pts: Pt[];
  color: MarkerName;
  width: number;
}

/* --------------------------- scene state -------------------------- */

interface Ctx {
  scene: SceneTime;
  sceneIdx: number;
  now: number;
  cursor: Pt; // x = pen x, y = current baseline
  groups: Group[]; // every group in the video (for erase / targets)
  gone: Set<Group>; // groups erased by an earlier beat (ignore for layout)
  lastBottom: number; // bbox bottom of the last flow line (crowding guard)
  beatNo: number;
  startLen: number; // scene.strokes.length when the current beat began
  crossed: Set<Group>; // groups already crossed out (so X's don't stack)
  /* per-beat time marks + the say tag (words spoken while written) —
     the say/write pacer reshapes these into speech-aligned windows */
  beatMarks: BeatMark[];
}

interface BeatMark {
  t0: number;
  t1: number;
  say?: string;
}

function makeGroup(
  ctx: Ctx,
  strokes: Stroke[],
  bbox: BBox,
  text: string | undefined,
  keep: boolean,
  anchor?: Group
): Group {
  const g: Group = {
    id: `s${ctx.sceneIdx}b${ctx.beatNo}`,
    scene: ctx.sceneIdx,
    text,
    keep,
    strokes,
    bbox,
    born: strokes.length ? strokes[0].t0 : ctx.now,
    anchor,
  };
  ctx.groups.push(g);
  ctx.scene.groups.push(g);
  return g;
}

/** group everything drawn since the beat started */
function groupSinceBeatStart(
  ctx: Ctx,
  text: string | undefined,
  keep = false,
  anchor?: Group
): void {
  const strokes = ctx.scene.strokes.slice(ctx.startLen);
  if (!strokes.length) return;
  let bb: BBox | null = null;
  for (const s of strokes) {
    if (s.kind === "highlight") {
      bb = unionBBox(bb, s.rect);
    } else {
      bb = unionBBox(bb, bboxOf(s.pts, 0));
    }
  }
  if (!bb) return;
  makeGroup(ctx, strokes, bb, text, keep, anchor);
}

/** bake raw polylines into timed strokes */
function addPaths(
  ctx: Ctx,
  raw: RawPath[],
  opts?: { gap?: number; speedCap?: number; settle?: number }
): PathStroke[] {
  const gap = opts?.gap ?? 0.045;
  const out: PathStroke[] = [];
  for (const r of raw) {
    if (r.pts.length < 2) continue;
    const { cum, len } = polyLen(r.pts);
    const speed = penSpeed(opts?.speedCap ?? 38);
    const dur = Math.max(0.07, Math.min(2.6, len / speed));
    const s: PathStroke = {
      kind: "path",
      pts: r.pts,
      color: r.color,
      width: r.width,
      t0: ctx.now,
      dur,
      cum,
      len,
    };
    out.push(s);
    ctx.scene.strokes.push(s);
    ctx.now += dur + gap;
  }
  if (out.length && (opts?.settle ?? 0.1) > 0) {
    ctx.now += opts?.settle ?? 0.1;
  }
  return out;
}

/** A group's CURRENT bbox. reflowAfterErase keeps g.bbox up to date as
 *  slides happen (moves are render-time deltas for the strokes only), so
 *  collision checks and targeting always read g.bbox directly. */
function movedBBox(_ctx: Ctx, g: Group): BBox {
  return g.bbox;
}

function resolveTarget(ctx: Ctx, target?: string, skipCrossed = false): Group | null {
  const t = (target ?? "last").trim();
  if (!t || t === "last") {
    // last group that is still on the board
    for (let i = ctx.groups.length - 1; i >= 0; i--) {
      const g = ctx.groups[i];
      if (!ctx.gone.has(g)) return g;
    }
    return null;
  }
  if (t.toLowerCase().startsWith("text:")) {
    const needle = t.slice(5).trim().toLowerCase();
    for (let i = ctx.groups.length - 1; i >= 0; i--) {
      const g = ctx.groups[i];
      if (ctx.gone.has(g)) continue; // erased — can't target ink that's gone
      if (skipCrossed && ctx.crossed.has(g)) continue;
      if (g.text && g.text.toLowerCase().includes(needle)) return g;
    }
    return null;
  }
  // fallback: last live group
  for (let i = ctx.groups.length - 1; i >= 0; i--) {
    const g = ctx.groups[i];
    if (!ctx.gone.has(g)) return g;
  }
  return null;
}

function performErase(
  ctx: Ctx,
  keepTexts: string[] | undefined,
  demoteKeep = false,
  /** explicit survivor groups (forceRoom) — exact refs, no text matching */
  keepGroups?: ReadonlySet<Group>
): number {
  const needles = (keepTexts ?? []).map((k) => k.toLowerCase());
  const keptSet = new Set<Group>(keepGroups ?? []);
  const isKept = (g: Group): boolean => {
    if (keptSet.has(g)) return true;
    const txt = g.text;
    let kept = false;
    if (!demoteKeep && g.keep) kept = true;
    else if (txt && needles.some((n) => txt.toLowerCase().includes(n)))
      kept = true;
    else if (g.anchor && isKept(g.anchor)) kept = true; // emphasis rides with its target
    if (kept) keptSet.add(g);
    return kept;
  };
  const doomed = ctx.groups.filter((g) => {
    // already erased by an earlier beat — keep the original fade time
    if (ctx.gone.has(g)) return false;
    // born is scene-relative — only groups from THIS scene can be "mid-beat"
    if (g.scene === ctx.sceneIdx && g.born >= ctx.now - 0.001) return false;
    return !isKept(g);
  });
  for (const g of doomed) ctx.gone.add(g);
  /* survivors slide up only AFTER the doomed ink has fully faded —
     sliding at now+0.45 lands kept lines on top of ink that is still
     visibly erasing (doomed strokes fade from now+0.1 for ~1s), which
     reads as one line written through another */
  let slideAt = ctx.now + 1.6;
  if (doomed.length) {
    let region: BBox | null = null;
    for (const g of doomed) {
      const stag =
        ((g.bbox.x - MARGIN_X) / (BOARD_W - 2 * MARGIN_X)) * 0.42;
      for (const s of g.strokes) {
        s.eraseScene = ctx.sceneIdx;
        s.eraseAt = ctx.now + 0.1 + stag;
      }
      region = unionBBox(region, g.bbox);
    }
    const sweep: EraseSweep = {
      at: ctx.now + 0.04,
      scene: ctx.sceneIdx,
      region: {
        x: MARGIN_X,
        y: region!.y - 16,
        w: BOARD_W - 2 * MARGIN_X,
        h: region!.h + 32,
      },
    };
    ctx.scene.erases.push(sweep);
    ctx.now += 0.95;
  }
  // reposition whatever survived, and aim the flow cursor after it
  // (survivors = kept groups still alive on the board — never erased ones)
  const survivors = ctx.groups.filter(
    (g) =>
      !ctx.gone.has(g) &&
      !doomed.includes(g) &&
      (g.scene !== ctx.sceneIdx || g.born < ctx.now - 0.9)
  );
  reflowAfterErase(ctx, survivors, slideAt);
  return doomed.length;
}

/**
 * Teacher behaviour after clearing the board: the kept answer chain stays
 * visible and the next line writes UNDER it — never on top of it. If there
 * isn't room below, the whole kept stack slides up to the top (hidden behind
 * the eraser sweep) and writing continues beneath it.
 */
function reflowAfterErase(
  ctx: Ctx,
  survivors: Group[],
  slideAt: number
): void {
  if (!survivors.length) {
    resetCursor(ctx);
    return;
  }
  // emphasis groups travel with their anchor as one unit
  const units: Array<{ root: Group; satellites: Group[] }> = [];
  for (const g of survivors) {
    if (g.anchor && survivors.includes(g.anchor)) continue; // satellite
    units.push({ root: g, satellites: survivors.filter((s) => s.anchor === g) });
  }
  // satellites whose anchor is not itself a survivor lead their own unit
  for (const g of survivors) {
    if (!g.anchor || survivors.includes(g.anchor)) continue;
    if (!units.some((u) => u.root === g))
      units.push({ root: g, satellites: survivors.filter((s) => s.anchor === g) });
  }
  units.sort((a, b) => a.root.bbox.y - b.root.bbox.y);

  const unitBottom = (u: { root: Group; satellites: Group[] }) =>
    Math.max(u.root.bbox.y + u.root.bbox.h, ...u.satellites.map((s) => s.bbox.y + s.bbox.h));
  const lowest = Math.max(...units.map(unitBottom));

  // already sitting at the top with room below → just continue under the keeps
  const nearTop = units.every(
    (u) => u.root.bbox.y <= FIRST_BASELINE + LINE_H.md * 0.55
  );
  if (
    nearTop &&
    lowest + LINE_H.md * 1.4 <= MAX_BASELINE + LINE_H.md * 0.25
  ) {
    ctx.cursor = {
      x: MARGIN_X,
      y: Math.max(FIRST_BASELINE, lowest + LINE_H.lg * 0.95),
    };
    ctx.lastBottom = lowest;
    return;
  }

  // no room below → slide the kept stack to the top of the cleared board
  // (the jump happens mid-sweep, hidden behind the eraser + dust)
  const moveAt = slideAt;
  let curY = Math.max(78, FIRST_BASELINE - LINE_H.md * 0.28);
  let bottomY = curY;
  for (const u of units) {
    const dy = curY - u.root.bbox.y;
    const dx = MARGIN_X - u.root.bbox.x;
    const members = [u.root, ...u.satellites];
    for (const g of members) {
      for (const s of g.strokes) {
        // moves ACCUMULATE across multiple erases — a kept chain can slide
        // again in a later scene (each slide appends its own delta)
        (s.moves ??= []).push({
          scene: ctx.sceneIdx,
          at: moveAt,
          dx,
          dy,
        });
      }
      g.bbox = { ...g.bbox, x: g.bbox.x + dx, y: g.bbox.y + dy };
    }
    // bboxes are already updated → unitBottom reads the new positions
    bottomY = unitBottom(u);
    curY = bottomY + LINE_H.md * 0.62;
  }
  ctx.cursor = { x: MARGIN_X, y: Math.min(bottomY + LINE_H.lg * 0.95, MAX_BASELINE) };
  ctx.lastBottom = bottomY;
}

function resetCursor(ctx: Ctx): void {
  ctx.cursor = { x: MARGIN_X, y: FIRST_BASELINE };
  ctx.lastBottom = -Infinity;
}

/** if the flow cursor went past the bottom, erase (keep keeps) and restart */
function autoEraseIfNeeded(ctx: Ctx): void {
  if (ctx.cursor.y <= MAX_BASELINE) return;
  // "write it and leave it" — a teacher never wipes a line they wrote
  // moments ago. Protect fresh ink even when nothing is keep-marked,
  // otherwise an unkept script gets a jarring full-board wipe mid-step.
  const recent = ctx.groups.filter(
    (g) =>
      !ctx.gone.has(g) &&
      g.text &&
      g.scene === ctx.sceneIdx &&
      ctx.now - g.born < 6
  );
  performErase(ctx, undefined, false, new Set(recent));
}

/** The board is genuinely FULL — even the keep-marked chain cannot fit.
 *  A real teacher erases the oldest panels and keeps the essentials: the
 *  problem line, the freshest ink ("write it and leave it"), and the two
 *  most recent kept results. Everything else goes, keeps included
 *  (demoted), and the survivors slide to the top of the cleared board.
 *  Survivors are passed as exact group refs — needle-matching a short
 *  text like "x" would keep every group containing it and the board would
 *  stay full. If even the essentials cannot fit, the lowest-priority
 *  items are dropped too — a teacher clears MORE, not less. */
function forceRoom(ctx: Ctx): void {
  const liveKept = ctx.groups.filter(
    (g) => !ctx.gone.has(g) && g.keep && g.text
  );
  // "write it and leave it" — never erase a line written moments ago
  const recent = ctx.groups.filter(
    (g) =>
      !ctx.gone.has(g) &&
      g.text &&
      g.scene === ctx.sceneIdx &&
      ctx.now - g.born < 6
  );
  // survival priority: problem line → fresh ink → latest kept results
  // (liveKept may be empty — nothing marked keep — and that's fine)
  const first = liveKept[0];
  const tail = first ? liveKept.slice(-2).filter((g) => g !== first) : [];
  const prio: Group[] = first ? [first, ...recent, ...tail] : [...recent];

  // the survivor stack (incl. boxed/circled emphasis anchored to it) must
  // fit between the slide-to top (~130) and the line we're about to write
  const BUDGET = MAX_BASELINE - 210;
  const unitH = (g: Group): number => {
    let bot = g.bbox.y + g.bbox.h;
    for (const s of ctx.groups) {
      if (!ctx.gone.has(s) && s.anchor === g)
        bot = Math.max(bot, s.bbox.y + s.bbox.h);
    }
    return bot - g.bbox.y + LINE_H.md * 0.62;
  };
  const keep = new Set<Group>();
  let used = 0;
  for (const g of prio) {
    if (keep.has(g)) continue;
    const h = unitH(g);
    if (used + h > BUDGET) continue; // board cannot hold it → clear more
    keep.add(g);
    used += h;
  }
  if (process.env.DEBUG_FORCEROOM)
    console.log(
      `[forceRoom] now=${ctx.now.toFixed(2)} liveKept=${liveKept.length} recent=[${recent
        .map((g) => `${g.text}@${g.born}`)
        .join(", ")}] keep=[${[...keep].map((g) => g.text).join(", ")}] used=${used.toFixed(0)}`
    );
  performErase(ctx, [], true, keep);
}

/* --------------------------- beat builders ------------------------ */

function buildTitle(ctx: Ctx, beat: Extract<Beat, { type: "title" }>): void {
  const cap = CAP.title;
  const color: MarkerName = beat.color ?? "yellow";
  const w = Math.min(measureText(beat.text, cap), BOARD_W - 2 * MARGIN_X - 20);
  const x = (BOARD_W - w) / 2;
  const laid = layoutText(beat.text, x, 104, {
    cap,
    color,
    maxWidth: BOARD_W - 2 * MARGIN_X,
    wrapX: MARGIN_X,
    seed: `t${ctx.sceneIdx}${ctx.beatNo}`,
  });
  const rng = rngFor("title-under", ctx.sceneIdx, ctx.beatNo);
  const uy = 104 + cap * 0.34;
  const under = roughLine(
    { x: x - 14, y: uy },
    { x: x + w + 18, y: uy - 3 },
    1.4,
    rng
  );
  addPaths(ctx, laid.strokes, { speedCap: cap, settle: 0.18 });
  addPaths(
    ctx,
    [{ pts: under, color, width: Math.max(2.6, cap * 0.075) }],
    { gap: 0.05, speedCap: cap, settle: 0.22 }
  );
  groupSinceBeatStart(ctx, beat.text);
  /* advance the flow from the title's ACTUAL rendered bottom — a long
   * title wraps to a second line, and a fixed one-line step would land
   * the next write straight through it (caught by the layout audit on
   * the first live Gemini generation). */
  const bottom = Math.max(laid.bbox.y + laid.bbox.h, uy + 6);
  ctx.cursor = { x: MARGIN_X, y: bottom + LINE_H.md * 0.92 };
  ctx.lastBottom = bottom;
}

const CONT_CHARS = new Set([
  "+", "−", "-", "=", "×", "÷", "/", "(", ",", ".",
  "^", "_", "≤", "≥", "<", ">", "→", "·", "✓", "°", "%", "≈", "≠",
]);

/** nudges a positioned write down until it doesn't sit on existing ink.
 *  blockBottom = absolute y of the text block's last descender — for wrapped
 *  multi-line labels this is below the LAST line, not the first. */
function avoidCollision(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  cap: number,
  blockBottom?: number // absolute bottom of the whole (possibly wrapped) block
): number {
  let bottom = blockBottom ?? y + cap * 0.32;
  for (let iter = 0; iter < 14; iter++) {
    const top = y - cap * 1.15;
    let hitBottom = -Infinity;
    for (const g of ctx.groups) {
      if (ctx.gone.has(g)) continue;
      const b = movedBBox(ctx, g);
      const xo = Math.min(x + w, b.x + b.w) - Math.max(x, b.x);
      const yo = Math.min(bottom, b.y + b.h) - Math.max(top, b.y);
      if (xo > 10 && yo > 5) hitBottom = Math.max(hitBottom, b.y + b.h);
    }
    if (hitBottom === -Infinity) return y;
    // land the glyph TOP (not the baseline) safely below the blocker
    const step = hitBottom + cap * 1.15 + 8;
    bottom += step - y;
    y = step;
    if (y > MAX_BASELINE) return Math.min(y, MAX_BASELINE);
  }
  return y;
}

/** slide a rectangular band (a numberline's strip, a table's block, a
 *  fraction's stack) down until it clears every live group's bbox.
 *  Same greedy displacement as avoidCollision, for arbitrary rects. */
function clearBandDown(
  ctx: Ctx,
  x: number,
  top: number,
  w: number,
  bottom: number
): number {
  let t = top;
  for (let iter = 0; iter < 14; iter++) {
    let hitBottom = -Infinity;
    for (const g of ctx.groups) {
      if (ctx.gone.has(g)) continue;
      const b = g.bbox;
      const xo = Math.min(x + w, b.x + b.w) - Math.max(x, b.x);
      const yo = Math.min(t + (bottom - top), b.y + b.h) - Math.max(t, b.y);
      if (xo > 10 && yo > 5) hitBottom = Math.max(hitBottom, b.y + b.h);
    }
    if (hitBottom === -Infinity) return t;
    t = hitBottom + 8;
  }
  return t;
}

function buildWrite(ctx: Ctx, beat: Extract<Beat, { type: "write" }>): void {
  const cap = CAP[beat.size ?? "md"];
  const color: MarkerName = beat.color ?? "white";
  let x: number;
  let y: number;
  const w = measureText(beat.text, cap);
  /** wrapped text returns to the left margin — the collision box must span
   *  from the margin to the right edge, not just the first line's x range */
  const collisionBox = (px: number) => {
    const wrap = measureWrap(beat.text, cap, Math.max(120, BOARD_W - MARGIN_X - px));
    const lines = wrap.lines;
    const acX = lines > 1 ? Math.min(px, MARGIN_X) : px;
    const acW = lines > 1 ? BOARD_W - MARGIN_X - acX : w;
    const blockBottom =
      (bY: number) => bY + (lines - 1) * wrap.lineStep + cap * 0.32;
    return { acX, acW, blockBottom, lines };
  };
  if (beat.below) {
    // annotation pinned under another group (e.g. "− 5" under the "+ 5" term)
    const t = resolveTarget(ctx, beat.below);
    if (t) {
      const tb = movedBBox(ctx, t);
      x = tb.x;
      y = tb.y + tb.h + cap * 1.18;
      autoEraseIfNeeded(ctx);
      const cb = collisionBox(x);
      y = avoidCollision(ctx, cb.acX, y, cb.acW, cap, cb.blockBottom(y));
      if (y > MAX_BASELINE - 2) {
        // no room under the target — let the flow place it instead
        beat = { ...beat, below: undefined };
        x = ctx.cursor.x;
        y = ctx.cursor.y;
      } else {
        placeWrite(ctx, beat, x, y, w, cap, color);
        return;
      }
    } else {
      /* unresolvable anchor — NEVER drop the text on the raw cursor
         (that skips fresh-line, auto-erase and every collision check);
         treat it as the plain write it is */
      beat = { ...beat, below: undefined };
    }
  }
  if (beat.x !== undefined || beat.y !== undefined) {
    const gx =
      beat.x !== undefined
        ? MARGIN_X +
          Math.max(0, Math.min(1, beat.x)) * (BOARD_W - 2 * MARGIN_X)
        : ctx.cursor.x;
    y =
      beat.y !== undefined
        ? 100 + Math.max(0, Math.min(1, beat.y)) * (MAX_BASELINE - 100)
        : ctx.cursor.y;
    const align = beat.align ?? "left";
    if (align === "center") x = gx - w / 2;
    else if (align === "right") x = gx - w;
    else x = gx;
    x = Math.max(MARGIN_X, Math.min(x, BOARD_W - MARGIN_X - 40));
    /* A left/center-aligned positioned write must never START so close to
       the right edge that its text wraps back to the far-LEFT margin —
       that produces a phantom fragment 1000px away from its own line (and
       a board-spanning collision box after erase slides). A teacher slides
       the whole line left to fit instead. Right-aligned writes fit by
       construction; genuinely board-wide text falls back to the margin,
       where wrapping down a line IS the right behavior. */
    if (align !== "right" && x + w > BOARD_W - MARGIN_X - 6) {
      x = Math.max(MARGIN_X, BOARD_W - MARGIN_X - 6 - w);
    }
    const cb = collisionBox(x);
    y = avoidCollision(ctx, cb.acX, y, cb.acW, cap, cb.blockBottom(y));
    if (y > MAX_BASELINE - 2) {
      // no room at the requested spot → let the flow place it (auto-erase if needed)
      const firstCh = beat.text.trimStart()[0] ?? "";
      const fresh =
        ctx.cursor.x <= MARGIN_X + 12 || !CONT_CHARS.has(firstCh);
      if (fresh) {
        ctx.cursor = {
          x: MARGIN_X,
          y: ctx.cursor.y + LINE_H.md * 0.92,
        };
      }
      autoEraseIfNeeded(ctx);
      x = ctx.cursor.x;
      y = Math.max(ctx.cursor.y, ctx.lastBottom + cap * 1.15 + 6);
      // the fallback line must ALSO clear older ink (e.g. positioned labels
      // or slid survivors the cursor knows nothing about)
      {
        const cb2 = collisionBox(x);
        y = avoidCollision(ctx, cb2.acX, y, cb2.acW, cap, cb2.blockBottom(y));
      }
      if (y > MAX_BASELINE) {
        forceRoom(ctx);
        x = ctx.cursor.x;
        y = Math.max(ctx.cursor.y, ctx.lastBottom + cap * 1.15 + 6);
        const cb3 = collisionBox(x);
        y = avoidCollision(ctx, cb3.acX, y, cb3.acW, cap, cb3.blockBottom(y));
        if (y > MAX_BASELINE) y = MAX_BASELINE; // last resort below all ink
      }
    }
  } else {
    // flow: start a fresh line unless this write continues the previous one
    const firstCh = beat.text.trimStart()[0] ?? "";
    let freshLine = ctx.cursor.x <= MARGIN_X + 12;
    if (ctx.cursor.x > MARGIN_X + 12 && !CONT_CHARS.has(firstCh)) {
      ctx.cursor = { x: MARGIN_X, y: ctx.cursor.y + LINE_H.md * 0.92 };
      freshLine = true;
    }
    autoEraseIfNeeded(ctx);
    x = ctx.cursor.x;
    y = ctx.cursor.y;
    if (freshLine) {
      // never crowd the previous line when the size jumps (e.g. sm → lg)
      y = Math.max(y, ctx.lastBottom + cap * 1.15 + 6);
      x = ctx.cursor.x;
    }
    // the flow line must also clear ANY older ink left/right of the last
    // write (e.g. a positioned instruction label above, or slid survivors)
    {
      const cb = collisionBox(x);
      y = avoidCollision(ctx, cb.acX, y, cb.acW, cap, cb.blockBottom(y));
    }
    if (y > MAX_BASELINE) {
      // board truly full (everything keep-marked) — clear the oldest panels
      // like a teacher would, keep problem + latest results, retry below them
      forceRoom(ctx);
      x = ctx.cursor.x;
      y = Math.max(ctx.cursor.y, ctx.lastBottom + cap * 1.15 + 6);
      // re-clear against the reflowed survivors before giving up
      const cb2 = collisionBox(x);
      y = avoidCollision(ctx, cb2.acX, y, cb2.acW, cap, cb2.blockBottom(y));
      if (y > MAX_BASELINE) y = MAX_BASELINE; // last resort below all ink
    }
  }
  placeWrite(ctx, beat, x, y, w, cap, color);
}

/** shared tail of buildWrite: lay the glyphs down and advance the cursor */
function placeWrite(
  ctx: Ctx,
  beat: Extract<Beat, { type: "write" }>,
  x: number,
  y: number,
  _w: number,
  cap: number,
  color: MarkerName
): void {
  const laid = layoutText(beat.text, x, y, {
    cap,
    color,
    maxWidth: BOARD_W - MARGIN_X - x,
    wrapX: MARGIN_X,
    seed: `w${ctx.sceneIdx}${ctx.beatNo}`,
  });
  addPaths(ctx, laid.strokes, { speedCap: cap });
  groupSinceBeatStart(ctx, beat.text, !!beat.keep);
  ctx.cursor = { x: x + laid.width + 16, y: laid.lastBaseline };
  ctx.lastBottom = laid.bbox.y + laid.bbox.h;
}

function buildFraction(ctx: Ctx, beat: Extract<Beat, { type: "fraction" }>): void {
  const cap = CAP[beat.size ?? "md"];
  const color: MarkerName = beat.color ?? "green";
  const smCap = CAP.sm;
  const prefix = beat.prefix ?? "";
  const suffix = beat.suffix ?? "";
  const prefixW = prefix ? measureText(prefix, cap) + 14 : 0;
  const suffixW = suffix ? measureText(suffix, cap) + 14 : 0;
  const numW = measureText(beat.num, smCap);
  const denW = measureText(beat.den, smCap);
  const fracW = Math.max(numW, denW) + 30;
  const total = prefixW + fracW + suffixW;
  // flow: fractions start a fresh line unless continuing (e.g. prefix "=")
  const firstCh = (prefix || beat.num || "").trimStart()[0] ?? "";
  if (
    ctx.cursor.x > MARGIN_X + 12 &&
    !CONT_CHARS.has(firstCh)
  ) {
    ctx.cursor = { x: MARGIN_X, y: ctx.cursor.y + LINE_H.md + 20 };
  }
  autoEraseIfNeeded(ctx);
  let x = ctx.cursor.x;
  let y = ctx.cursor.y;
  if (x + total > BOARD_W - MARGIN_X) {
    x = MARGIN_X;
    y += LINE_H.md + 24;
  }
  /* the fraction's stack clears any ink at its spot */
  {
    const top = clearBandDown(ctx, x, y - cap * 1.15, total, y + smCap * 1.15);
    y = top + cap * 1.15;
  }
  if (y > MAX_BASELINE) {
    performErase(ctx, undefined);
    resetCursor(ctx);
    x = ctx.cursor.x;
    y = ctx.cursor.y;
  }
  const raw: RawPath[] = [];
  if (prefix) {
    raw.push(
      ...layoutText(prefix, x, y, {
        cap,
        color,
        seed: `f${ctx.sceneIdx}${ctx.beatNo}p`,
      }).strokes
    );
  }
  const fx = x + prefixW;
  const barY = y - cap * 0.16;
  const numX = fx + (fracW - numW) / 2;
  const numBase = barY - smCap * 0.14;
  raw.push(
    ...layoutText(beat.num, numX, numBase, {
      cap: smCap,
      color,
      seed: `f${ctx.sceneIdx}${ctx.beatNo}n`,
    }).strokes
  );
  const rng = rngFor("frac", ctx.sceneIdx, ctx.beatNo);
  raw.push({
    pts: roughLine({ x: fx + 2, y: barY }, { x: fx + fracW - 4, y: barY - 2 }, 1.1, rng),
    color,
    width: Math.max(2.4, cap * 0.07),
  });
  const denX = fx + (fracW - denW) / 2;
  const denBase = barY + smCap * 0.88;
  raw.push(
    ...layoutText(beat.den, denX, denBase, {
      cap: smCap,
      color,
      seed: `f${ctx.sceneIdx}${ctx.beatNo}d`,
    }).strokes
  );
  let endX = fx + fracW;
  if (suffix) {
    raw.push(
      ...layoutText(suffix, endX + 12, y, {
        cap,
        color,
        seed: `f${ctx.sceneIdx}${ctx.beatNo}s`,
      }).strokes
    );
    endX += 12 + measureText(suffix, cap);
  }
  addPaths(ctx, raw, { speedCap: cap, gap: 0.05, settle: 0.12 });
  const text = `${prefix} ${beat.num}/${beat.den} ${suffix}`.trim();
  groupSinceBeatStart(ctx, text, !!beat.keep);
  ctx.cursor = { x: endX + 16, y };
  ctx.lastBottom = denBase + smCap * 0.4;
}

function buildEmphasis(
  ctx: Ctx,
  beat: Extract<
    Beat,
    { type: "box" | "circle" | "underline" | "highlight" | "crossout" }
  >
): void {
  const g = resolveTarget(ctx, beat.target);
  if (!g) return;
  const pad = 10;
  const b = movedBBox(ctx, g);
  const color: MarkerName =
    (beat as { color?: MarkerName }).color ?? "yellow";
  const rng = rngFor(beat.type, ctx.sceneIdx, ctx.beatNo);
  const width = 3.1;
  const raw: RawPath[] = [];
  let crossedAnchor: Group | null = null;

  if (beat.type === "crossout") {
    const t = resolveTarget(ctx, beat.target, true);
    if (!t) return;
    ctx.crossed.add(t);
    const x0 = t.bbox.x - 4;
    const x1 = t.bbox.x + t.bbox.w + 4;
    const y0 = t.bbox.y - 4;
    const y1 = t.bbox.y + t.bbox.h + 4;
    raw.push({ pts: roughLine({ x: x0, y: y0 }, { x: x1, y: y1 }, 1.2, rng), color: "red", width: 2.8 });
    raw.push({ pts: roughLine({ x: x0, y: y1 }, { x: x1, y: y0 }, 1.2, rng), color: "red", width: 2.8 });
    crossedAnchor = t;
  } else if (beat.type === "box") {
    for (const s of roughRect(
      b.x - pad,
      b.y - pad,
      b.w + pad * 2,
      b.h + pad * 2,
      1.5,
      rng
    )) {
      raw.push({ pts: s, color, width });
    }
  } else if (beat.type === "circle") {
    raw.push({
      pts: roughEllipse(
        b.x + b.w / 2,
        b.y + b.h / 2,
        b.w / 2 + pad + 6,
        b.h / 2 + pad + 5,
        1.5,
        rng
      ),
      color,
      width,
    });
  } else if (beat.type === "underline") {
    raw.push({
      pts: roughLine(
        { x: b.x - 6, y: b.y + b.h + 9 },
        { x: b.x + b.w + 9, y: b.y + b.h + 5 },
        1.3,
        rng
      ),
      color,
      width,
    });
  }

  if (beat.type === "highlight") {
    const hl: HighlightStroke = {
      kind: "highlight",
      rect: { x: b.x - 7, y: b.y - 6, w: b.w + 14, h: b.h + 12 },
      color,
      t0: ctx.now,
      dur: 0.32,
    };
    ctx.scene.strokes.push(hl);
    ctx.now += 0.32 + 0.24;
    groupSinceBeatStart(ctx, undefined, false, crossedAnchor ?? g);
    // emphasis marks hang below the line — keep the flow cursor below them
    ctx.lastBottom = Math.max(ctx.lastBottom, hl.rect.y + hl.rect.h + 4);
    return;
  }

  addPaths(ctx, raw, { gap: 0.08, speedCap: 30, settle: 0.2 });
  groupSinceBeatStart(ctx, undefined, false, crossedAnchor ?? g);
  // same for boxes/circles/underlines/crossouts: their arcs dip under the
  // text bbox, so record the true ink bottom for the next line's clearance
  let inkBottom = -Infinity;
  for (const p of raw) {
    for (const pt of p.pts) inkBottom = Math.max(inkBottom, pt.y);
  }
  if (Number.isFinite(inkBottom)) {
    ctx.lastBottom = Math.max(ctx.lastBottom, inkBottom + 4);
  }
}

/* Deictic gesture: the pen travels to a term already on the board and
   holds there (with a subtle hand sway) — like a professor pointing at
   the step they are talking about. No ink is left; the hold advances the
   clock so narration can reference it. */
function buildPoint(ctx: Ctx, beat: Extract<Beat, { type: "point" }>): void {
  const g = resolveTarget(ctx, beat.target);
  if (!g) return;
  const b = movedBBox(ctx, g);
  // point FROM BESIDE the term (just under its left third) — a finger
  // pointing at a line, never covering the glyphs themselves
  const c = { x: b.x + b.w * 0.32, y: b.y + b.h + 10 };
  const dur = Math.max(0.5, Math.min(2.2, (beat.ms ?? 1000) / 1000));
  const inkColor: MarkerName =
    (g.strokes.find((s) => s.kind === "path") as PathStroke | undefined)
      ?.color ?? "white";
  ctx.scene.strokes.push({
    kind: "path",
    pts: [c, { x: c.x + 0.01, y: c.y }],
    color: inkColor,
    width: 0.01,
    t0: ctx.now,
    dur,
    cum: [0, 0.01],
    len: 0.01,
  });
  ctx.now += dur + 0.12;
}

function buildArrow(ctx: Ctx, beat: Extract<Beat, { type: "arrow" }>): void {
  const from = resolveTarget(ctx, beat.from ?? "last");
  const to = resolveTarget(ctx, beat.to ?? "last");
  if (!from || !to || from === to) return;
  const a = movedBBox(ctx, from);
  const b = movedBBox(ctx, to);
  const aR = { x: a.x + a.w + 8, y: a.y + a.h / 2 };
  const aL = { x: a.x - 8, y: a.y + a.h / 2 };
  const bL = { x: b.x - 12, y: b.y + b.h / 2 };
  const bR = { x: b.x + b.w + 12, y: b.y + b.h / 2 };
  const useRight = Math.abs(aR.x - bL.x) < Math.abs(aL.x - bR.x);
  const p0 = useRight ? aR : aL;
  const p1 = useRight ? bL : bR;
  const raw: RawPath[] = [];
  const rng = rngFor("arrow", ctx.sceneIdx, ctx.beatNo);
  const bend =
    p1.y === p0.y ? 0 : (p1.x - p0.x > 0 ? -1 : 1) * Math.min(34, Math.abs(p1.y - p0.y) * 0.4);
  for (const s of roughArrow(p0, p1, bend, 1.2, rng)) {
    raw.push({ pts: s, color: beat.color ?? "orange", width: 2.9 });
  }
  addPaths(ctx, raw, { gap: 0.05, speedCap: 34, settle: 0.12 });
  if (beat.label) {
    const laid = layoutText(beat.label, (p0.x + p1.x) / 2 - 24, Math.min(p0.y, p1.y) - 28, {
      cap: CAP.sm,
      color: beat.color ?? "orange",
      jitter: false,
      seed: `ar${ctx.sceneIdx}${ctx.beatNo}`,
    });
    addPaths(ctx, laid.strokes, {});
  }
  groupSinceBeatStart(ctx, undefined);
}

/* ------------------------- free-body diagram ----------------------- */

/* a free-body diagram beat draws what a physics professor actually
   chalks: the surface (flat ground or an incline with its angle), a
   block sitting on it, and labeled force arrows radiating from the
   block. Curated rendering — the model only picks the angle, the
   block label, and the force list, so every diagram comes out
   pristine. */

/** A block label must MEASURE against the block it annotates — the
 *  reported defect was "5 kg" at cap 21 overflowing a 48×32 block.
 *  Shrink first (a professor writes small inside a small box); labels
 *  that cannot fit even shrunk are written beside the block instead. */
export function fitBlockLabel(
  label: string,
  hw: number,
  hh: number
): { mode: "inside"; cap: number } | { mode: "outside" } {
  if (label.length > 6) return { mode: "outside" };
  const maxW = hw * 2 * 0.92;
  const maxH = hh * 2 * 0.78;
  for (const cap of [20, 18, 16, 14, 12]) {
    if (cap <= maxH && measureText(label, cap) <= maxW) {
      return { mode: "inside", cap };
    }
  }
  return { mode: "outside" };
}

function fbDirVec(dir: string, th: number): Pt {
  switch (dir) {
    case "down":
      return { x: 0, y: 1 };
    case "up":
      return { x: 0, y: -1 };
    case "left":
      return { x: -1, y: 0 };
    case "right":
      return { x: 1, y: 0 };
    case "upslope":
      return { x: Math.cos(th), y: -Math.sin(th) };
    case "downslope":
      return { x: -Math.cos(th), y: Math.sin(th) };
    case "normal":
      /* perpendicular to the surface, pointing away from it */
      return { x: -Math.sin(th), y: -Math.cos(th) };
    default:
      return { x: 0, y: 1 };
  }
}

function buildFreebody(ctx: Ctx, beat: Extract<Beat, { type: "freebody" }>): void {
  const deg = Math.max(0, Math.min(70, beat.angle ?? 0));
  const th = (deg * Math.PI) / 180;
  const incline = th > 0.03;
  const w = incline ? 380 : 320;
  const rise = incline ? Math.min(w * Math.tan(th), 150) : 0;
  const h = Math.round((incline ? 172 : 136) + rise * 0.42);
  autoEraseIfNeeded(ctx);

  /* placement — the graph discipline: beside the current line if there
     is room, otherwise centered below, clearing the ink above */
  let x0 = ctx.cursor.x + 28;
  if (BOARD_W - MARGIN_X - x0 < w + 16) {
    x0 = MARGIN_X + Math.max(0, (BOARD_W - 2 * MARGIN_X - w) / 2);
  }
  let y0 = ctx.cursor.y - CAP.md;
  if (Number.isFinite(ctx.lastBottom) && ctx.lastBottom > -Infinity) {
    y0 = Math.max(y0, ctx.lastBottom + 26);
  }
  if (y0 + h > MAX_BASELINE + 60 || y0 < 56) {
    performErase(ctx, undefined);
    resetCursor(ctx);
    x0 = MARGIN_X + Math.max(0, (BOARD_W - 2 * MARGIN_X - w) / 2);
    y0 = Math.max(ctx.cursor.y - CAP.md, 96);
  }
  const yG = y0 + h - 26; // the ground line
  const rng = rngFor("fb", ctx.sceneIdx, ctx.beatNo);
  const ink: MarkerName = "white";
  const arrowColor: MarkerName = beat.color ?? "yellow";

  /* 1 ─ the surface */
  const surf: RawPath[] = [
    {
      pts: jitterPolyline(
        [
          { x: x0 - 12, y: yG },
          { x: x0 + w + 16, y: yG },
        ],
        1.2,
        rng
      ),
      color: ink,
      width: 2.8,
    },
  ];
  if (incline) {
    surf.push({
      pts: jitterPolyline(
        [
          { x: x0, y: yG },
          { x: x0 + w, y: yG - rise },
        ],
        1.2,
        rng
      ),
      color: ink,
      width: 2.8,
    });
    const arc: Pt[] = [];
    for (let i = 0; i <= 8; i++) {
      const a = (th * i) / 8;
      arc.push({ x: x0 + 30 * Math.cos(a), y: yG - 30 * Math.sin(a) });
    }
    surf.push({ pts: jitterPolyline(arc, 0.7, rng), color: ink, width: 2.2 });
  }
  addPaths(ctx, surf, { gap: 0.1, speedCap: 40, settle: 0.12 });
  if (incline) {
    const laid = layoutText("θ", x0 + 40, yG - 10, {
      cap: CAP.sm,
      color: ink,
      jitter: false,
      seed: `fbth${ctx.sceneIdx}${ctx.beatNo}`,
    });
    addPaths(ctx, laid.strokes, {});
  }

  /* 2 ─ the block, sitting on the surface */
  const hw = 24;
  const hh = 16;
  const px = incline ? x0 + w * 0.4 : x0 + w / 2;
  const py = incline ? yG - rise * 0.4 : yG;
  const n = fbDirVec("normal", th);
  const c: Pt = { x: px + n.x * (hh + 6), y: py + n.y * (hh + 6) };
  const rot = (vx: number, vy: number): Pt => ({
    x: c.x + vx * Math.cos(th) + vy * Math.sin(th),
    y: c.y - vx * Math.sin(th) + vy * Math.cos(th),
  });
  const corners = [rot(-hw, -hh), rot(hw, -hh), rot(hw, hh), rot(-hw, hh)];
  const blockPts = [
    ...corners,
    { x: corners[0].x + 7, y: corners[0].y + 2 }, // pen crosses the first corner
  ];
  addPaths(
    ctx,
    [jitterPolyline(blockPts, 1.1, rng), jitterPolyline(blockPts, 1.1, rng)].map(
      (pts, i) => ({ pts, color: ink, width: i === 0 ? 3 : 2.1 })
    ),
    { gap: 0.06, speedCap: 34, settle: 0.14 }
  );
  const blockLabel = beat.block ?? "m";
  const fit = fitBlockLabel(blockLabel, hw, hh);
  if (fit.mode === "inside") {
    const lw = measureText(blockLabel, fit.cap);
    const laid = layoutText(blockLabel, c.x - lw / 2, c.y + fit.cap * 0.34, {
      cap: fit.cap,
      color: ink,
      jitter: false,
      seed: `fbbl${ctx.sceneIdx}${ctx.beatNo}`,
    });
    addPaths(ctx, laid.strokes, {});
  } else {
    const laid = layoutText(blockLabel, c.x + 34, c.y - 30, {
      cap: CAP.sm,
      color: ink,
      jitter: false,
      seed: `fbbl${ctx.sceneIdx}${ctx.beatNo}`,
    });
    addPaths(ctx, laid.strokes, {});
  }

  /* 3 ─ the forces, one arrow at a time with its label — the way a
     professor adds vectors while naming them */
  const forces: ForceArrow[] = beat.forces?.length
    ? beat.forces.slice(0, 5)
    : [
        { label: "mg", dir: "down" },
        { label: "N", dir: "normal" },
      ];
  for (const f of forces) {
    const d = fbDirVec(f.dir ?? "down", th);
    const L = f.dir === "down" ? 74 : 62;
    const start: Pt = { x: c.x + d.x * 26, y: c.y + d.y * 26 };
    const tip: Pt = { x: c.x + d.x * (26 + L), y: c.y + d.y * (26 + L) };
    const arrowRaw: RawPath[] = roughArrow(start, tip, 0, 1.1, rng).map(
      (pts) => ({ pts, color: arrowColor, width: 3.1 })
    );
    addPaths(ctx, arrowRaw, { gap: 0.08, speedCap: 30, settle: 0.14 });
    if (f.label) {
      const perp: Pt = { x: -d.y, y: d.x };
      /* push the label clear past the arrowhead — the longer the label,
         the further out along the arrow direction it goes, so wide
         labels like "T = 40 N" never sit on the shaft */
      const lw = measureText(f.label, CAP.sm);
      const lx = tip.x + d.x * (14 + lw * 0.3) + perp.x * 10;
      const ly = tip.y + d.y * (14 + lw * 0.3) + perp.y * 10;
      const laid = layoutText(f.label, lx - lw / 2, ly, {
        cap: CAP.sm,
        color: arrowColor,
        jitter: false,
        seed: `fbf${f.label}${f.dir}${ctx.beatNo}`,
      });
      addPaths(ctx, laid.strokes, {});
    }
  }

  groupSinceBeatStart(ctx, "freebody diagram");
  ctx.cursor = { x: MARGIN_X, y: yG + 26 + LINE_H.sm };
  ctx.lastBottom = yG + 10;
}

/* ------------------------------ graph ----------------------------- */

function niceStep(range: number, targetTicks: number): number {
  const raw = range / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const mult = norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10;
  return mult * mag;
}

function buildGraph(ctx: Ctx, beat: Extract<Beat, { type: "graph" }>): void {
  const { fn } = tryCompileExpr(beat.expr);
  if (!fn) return;
  autoEraseIfNeeded(ctx);
  let x0 = ctx.cursor.x + 28;
  let w = BOARD_W - MARGIN_X - x0;
  if (w < 380) {
    x0 = MARGIN_X;
    w = Math.min(560, BOARD_W - 2 * MARGIN_X);
  }
  w = Math.min(w, 560);
  let y0 = ctx.cursor.y - CAP.md;
  /* clear the line above: the y-axis overshoots 12px above the box
     top, and the previous line's subscripts/descenders (μₖ, y₂…)
     hang well below its baseline — a graph placed level with them
     writes its axis straight through the ink */
  if (Number.isFinite(ctx.lastBottom) && ctx.lastBottom > -Infinity) {
    y0 = Math.max(y0, ctx.lastBottom + 26);
  }
  let h = Math.min(330, w * 0.62);
  if (y0 + h > 700 || y0 < 56) {
    performErase(ctx, undefined);
    resetCursor(ctx);
    x0 = MARGIN_X;
    w = 560;
    y0 = ctx.cursor.y - CAP.md;
    h = 330;
  }
  const xMin = beat.xMin ?? -5;
  const xMax = beat.xMax ?? 5;
  let yLo = Infinity;
  let yHi = -Infinity;
  const N = 240;
  for (let i = 0; i <= N; i++) {
    const x = xMin + ((xMax - xMin) * i) / N;
    const y = fn(x);
    if (Number.isFinite(y)) {
      if (y < yLo) yLo = y;
      if (y > yHi) yHi = y;
    }
  }
  if (!Number.isFinite(yLo) || !Number.isFinite(yHi) || yHi - yLo < 1e-9) {
    yLo = -1;
    yHi = 1;
  }
  const pad = (yHi - yLo) * 0.12;
  yLo -= pad;
  yHi += pad;
  const mapX = (x: number) => x0 + ((x - xMin) / (xMax - xMin)) * w;
  const mapY = (y: number) => y0 + h - ((y - yLo) / (yHi - yLo)) * h;
  const ink: MarkerName = "white";
  const curveColor: MarkerName = beat.color ?? "yellow";
  const rng = rngFor("graph", ctx.sceneIdx, ctx.beatNo);
  const raw: RawPath[] = [];
  const ax = Math.max(x0 + 18, Math.min(x0 + w - 18, mapX(0)));
  const ay = Math.max(y0 + 18, Math.min(y0 + h - 18, mapY(0)));
  raw.push({
    pts: jitterPolyline([{ x: ax, y: y0 + h + 6 }, { x: ax, y: y0 - 12 }], 1.2, rng),
    color: ink,
    width: 2.6,
  });
  raw.push({
    pts: jitterPolyline([{ x: x0 - 12, y: ay }, { x: x0 + w + 14, y: ay }], 1.2, rng),
    color: ink,
    width: 2.6,
  });
  addPaths(ctx, raw, { gap: 0.12, speedCap: 40, settle: 0.15 });

  const tickRaw: RawPath[] = [];
  const labelRaw: RawPath[] = [];
  const stepX = niceStep(xMax - xMin, 8);
  const firstX = Math.ceil(xMin / stepX) * stepX;
  for (let v = firstX; v <= xMax + 1e-9; v += stepX) {
    const tx = mapX(v);
    if (Math.abs(tx - ax) < 14) continue;
    tickRaw.push({ pts: [{ x: tx, y: ay - 5 }, { x: tx, y: ay + 5 }], color: ink, width: 2 });
    labelRaw.push(
      ...layoutText(fmtNum(Math.round(v * 100) / 100), tx - 8, ay + 26, {
        cap: 21,
        color: ink,
        jitter: false,
        seed: `gx${v}`,
      }).strokes
    );
  }
  const stepY = niceStep(yHi - yLo, 6);
  const firstY = Math.ceil(yLo / stepY) * stepY;
  for (let v = firstY; v <= yHi + 1e-9; v += stepY) {
    const ty = mapY(v);
    if (Math.abs(ty - ay) < 12) continue;
    tickRaw.push({ pts: [{ x: ax - 5, y: ty }, { x: ax + 5, y: ty }], color: ink, width: 2 });
    labelRaw.push(
      ...layoutText(fmtNum(Math.round(v * 100) / 100), ax - 42, ty + 8, {
        cap: 21,
        color: ink,
        jitter: false,
        seed: `gy${v}`,
      }).strokes
    );
  }
  addPaths(ctx, tickRaw, { gap: 0.035, speedCap: 30, settle: 0.05 });
  addPaths(ctx, labelRaw, { gap: 0.02, speedCap: 24, settle: 0.1 });

  const curveRaw: RawPath[] = [];
  let cur: Pt[] = [];
  let prevY: number | null = null;
  for (let i = 0; i <= N; i++) {
    const xv = xMin + ((xMax - xMin) * i) / N;
    const yv = fn(xv);
    if (!Number.isFinite(yv) || yv < yLo - (yHi - yLo) || yv > yHi + (yHi - yLo)) {
      if (cur.length > 1) curveRaw.push({ pts: cur, color: curveColor, width: 3.4 });
      cur = [];
      prevY = null;
      continue;
    }
    const p = { x: mapX(xv), y: mapY(yv) };
    if (prevY !== null && Math.abs(p.y - prevY) > h * 1.6) {
      if (cur.length > 1) curveRaw.push({ pts: cur, color: curveColor, width: 3.4 });
      cur = [];
    }
    cur.push(p);
    prevY = p.y;
  }
  if (cur.length > 1) curveRaw.push({ pts: cur, color: curveColor, width: 3.4 });
  // draw the curve a bit faster than handwriting, like a practiced sweep
  const curveTimed = addPaths(ctx, curveRaw, { gap: 0.16, speedCap: 220, settle: 0.15 });
  for (const s of curveTimed) if (s.dur < 0.85) s.dur = 0.85;

  if (beat.label) {
    /* the label must not land on an earlier line (its default spot,
     * y0 − 14, is exactly the baseline above the graph) — try a few
     * professor-plausible positions and take the first clear one */
    const hitsInk = (x: number, y: number): boolean => {
      const laid = layoutText(beat.label!, x, y, {
        cap: CAP.sm,
        color: curveColor,
        seed: `gl${ctx.sceneIdx}${ctx.beatNo}`,
      });
      let bx0 = Infinity;
      let by0 = Infinity;
      let bx1 = -Infinity;
      let by1 = -Infinity;
      for (const st of laid.strokes) {
        for (const p of st.pts) {
          bx0 = Math.min(bx0, p.x);
          by0 = Math.min(by0, p.y);
          bx1 = Math.max(bx1, p.x);
          by1 = Math.max(by1, p.y);
        }
      }
      if (!Number.isFinite(bx0)) return false;
      bx0 -= 6; by0 -= 6; bx1 += 6; by1 += 6;
      for (const g of ctx.groups) {
        if (ctx.gone.has(g)) continue;
        const b = g.bbox;
        if (bx0 < b.x + b.w && bx1 > b.x && by0 < b.y + b.h && by1 > b.y) {
          return true;
        }
      }
      return false;
    };
    const spots = [
      { x: x0 + w * 0.3, y: y0 - 14 }, // graph title (preferred)
      { x: x0 + w * 0.3, y: y0 + 22 }, // tucked inside the top edge
      { x: x0 + w * 0.3, y: y0 - 14 - LINE_H.sm }, // above the previous line
      { x: x0 + 16, y: y0 - 14 }, // left-aligned title
    ];
    let pick = spots[0];
    for (const s of spots) {
      if (!hitsInk(s.x, s.y)) {
        pick = s;
        break;
      }
    }
    const laid = layoutText(beat.label, pick.x, pick.y, {
      cap: CAP.sm,
      color: curveColor,
      seed: `gl${ctx.sceneIdx}${ctx.beatNo}`,
    });
    addPaths(ctx, laid.strokes, {});
  }
  for (const pt of beat.points ?? []) {
    const px = mapX(pt.x);
    const pyRaw = fn(pt.x);
    if (!Number.isFinite(pyRaw)) continue;
    const py = mapY(pyRaw);
    const dot = roughEllipse(px, py, 6, 6, 0.8, rngFor("gd", pt.x, pt.y));
    addPaths(ctx, [{ pts: dot, color: curveColor, width: 2.6 }], { speedCap: 30 });
    if (pt.label) {
      const laid = layoutText(pt.label, px + 12, py - 14, {
        cap: CAP.sm,
        color: curveColor,
        jitter: false,
        seed: `gpl${pt.x}`,
      });
      addPaths(ctx, laid.strokes, {});
    }
  }
  groupSinceBeatStart(ctx, beat.label ?? beat.expr);
  ctx.cursor = { x: MARGIN_X, y: y0 + h + LINE_H.md };
}

/* --------------------------- number line -------------------------- */

function buildNumberLine(
  ctx: Ctx,
  beat: Extract<Beat, { type: "numberline" }>
): void {
  if (beat.max - beat.min < 1e-9) return;
  autoEraseIfNeeded(ctx);
  const color: MarkerName = beat.color ?? "blue";
  const ink: MarkerName = "white";
  const x0 = MARGIN_X + 60;
  const x1 = BOARD_W - MARGIN_X - 60;
  const { min, max } = beat;
  const map = (v: number) => x0 + ((v - min) / (max - min)) * (x1 - x0);
  let lineY = ctx.cursor.y + 8;
  /* the strip (hop labels above, tick digits below) clears live ink —
   *  a numberline spans the whole board and would otherwise draw its
   *  line straight through kept work */
  {
    const top = clearBandDown(
      ctx,
      MARGIN_X + 20,
      lineY - 84,
      BOARD_W - 2 * MARGIN_X - 40,
      lineY + 64
    );
    lineY = top + 84;
    if (lineY + 64 > MAX_BASELINE) {
      performErase(ctx, undefined);
      resetCursor(ctx);
      lineY = ctx.cursor.y + 8;
    }
  }
  const rng = rngFor("nl", ctx.sceneIdx, ctx.beatNo);
  const raw: RawPath[] = [
    {
      pts: jitterPolyline([{ x: x0 - 28, y: lineY }, { x: x1 + 28, y: lineY }], 1.2, rng),
      color: ink,
      width: 2.8,
    },
  ];
  for (const dir of [x0 - 28, x1 + 28]) {
    const sgn = dir === x0 - 28 ? 1 : -1;
    raw.push({ pts: [{ x: dir, y: lineY }, { x: dir - sgn * 12, y: lineY - 5 }], color: ink, width: 2.4 });
    raw.push({ pts: [{ x: dir, y: lineY }, { x: dir - sgn * 12, y: lineY + 5 }], color: ink, width: 2.4 });
  }
  addPaths(ctx, raw, { gap: 0.06, speedCap: 40, settle: 0.12 });

  const tickRaw: RawPath[] = [];
  const labelRaw: RawPath[] = [];
  const step = max - min <= 14 ? 1 : max - min <= 30 ? 2 : max - min <= 70 ? 10 : 25;
  for (let v = Math.ceil(min); v <= max; v += step) {
    const tx = map(v);
    tickRaw.push({ pts: [{ x: tx, y: lineY - 8 }, { x: tx, y: lineY + 8 }], color: ink, width: 2.2 });
    labelRaw.push(
      ...layoutText(String(v), tx - 7, lineY + 36, {
        cap: 22,
        color: ink,
        jitter: false,
        seed: `nlt${v}`,
      }).strokes
    );
  }
  addPaths(ctx, tickRaw, { gap: 0.03, speedCap: 30, settle: 0.05 });
  addPaths(ctx, labelRaw, { gap: 0.02, speedCap: 24, settle: 0.1 });

  for (const hop of beat.hops ?? []) {
    const a = map(hop.from);
    const b = map(hop.to);
    const hgt = 44;
    const arc: Pt[] = [];
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      arc.push({ x: a + (b - a) * t, y: lineY - Math.sin(Math.PI * t) * hgt - 10 });
    }
    const hopTimed = addPaths(
      ctx,
      [{ pts: jitterPolyline(arc, 1, rngFor("hop", hop.from, hop.to)), color, width: 3 }],
      { gap: 0.1, speedCap: 220, settle: 0.08 }
    );
    for (const s of hopTimed) if (s.dur < 0.55) s.dur = 0.55;
    if (hop.label) {
      const laid = layoutText(
        hop.label,
        (a + b) / 2 - measureText(hop.label, 22) / 2,
        lineY - hgt - 36,
        { cap: 22, color, jitter: false, seed: `hopl${hop.from}${hop.to}` }
      );
      addPaths(ctx, laid.strokes, {});
    }
  }
  for (const pt of beat.points ?? []) {
    const px = map(pt.at);
    const dot = roughEllipse(px, lineY, 6.5, 6.5, 0.8, rngFor("nlp", pt.at));
    addPaths(ctx, [{ pts: dot, color, width: 2.8 }], { speedCap: 30 });
    if (pt.label) {
      const laid = layoutText(pt.label, px - 12, lineY - 28, {
        cap: CAP.sm,
        color,
        jitter: false,
        seed: `nlpl${pt.at}`,
      });
      addPaths(ctx, laid.strokes, {});
    }
  }
  groupSinceBeatStart(ctx, undefined);
  ctx.cursor = { x: MARGIN_X, y: lineY + LINE_H.md + 40 };
}

/* ------------------------------ table ----------------------------- */

function buildTable(ctx: Ctx, beat: Extract<Beat, { type: "table" }>): void {
  const rows = beat.rows.slice(0, 4);
  const headers = (beat.headers ?? []).slice(0, 3);
  if (!rows.length && !headers.length) return;
  autoEraseIfNeeded(ctx);
  const color: MarkerName = beat.color ?? "green";
  const ink: MarkerName = "white";
  const cap = CAP.sm;
  const nCols = Math.max(headers.length, ...rows.map((r) => r.length), 1);
  const availW = BOARD_W - 2 * MARGIN_X - 40;
  const colW: number[] = [];
  for (let c = 0; c < nCols; c++) {
    let mw = headers[c] ? measureText(headers[c], cap) : 0;
    for (const r of rows) mw = Math.max(mw, r[c] ? measureText(r[c] ?? "", cap) : 0);
    colW.push(Math.max(110, mw + 36));
  }
  const scaleK = Math.min(1, availW / colW.reduce((a, b) => a + b, 0));
  const cols = colW.map((w) => w * scaleK);
  const tableW = cols.reduce((a, b) => a + b, 0);
  const x0 = (BOARD_W - tableW) / 2;
  const rowH = 56;
  /* the whole table block (title included) clears live ink before drawing */
  {
    const titleAllow = beat.title ? 46 : 0;
    const rows2 = rows.length + (headers.length ? 1 : 0);
    const top = clearBandDown(
      ctx,
      x0,
      ctx.cursor.y - 10,
      tableW,
      ctx.cursor.y - 10 + titleAllow + rows2 * rowH
    );
    ctx.cursor = { ...ctx.cursor, y: top + 10 };
  }
  let y = ctx.cursor.y - 10;
  if (beat.title) {
    const tw = measureText(beat.title, cap);
    const laid = layoutText(beat.title, (BOARD_W - tw) / 2, y, {
      cap,
      color,
      seed: `tt${ctx.sceneIdx}${ctx.beatNo}`,
    });
    addPaths(ctx, laid.strokes, {});
    y += 46;
  }
  const nRows = rows.length + (headers.length ? 1 : 0);
  const yEnd = y + nRows * rowH;
  if (yEnd > 700) {
    performErase(ctx, undefined);
    resetCursor(ctx);
    y = ctx.cursor.y - 10;
  }
  const rng = rngFor("table", ctx.sceneIdx, ctx.beatNo);
  const gridRaw: RawPath[] = [];
  for (let r = 0; r <= nRows; r++) {
    const gy = y + r * rowH;
    gridRaw.push({
      pts: roughLine({ x: x0, y: gy }, { x: x0 + tableW, y: gy - 1.5 }, 1.1, rng),
      color: r === 1 && headers.length ? color : ink,
      width: r === 1 && headers.length ? 2.9 : 2.2,
    });
  }
  {
    let cx = x0;
    for (let c = 0; c <= nCols; c++) {
      gridRaw.push({
        pts: roughLine({ x: cx, y }, { x: cx, y: yEnd - 1 }, 1, rng),
        color: ink,
        width: 2,
      });
      cx += cols[c] ?? 0;
    }
  }
  addPaths(ctx, gridRaw, { gap: 0.045, speedCap: 60, settle: 0.15 });

  const cellRaw: RawPath[] = [];
  const emitRow = (cells: string[], rowIdx: number, isHeader: boolean) => {
    let cx = x0;
    for (let c = 0; c < nCols; c++) {
      const txt = cells[c] ?? "";
      if (txt) {
        cellRaw.push(
          ...layoutText(txt, cx + 17, y + rowIdx * rowH + rowH * 0.66, {
            cap,
            color: isHeader ? color : ink,
            seed: `tc${ctx.sceneIdx}${ctx.beatNo}${rowIdx}${c}`,
          }).strokes
        );
      }
      cx += cols[c] ?? 0;
    }
  };
  if (headers.length) emitRow(headers, 0, true);
  rows.forEach((r, i) => emitRow(r, (headers.length ? 1 : 0) + i, false));
  addPaths(ctx, cellRaw, { gap: 0.028, speedCap: cap, settle: 0.15 });
  groupSinceBeatStart(ctx, beat.title);
  ctx.cursor = { x: MARGIN_X, y: yEnd + LINE_H.md * 0.7 };
}

/* ---------------------- talk-hold (deixis) ------------------------ */

/* A real professor finishes writing before finishing talking: they
   step back and POINT at the line they are explaining. When the
   narration will outlast the writing, park the pen beside the most
   recent visible term with the same gentle sway a "point" beat uses
   (embodied-cognition research: students mentally imitate the gesture).
   Pure pen choreography — no ink, no clock changes. */
function appendTalkHold(ctx: Ctx, estAudio: number): void {
  if (!ctx.scene.narration) return;
  const t0 = ctx.scene.writeEnd + 0.35;
  const talkEnd = Math.max(ctx.scene.writeEnd + 0.9, estAudio + 0.25);
  const holdDur = Math.min(25, talkEnd - 0.5 - t0);
  if (holdDur < 1.6) return; // too brief to read as pointing
  // most recent visible group (emphasis groups point at their target)
  let g: Group | undefined;
  for (let i = ctx.scene.groups.length - 1; i >= 0; i--) {
    const cand = ctx.scene.groups[i];
    if (ctx.gone.has(cand)) continue;
    g = cand.anchor && !ctx.gone.has(cand.anchor) ? cand.anchor : cand;
    break;
  }
  if (!g) return;
  const b = movedBBox(ctx, g);
  const c = { x: b.x + b.w * 0.32, y: b.y + b.h + 10 };
  const inkColor: MarkerName =
    (g.strokes.find((s) => s.kind === "path") as PathStroke | undefined)
      ?.color ?? "white";
  ctx.scene.strokes.push({
    kind: "path",
    pts: [c, { x: c.x + 0.01, y: c.y }],
    color: inkColor,
    width: 0.01,
    t0,
    dur: holdDur,
    cum: [0, 0.01],
    len: 0.01,
  });
}

/* The trademark intro writes at SIGNATURE pace — twice the teaching
   speed, like someone writing their own name. It is a brand bumper,
   not a lesson: compress the baked stroke schedule after compile.
   EVERY scene-relative clock must scale together — t0/dur AND the
   erase marks on this scene's strokes (else the brand's ink outlives
   the shrunken scene and the next title writes straight over it). */
function compressScene(scene: SceneTime, k: number, sceneIdx: number): void {
  for (const s of scene.strokes) {
    s.t0 = s.t0 * k;
    s.dur = Math.max(0.04, s.dur * k);
    if (s.eraseScene === sceneIdx && s.eraseAt !== undefined) {
      s.eraseAt = s.eraseAt * k;
    }
  }
  for (const e of scene.erases) e.at = e.at * k;
  scene.writeEnd = scene.writeEnd * k;
}

/* ----------------- say/write pacing (the lecture sync) ---------------
   When beats carry "say" tags (the exact words spoken while they are
   written), the natural pen schedule is RE-SHAPED so each beat group
   lands inside the time window where its words are actually spoken:
   the narration is split into ordered speech segments (tagged text +
   the pure-talk remainders between them), each segment's window is
   proportional to its share of the (estimated) audio, and the beats
   mapped into their window with a clamped time scale — writing slows
   down when there is much to say about one line (a real professor
   dragging the chalk while they explain), and pauses open up where
   the professor talks without writing. Beats with no tag join the
   segment of the words they decorate. */

const SAY_GAP = 0.12; // breathing between speech segments
const SAY_SCALE_MIN = 0.45; // allow pen to naturally brisk up when speech is quick so it never lags behind
const SAY_SCALE_MAX = 8.5; // allow pen to stretch gracefully across spoken phrases
/** speech windows start here — pen touches down in lockstep with the first word */
const SAY_T0 = 0.08;

/** lowercase alnum-only key with an index map back to the raw string */
function normalizeWithMap(raw: string): { key: string; idx: number[] } {
  let key = "";
  const idx: number[] = new Array(raw.length).fill(-1);
  let pendingSep = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (/[a-zA-Z0-9]/.test(ch)) {
      if (key.length && pendingSep) key += " ";
      key += ch.toLowerCase();
      idx[i] = key.length - 1;
      pendingSep = false;
    } else {
      pendingSep = true;
    }
  }
  return { key, idx };
}

/** raw [start, end) covering normalized range [a, b] */
function rawRangeFor(
  idx: number[],
  a: number,
  b: number
): [number, number] | null {
  let r0 = -1;
  let r1 = -1;
  for (let i = 0; i < idx.length; i++) {
    const n = idx[i];
    if (n < 0) continue;
    if (n >= a && n <= b) {
      if (r0 < 0) r0 = i;
      r1 = i;
    }
    if (n > b) break;
  }
  return r0 < 0 ? null : [r0, r1 + 1];
}

/** reshape the compiled pen schedule onto the speech segments.
 *  returns true when the scene is say-paced (real TTS durations then
 *  re-scale it — see setSceneAudio). */
function paceSceneToNarration(
  scene: SceneTime,
  groups: Group[],
  marks: BeatMark[],
  sceneIdx: number
): boolean {
  const narration = scene.narration;
  if (!narration || !marks.some((m) => m.say)) return false;

  const { key: nKey, idx: nIdx } = normalizeWithMap(narration);
  if (!nKey) return false;

  /* ordered say matches → narration speech segments (in raw chars) */
  interface Seg {
    r0: number;
    r1: number;
    isSay: boolean;
  }
  const segs: Seg[] = [];
  const markSeg = new Array<number>(marks.length).fill(-1); // segment a tagged mark opens
  let searchFrom = 0;
  let rawPos = 0;
  marks.forEach((m, i) => {
    if (!m.say) return;
    const sKey = normSpeechKey(m.say);
    if (!sKey) return;
    let at = nKey.indexOf(sKey, searchFrom);
    let matchedLen = sKey.length;
    if (at < 0 && searchFrom > 0) {
      at = nKey.indexOf(sKey, 0); // fallback if slightly out of sequence
    }
    if (at < 0) {
      // subphrase fallback: try matching 3+ word chunks
      const words = sKey.split(/\s+/);
      for (let len = words.length - 1; len >= 3; len--) {
        const sub = words.slice(0, len).join(" ");
        at = nKey.indexOf(sub, searchFrom);
        if (at < 0 && searchFrom > 0) at = nKey.indexOf(sub, 0);
        if (at >= 0) {
          matchedLen = sub.length;
          break;
        }
      }
    }
    if (at < 0) return; // duplicate / truly absent tag
    const rr = rawRangeFor(nIdx, at, at + Math.min(matchedLen - 1, nKey.length - 1 - at));
    if (!rr) return;
    if (rr[0] > rawPos) segs.push({ r0: rawPos, r1: rr[0], isSay: false });
    segs.push({ r0: rr[0], r1: rr[1], isSay: true });
    markSeg[i] = segs.length - 1;
    rawPos = rr[1];
    searchFrom = Math.max(searchFrom, at + matchedLen);
  });
  if (!segs.some((s) => s.isSay)) {
    /* Fallback pacing: distribute marks smoothly across the speech window */
    const validMarks = marks.filter((m) => m.t1 > m.t0);
    if (!validMarks.length) return false;
    const est = estimateNarration(narration);
    const leadIn = sceneIdx === 0 ? 8.0 : 2.5;
    const targetWriteEnd = Math.max(leadIn + 1.0, est * 0.82);
    const rawWriteSpan = Math.max(0.5, scene.writeEnd - HEAD);
    const k = Math.min(SAY_SCALE_MAX, Math.max(SAY_SCALE_MIN, (targetWriteEnd - leadIn) / rawWriteSpan));
    for (const st of scene.strokes) {
      st.t0 = leadIn + (st.t0 - HEAD) * k;
      st.dur = Math.max(0.03, st.dur * k);
    }
    for (const g of groups) {
      for (const st of g.strokes) {
        if (st.eraseScene === sceneIdx && st.eraseAt !== undefined) {
          st.eraseAt = leadIn + (st.eraseAt - HEAD) * k;
        }
      }
    }
    for (const e of scene.erases) e.at = leadIn + (e.at - HEAD) * k;
    scene.writeEnd = leadIn + (scene.writeEnd - HEAD) * k;
    return true;
  }

  /* every mark joins the segment of the nearest PRECEDING say (marks
     before the first tag join the opening segment — the pen starts
     writing as the first words play) */
  let cur = 0;
  const markSegFinal = marks.map((_, i) => {
    if (markSeg[i] >= 0) cur = markSeg[i];
    return cur;
  });

  /* per-segment windows ∝ share of the estimated audio */
  const est = estimateNarration(narration);
  const totalChars = Math.max(1, narration.length);
  const gaps = SAY_GAP * Math.max(0, segs.length - 1);
  const span = Math.max(1, est - gaps);
  const windowFor = (s: Seg) =>
    Math.max(0.2, (span * (s.r1 - s.r0)) / totalChars);

  /* old time range of the marks inside each segment */
  const segOld: Array<[number, number] | null> = segs.map(() => null);
  marks.forEach((m, i) => {
    if (m.t1 <= m.t0) return; // zero-time marks (newline) carry nothing
    const si = markSegFinal[i];
    const o = segOld[si];
    segOld[si] = o
      ? [Math.min(o[0], m.t0), Math.max(o[1], m.t1)]
      : [m.t0, m.t1];
  });

  /* planned proportional starts, monotonic placement, clamped scale */
  interface MapEntry {
    o0: number;
    o1: number;
    n0: number;
    scale: number;
  }
  const leadIn = sceneIdx === 0 ? 8.0 : 2.5;
  const map: MapEntry[] = [];
  let planned = leadIn;
  let prevEnd = leadIn;
  for (let si = 0; si < segs.length; si++) {
    const win = windowFor(segs[si]);
    const old = segOld[si];
    if (old) {
      const oldDur = Math.max(0.05, old[1] - old[0]);
      // STRICT PACING: Stroke durations are never scaled. The pen moves at a constant 45px/sec.
      const scale = 1.0;
      const n0 = Math.max(planned, si > 0 ? prevEnd + SAY_GAP : prevEnd);
      map.push({ o0: old[0], o1: old[1], n0, scale });
      prevEnd = n0 + oldDur * scale;
    }
    planned += win + SAY_GAP;
  }
  if (!map.length) return false;

  /* containment search, REVERSED: segment ranges are contiguous
     (o1 of one == o0 of the next), so a forward `t <= o1` scan would
     steal the first stroke of every new segment for the previous
     segment's window — the reversed scan resolves ties to the LATER
     entry, which is the stroke's own segment */
  const mapTime = (t: number): number => {
    for (let i = map.length - 1; i >= 0; i--) {
      const e = map[i];
      if (t >= e.o0 - 1e-6) return e.n0 + (t - e.o0) * e.scale;
    }
    const e = map[0];
    return e.n0 + (t - e.o0) * e.scale;
  };
  const mapScale = (t: number): number => {
    for (let i = map.length - 1; i >= 0; i--) {
      if (t >= map[i].o0 - 1e-6) return map[i].scale;
    }
    return map[0].scale;
  };

  const origWriteEnd = scene.writeEnd;
  for (const st of scene.strokes) {
    const sc = mapScale(st.t0);
    st.t0 = mapTime(st.t0);
    st.dur = Math.max(0.03, st.dur * sc);
  }
  /* erase marks and SURVIVOR SLIDES pointing INTO this scene live on
     strokes of ANY scene (a later scene can erase/slide earlier ink) —
     remap them all, or slides would fire before the ink they replace
     has faded (a mapped-time overlap) */
  for (const g of groups) {
    for (const st of g.strokes) {
      if (st.eraseScene === sceneIdx && st.eraseAt !== undefined) {
        st.eraseAt = mapTime(st.eraseAt);
      }
      if (st.moves) {
        for (const m of st.moves) {
          if (m.scene === sceneIdx) m.at = mapTime(m.at);
        }
      }
    }
  }
  for (const e of scene.erases) e.at = mapTime(e.at);
  scene.writeEnd = Math.max(SAY_T0, mapTime(origWriteEnd));
  return true;
}

/* --------------------------- main compile ------------------------- */

export function compileTimeline(script: SolveScript): Timeline {
  const groups: Group[] = [];
  const gone = new Set<Group>();
  const scenes: SceneTime[] = [];
  // the board persists across scenes — the cursor carries over
  let cursor: Pt = { x: MARGIN_X, y: FIRST_BASELINE };
  let lastBottom = -Infinity;
  script.scenes.forEach((sc, sceneIdx) => {
    const scene: SceneTime = {
      chapter: sc.chapter,
      narration: sc.narration,
      intro: sc.intro === true,
      strokes: [],
      groups: [],
      erases: [],
      head: HEAD,
      writeEnd: HEAD,
      dur: 0,
      locked: false,
    };
    const ctx: Ctx = {
      scene,
      sceneIdx,
      now: HEAD,
      cursor: { ...cursor },
      groups,
      gone,
      lastBottom,
      beatNo: 0,
      startLen: 0,
      crossed: new Set(),
      beatMarks: [],
    };
    let lastCap = CAP.md;
    for (const beat of sc.beats) {
      ctx.beatNo++;
      ctx.startLen = scene.strokes.length;
      const markT0 = ctx.now;
      const markSay = (beat as { say?: string }).say;
      switch (beat.type) {
        case "title":
          buildTitle(ctx, beat);
          lastCap = CAP.title;
          break;
        case "write":
          buildWrite(ctx, beat);
          lastCap = CAP[beat.size ?? "md"];
          break;
        case "fraction":
          buildFraction(ctx, beat);
          break;
        case "box":
        case "circle":
        case "underline":
        case "highlight":
        case "crossout":
          buildEmphasis(ctx, beat);
          break;
        case "arrow":
          buildArrow(ctx, beat);
          break;
        case "point":
          buildPoint(ctx, beat);
          break;
        case "freebody":
          buildFreebody(ctx, beat);
          break;
        case "graph":
          buildGraph(ctx, beat);
          break;
        case "numberline":
          buildNumberLine(ctx, beat);
          break;
        case "table":
          buildTable(ctx, beat);
          break;
        case "erase": {
          const n = performErase(ctx, beat.keep);
          if (n === 0) ctx.now += 0.25;
          // cursor is already aimed under the kept answer chain by reflow
          break;
        }
        case "wait":
          ctx.now += Math.max(0.1, Math.min(3, (beat.ms ?? 500) / 1000));
          break;
        case "newline": {
          const n = Math.max(1, Math.min(4, beat.n ?? 1));
          ctx.cursor = {
            x: MARGIN_X,
            y: ctx.cursor.y + LINE_H.md * n * 0.82 + (lastCap - CAP.md) * 0.2,
          };
          break;
        }
      }
      ctx.beatMarks.push({ t0: markT0, t1: ctx.now, say: markSay });
    }
    scene.writeEnd = ctx.now;
    const estAudio = estimateNarration(scene.narration);
    /* say/write pacing — the pen lands on the words being spoken.
       Runs BEFORE the talk-hold so the pointing tail follows the
       reshaped schedule. */
    const paced = paceSceneToNarration(scene, groups, ctx.beatMarks, sceneIdx);
    scene.paced = paced;
    scene.pacedFor = paced ? estAudio : undefined;
    appendTalkHold(ctx, estAudio);
    if (sc.intro) {
      compressScene(scene, 0.5, sceneIdx); // signature pace — bumper, not lesson
    }
    scene.dur = Math.max(HEAD + scene.writeEnd + 0.5, estAudio + 0.5);
    scenes.push(scene);
    cursor = ctx.cursor;
    lastBottom = ctx.lastBottom;
  });
  return {
    title: script.title,
    subject: script.subject,
    question: script.question,
    scenes,
  };
}

/** attach a known narration duration (TTS resolved) */
export function setSceneAudio(tl: Timeline, i: number, audioDur: number): void {
  const s = tl.scenes[i];
  if (!s || !Number.isFinite(audioDur) || audioDur <= 0) return;
  s.audioDur = audioDur;

  /* say-paced scenes stretch their whole pen schedule to the REAL
     speech length (TTS speaks at a steady rate, so scaling the baked
     schedule keeps every beat inside its own words' window). */
  if (s.paced && s.pacedFor !== audioDur) {
    const base = s.pacedFor ?? estimateNarration(s.narration);
    let k = (audioDur + 0.5 - HEAD) / (base + 0.5 - HEAD);
    if (Number.isFinite(k) && k > 0 && Math.abs(k - 1) > 0.01) {
      /* audio shorter than planned → do NOT rush the pen past ~0.8×;
       * the scene simply runs a touch longer than the voice (a real
       * professor finishing a line in silence). Rushing reads as AI. */
      k = Math.max(1.0, Math.min(2.3, k));
      const anchor = (t: number) => HEAD + (t - HEAD) * k;
      for (const st of s.strokes) {
        st.t0 = anchor(st.t0);
        st.dur = Math.max(0.03, st.dur * k);
      }
      /* erase marks + survivor slides on ANY scene's strokes pointing
         into this scene move with it */
      for (const sc of tl.scenes) {
        for (const st of sc.strokes) {
          if (st.eraseScene === i && st.eraseAt !== undefined) {
            st.eraseAt = anchor(st.eraseAt);
          }
          if (st.moves) {
            for (const m of st.moves) {
              if (m.scene === i) m.at = anchor(m.at);
            }
          }
        }
      }
      for (const e of s.erases) e.at = anchor(e.at);
      s.writeEnd = anchor(s.writeEnd);
      s.pacedFor = audioDur;
    } else if (Number.isFinite(k) && k > 0) {
      s.pacedFor = audioDur;
    }
  }

  const want = Math.max(HEAD + s.writeEnd + 0.5, audioDur + 0.5);
  if (!s.locked || want > s.dur) s.dur = want;
  s.locked = true;
}

/** freeze a scene's duration (it started playing) */
export function lockScene(tl: Timeline, i: number): void {
  const s = tl.scenes[i];
  if (s) s.locked = true;
}
