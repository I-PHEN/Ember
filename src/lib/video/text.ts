/* ------------------------------------------------------------------
   Text → strokes. Turns a string (with ^{} superscripts, _{} subscripts)
   into hand-jittered polylines using the single-stroke font, plus
   measurement helpers for wrapping / centering.
------------------------------------------------------------------- */

import { BASELINE, CAP_UNITS, FONT } from "./font-data";
import type { BBox, BeatSize, MarkerName, Pt } from "./types";
import { CAP } from "./types";
import { jitterPolyline, rngFor } from "./hand";

export interface RawStroke {
  pts: Pt[];
  color: MarkerName;
  width: number;
}

export interface LaidText {
  strokes: RawStroke[];
  width: number;
  bbox: BBox;
  /** y of the first baseline */
  firstBaseline: number;
  /** baseline y after the last line (for flow) */
  lastBaseline: number;
  lineCount: number;
}

interface Tok {
  ch: string;
  sup: 0 | 1 | -1; // 1 = superscript, -1 = subscript
}

/** tokenize: plain chars + ^{..} / _{..} groups + unicode super/subscripts */
export function tokenize(text: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if ((c === "^" || c === "_") && text[i + 1] === "{") {
      const end = text.indexOf("}", i + 2);
      if (end > i + 1) {
        const inner = text.slice(i + 2, end);
        for (const ch of inner) {
          toks.push({ ch, sup: c === "^" ? 1 : -1 });
        }
        i = end + 1;
        continue;
      }
    }
    // short forms: x^2  x_1
    if (
      (c === "^" || c === "_") &&
      i + 1 < text.length &&
      (text[i + 1] !== " " && !"()=+-*/<>".includes(text[i + 1]))
    ) {
      toks.push({ ch: text[i + 1], sup: c === "^" ? 1 : -1 });
      i += 2;
      continue;
    }
    toks.push({ ch: c, sup: 0 });
    i++;
  }
  return toks;
}

const SUP_MAP: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6",
  "⁷": "7", "⁸": "8", "⁹": "9", "ⁿ": "n", "⁺": "+", "⁻": "-", "ⁱ": "i", "ˣ": "x",
};
const SUB_MAP: Record<string, string> = {
  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6",
  "₇": "7", "₈": "8", "₉": "9", "ₙ": "n", "ₓ": "x",
  "ₐ": "a", "ₑ": "e", "ₕ": "h", "ₖ": "k", "ₗ": "l", "ₘ": "m",
  "ₒ": "o", "ₚ": "p", "ₛ": "s", "ₜ": "t", "ᵣ": "r", "ᵤ": "u", "ᵥ": "v",
};

function normalize(ch: string, sup: 0 | 1 | -1): { ch: string; sup: 0 | 1 | -1 } {
  if (sup === 0) {
    const s = SUP_MAP[ch];
    if (s) return { ch: s, sup: 1 };
    const b = SUB_MAP[ch];
    if (b) return { ch: b, sup: -1 };
  }
  // normalize dashes to the wide minus glyph
  if (ch === "–" || ch === "—" || ch === "−") return { ch: "−", sup };
  if (ch === "⋅" || ch === "∙" || ch === "∙") return { ch: "·", sup };
  if (ch === "∗") return { ch: "×", sup };
  return { ch, sup };
}

const TRACK = 1.09;
const SPACE_UNITS = 11;

function glyphFor(ch: string) {
  return FONT[ch] ?? FONT["?"];
}

interface LayoutOpts {
  cap: number;
  color: MarkerName;
  weight?: number; // stroke width scale
  /** maximum width before wrapping (from x) */
  maxWidth?: number;
  /** x to return to when wrapping */
  wrapX?: number;
  /** extra line height when wrapping */
  lineGap?: number;
  /** stable jitter seed */
  seed?: string;
  /** disable the hand jitter (for tiny labels) */
  jitter?: boolean;
}

/** advance width of one token in px */
function tokenAdvance(tok: Tok, scale: number): number {
  if (tok.ch === " ") return SPACE_UNITS * scale * TRACK;
  const g = glyphFor(tok.ch);
  const s = tok.sup === 0 ? 1 : 0.62;
  return g.a * scale * TRACK * s;
}

function measureWord(
  toks: Tok[],
  from: number,
  scale: number
): { w: number; to: number } {
  let w = 0;
  let i = from;
  while (i < toks.length && toks[i].ch !== " ") {
    w += tokenAdvance(toks[i], scale);
    i++;
  }
  return { w, to: i };
}

export function measureText(text: string, cap: number): number {
  const scale = cap / CAP_UNITS;
  const toks = tokenize(text).map((t) => normalize(t.ch, t.sup));
  let w = 0;
  for (const t of toks) w += tokenAdvance(t, scale);
  return w;
}

/** width + wrapped line count of a text block at a given max width —
 *  used by the compiler's collision guard so multi-line labels are checked
 *  against their FULL height, not just their first line */
export function measureWrap(
  text: string,
  cap: number,
  maxWidth: number
): { w: number; lines: number; lineStep: number } {
  const scale = cap / CAP_UNITS;
  const toks = tokenize(text).map((t) => normalize(t.ch, t.sup));
  const lineStep = cap * 1.62;
  let lines = 1;
  let cx = 0;
  let maxW = 0;
  let i = 0;
  while (i < toks.length) {
    if (toks[i].ch === " ") {
      cx += tokenAdvance(toks[i], scale);
      i++;
      continue;
    }
    const { w, to } = measureWord(toks, i, scale);
    if (cx + w > maxWidth && cx > 0 && w < maxWidth) {
      maxW = Math.max(maxW, cx);
      cx = 0;
      lines++;
    }
    for (let k = i; k < to; k++) cx += tokenAdvance(toks[k], scale);
    i = to;
  }
  return { w: Math.max(maxW, cx), lines, lineStep };
}

/** lay out text at a baseline, wrapping to maxWidth if given */
export function layoutText(
  text: string,
  x: number,
  baseline: number,
  opts: LayoutOpts
): LaidText {
  const cap = opts.cap;
  const scale = cap / CAP_UNITS;
  const toks = tokenize(text).map((t) => normalize(t.ch, t.sup));
  const strokes: RawStroke[] = [];
  const seedBase = opts.seed ?? text;
  let seedCounter = 0;

  let cx = x;
  let by = baseline;
  const firstBaseline = baseline;
  const wrapX = opts.wrapX ?? x;
  const maxW = opts.maxWidth ?? Infinity;
  const lineStep = cap * 1.62 + (opts.lineGap ?? 0);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let lineCount = 1;

  const emit = (tok: Tok) => {
    const adv = tokenAdvance(tok, scale);
    if (tok.ch === " ") {
      cx += adv;
      return;
    }
    const g = glyphFor(tok.ch);
    const s = tok.sup === 0 ? scale : scale * 0.62;
    const raise =
      tok.sup === 1
        ? cap * 0.42
        : tok.sup === -1
          ? -cap * 0.18
          : 0;
    const baseY = by - raise;
    const rng = rngFor(seedBase, seedCounter++);
    const doJit = opts.jitter !== false && cap > 20;
    // book-neat writing: keep the human touch but never hurt legibility
    const jRotAmp = doJit ? 0.008 : 0;
    const jPosAmp = doJit ? Math.min(0.8, cap * 0.012) : 0;
    // glyph-local rotation around its center
    const gx = g.s.length ? g.s : [];
    let gMinX = Infinity;
    let gMaxX = -Infinity;
    let gMinY = Infinity;
    let gMaxY = -Infinity;
    for (const stroke of gx) {
      for (const p of stroke) {
        if (p[0] < gMinX) gMinX = p[0];
        if (p[0] > gMaxX) gMaxX = p[0];
        if (p[1] < gMinY) gMinY = p[1];
        if (p[1] > gMaxY) gMaxY = p[1];
      }
    }
    if (!Number.isFinite(gMinX)) return;
    const gcx = (gMinX + gMaxX) / 2;
    const gcy = (gMinY + gMaxY) / 2;
    const rot = (rng() * 2 - 1) * jRotAmp;
    const jx = (rng() * 2 - 1) * jPosAmp;
    const jy = (rng() * 2 - 1) * jPosAmp;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    for (const stroke of gx) {
      const pts: Pt[] = stroke.map((p) => {
        // rotate around glyph center (font coords are y-down, like SVG)
        const lx = p[0] - gcx;
        const ly = p[1] - gcy;
        const rx = lx * cos - ly * sin + gcx;
        const ry = lx * sin + ly * cos + gcy;
        return {
          x: cx + jx + rx * s,
          y: baseY + jy + (ry - BASELINE) * s,
        };
      });
      const finalPts =
        stroke.length === 2 && doJit
          ? jitterPolyline(pts, cap * 0.006, rng)
          : pts;
      strokes.push({
        pts: finalPts,
        color: opts.color,
        width: Math.max(2.2, cap * 0.095) * (opts.weight ?? 1),
      });
      for (const p of finalPts) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
    }
    // advance the cursor past THIS glyph (the old code stacked every glyph
    // of a word at the word-start x — letters drew on top of each other)
    cx += adv;
  };

  let i = 0;
  while (i < toks.length) {
    if (toks[i].ch === " ") {
      emit(toks[i]); // emit() advances cx for spaces too
      i++;
      continue;
    }
    const { w, to } = measureWord(toks, i, scale);
    if (cx + w > x + maxW && cx > wrapX && w < maxW) {
      cx = wrapX;
      by += lineStep;
      lineCount++;
    }
    // emit() advances cx glyph-by-glyph as it draws
    for (let k = i; k < to; k++) emit(toks[k]);
    i = to;
  }

  return {
    strokes,
    width: maxX > minX ? maxX - minX : 0,
    bbox: {
      x: minX === Infinity ? x : minX,
      y: minY === Infinity ? by : minY,
      w: maxX === -Infinity ? 0 : maxX - minX,
      h: maxY === -Infinity ? 0 : maxY - minY,
    },
    firstBaseline,
    lastBaseline: by,
    lineCount,
  };
}

/** cap height for a size token */
export function capFor(size: BeatSize | "title"): number {
  return CAP[size];
}
