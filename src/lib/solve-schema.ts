/* ------------------------------------------------------------------
   SolveScript sanitizer — defends the engine against malformed model
   output: beat whitelist, clamps, color/charset validation. Includes
   the JSON extraction / repair layers proven in the previous build.
------------------------------------------------------------------- */

import type {
  Beat,
  BoardThemeId,
  ForceArrow,
  MarkerName,
  SolveScript,
  SolveScene,
} from "./video/types";
import { FONT } from "./video/font-data";

export const MARKER_NAMES: MarkerName[] = [
  "white",
  "blue",
  "green",
  "orange",
  "pink",
  "yellow",
  "purple",
  "red",
];

/* ------------------------- LaTeX rescue ---------------------------- */

const LATEX_SYMBOLS: Record<string, string> = {
  "\\times": "×",
  "\\cdot": "·",
  "\\div": "÷",
  "\\pm": "±",
  "\\le": "≤",
  "\\leq": "≤",
  "\\ge": "≥",
  "\\geq": "≥",
  "\\ne": "≠",
  "\\neq": "≠",
  "\\approx": "≈",
  "\\infty": "∞",
  "\\pi": "π",
  "\\theta": "θ",
  "\\alpha": "α",
  "\\beta": "β",
  "\\gamma": "γ",
  "\\Delta": "Δ",
  "\\delta": "δ",
  "\\mu": "μ",
  "\\lambda": "λ",
  "\\omega": "ω",
  "\\sigma": "σ",
  "\\phi": "φ",
  "\\to": "→",
  "\\rightarrow": "→",
  "\\sin": "sin",
  "\\cos": "cos",
  "\\tan": "tan",
  "\\ln": "ln",
  "\\log": "log",
  "\\exp": "exp",
};

const SUPERSCRIPT: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶",
  "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻", n: "ⁿ", i: "ⁱ",
};
const SUBSCRIPT: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆",
  "7": "₇", "8": "₈", "9": "₉", n: "ₙ", x: "ₓ",
};

function convertSupSub(s: string, isSuper: boolean): string | null {
  const map = isSuper ? SUPERSCRIPT : SUBSCRIPT;
  let out = "";
  for (const ch of s) {
    const m = map[ch];
    if (!m) return null;
    out += m;
  }
  return out;
}

export function cleanMathText(raw: string): string {
  let s = raw;
  // strip markdown emphasis FIRST (before sup/sub handling, so _{...} groups survive)
  s = s.replace(/[*`~]{1,2}/g, "");
  for (let i = 0; i < 4; i++) {
    const before = s;
    s = s.replace(
      /\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g,
      (_m, a: string, b: string) => `(${a})/(${b})`
    );
    if (s === before) break;
  }
  s = s.replace(/\\sqrt\s*\[([0-9]+)\]\s*\{([^{}]*)\}/g, "√($2)");
  s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, "√($1)");
  s = s.replace(/\\(?:text|mathrm|mathbf|mathit)\s*\{([^{}]*)\}/g, "$1");
  // ^{..}/_{..} groups stay intact — the layout tokenizer renders them as true
  // raised/lowered sequences, including multi-char ones like x^{-2x} or a_{n+1}
  s = s.replace(/\^\{([^{}]+)\}/g, "^{$1}");
  s = s.replace(/_\{([^{}]+)\}/g, "_{$1}");
  s = s.replace(/\^([0-9n+-])/g, (_m, ch: string) => convertSupSub(ch, true) ?? `^{${ch}}`);
  s = s.replace(/_([0-9nx])/g, (_m, ch: string) => convertSupSub(ch, false) ?? `_{${ch}}`);
  // unicode fraction shortcuts
  s = s.replace(/½/g, "(1/2)").replace(/¼/g, "(1/4)").replace(/¾/g, "(3/4)");
  for (const [k, v] of Object.entries(LATEX_SYMBOLS)) {
    s = s.split(k).join(v);
  }
  s = s.replace(/\\(?:left|right|quad|qquad|,|;|!| )/g, " ");
  s = s.replace(/\\/g, "");
  s = s.replace(/\$\$?/g, "");
  return s.replace(/\s{2,}/g, " ").trim();
}

/** board charset — derived from the ACTUAL glyph table so text and font can
 *  never drift apart, plus unicode super/subscripts (the tokenizer lowers
 *  them onto the digit glyphs at 62% scale). This is what keeps m/s² from
 *  being silently stripped into m/s. */
const EXTRA_BOARD_CHARS =
  "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁿⁱˣ₀₁₂₃₄₅₆₇₈₉ₙₓₐₑₕₖₗₘₒₚₛₜᵣᵤᵥ½¼¾";
const BOARD_CHARS = new Set<string>([
  ...Object.keys(FONT),
  ...EXTRA_BOARD_CHARS,
]);

function isBoardChar(ch: string): boolean {
  return ch === " " || BOARD_CHARS.has(ch);
}

function cleanBoardText(raw: string, maxLen: number): string {
  let s = cleanMathText(raw);
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > maxLen) {
    s = s.slice(0, maxLen);
    const cut = s.lastIndexOf(" ");
    if (cut > maxLen * 0.6) s = s.slice(0, cut);
  }
  let out = "";
  for (const ch of s) {
    if (isBoardChar(ch)) out += ch;
  }
  return out.trim();
}

export function cleanNarration(raw: unknown): string {
  if (typeof raw !== "string") return "";
  let s = raw.replace(/[*#`>_~]/g, "");
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > 600) {
    s = s.slice(0, 600);
    const cut = s.lastIndexOf(" ");
    if (cut > 300) s = s.slice(0, cut);
  }
  return s;
}

/** fuzzy comparison key — case/punctuation/space-insensitive */
export function normSpeechKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** A beat's "say" tag = the exact words spoken while it is written —
 *  what makes the pen stay in sync with the voice. Keep it only when
 *  it genuinely appears inside this scene's narration, else the timing
 *  anchor would be a lie (dropped tags simply join the current beat
 *  group, which is harmless). */
function cleanSay(raw: unknown, narrationKey: string): string | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const s = cleanNarration(raw);
  if (!s) return undefined;
  const key = normSpeechKey(s);
  if (!key || key.length < 3) return undefined;
  if (!narrationKey.includes(key)) return undefined;
  return s.length > 300 ? s.slice(0, 300) : s;
}

/* ----------------------- board discipline ------------------------- */

/* A professor SPEAKS explanations and WRITES only the skeleton
   (Mattuck's board craft + Mayer's redundancy principle: narration
   duplicated as on-board prose hurts learning). The prompts own this
   rule; this filter is the safety net for writers that ignore it —
   it drops clearly-explanatory write beats so prose never reaches the
   board. Deliberately conservative: short lines, equations, values
   and audience-facing questions always survive. */

const AUDIENCE_QUESTION =
  /^(your turn|what (would|do|should) you|quick check|your guess|try it|pause)/i;

const PROSE_CONNECTIVE =
  /\b(because|since|so that|which means|that means|notice|remember|make sure|we can|we should|we need|we want|we get|we're going|we are going|let's|in order|the reason|this is why|that's why|it turns out|as you can see|keep in mind|now we|then we|first we|next we|so we|if we|when we|here's|here is|this gives|works for|applies to|is valid|holds when|is true|depends on)\b/i;

/** does this write beat look like spoken explanation, not board work?
    Order matters: audience questions and short labels always survive;
    prose connectives are tested BEFORE the equation-like escape so a
    sentence can't smuggle itself in with one equals sign; medium-length
    article-heavy lines with no math are prose; the Reviewer (Phase B)
    is the real judge — this stays the conservative safety net. */
export function isBoardProse(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (AUDIENCE_QUESTION.test(t)) return false; // pause-and-predict moments
  const words = t.split(/\s+/).filter(Boolean).length;
  if (words < 5) return false; // short labels are always fine
  // sentence connectives are prose even if the line contains math
  if (PROSE_CONNECTIVE.test(t)) return true;
  // equation-like lines are board work by definition
  const eqLike =
    /[=≤≥≠≈]/.test(t) ||
    (t.match(/[0-9+−×÷±√∫∑∆^_]/g)?.length ?? 0) / Math.max(1, t.length) > 0.15;
  if (eqLike) return false;
  // medium lines written as English (articles/linking verbs), no math → prose
  if (words >= 6 && /\b(the|a|an|is|are|was|this|that|it|stays|gets)\b/i.test(t)) {
    return true;
  }
  return words >= 10; // long wordy line with no math → it's a paragraph
}

function cleanText(raw: unknown, maxLen: number): string {
  if (typeof raw !== "string") return "";
  let s = raw.replace(/[*#`>_~]/g, "");
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

/** Targets ("text:…", "last", erase-keep needles) must match the group text
 *  they reference — so they go through the SAME normalization the written
 *  text went through (½→(1/2), ^2→², charset). Otherwise targets silently
 *  stop matching after sanitization. */
function cleanTargetText(raw: unknown, maxLen: number): string {
  if (typeof raw !== "string") return "";
  let s = raw.trim();
  let prefix = "";
  const m = s.match(/^text:\s*(.*)$/i);
  if (m) {
    prefix = "text:";
    s = m[1];
  }
  s = cleanBoardText(s, maxLen);
  return prefix + s;
}

function normColor(v: unknown, fallback: MarkerName): MarkerName {
  return typeof v === "string" && (MARKER_NAMES as string[]).includes(v)
    ? (v as MarkerName)
    : fallback;
}

function num(v: unknown, dflt: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : dflt;
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

/* --------------------------- beat sanitizer ----------------------- */

function sanitizeBeat(raw: unknown, narrationKey: string): Beat | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  const type = String(b.type || "").toLowerCase();

  switch (type) {
    case "title": {
      const text = cleanBoardText(String(b.text ?? ""), 48);
      if (!text) return null;
      const beat: Beat = { type: "title", text, color: normColor(b.color, "yellow") };
      const say = cleanSay(b.say, narrationKey);
      if (say) beat.say = say;
      return beat;
    }
    case "write": {
      const text = cleanBoardText(String(b.text ?? ""), 110);
      if (!text) return null;
      const size =
        b.size === "lg" || b.size === "sm" || b.size === "md" ? b.size : "md";
      const beat: Beat = {
        type: "write",
        text,
        color: normColor(b.color, "white"),
        size,
      };
      // clamp positioning into the comfortable writing band — extreme bottom
      // corners collide with the flow cursor's descent path
      if (b.x !== undefined) beat.x = clamp(num(b.x, 0.5), 0.04, 0.92);
      if (b.y !== undefined) beat.y = clamp(num(b.y, 0.4), 0.05, 0.78);
      if (b.align === "center" || b.align === "right") beat.align = b.align;
      if (b.keep === true) beat.keep = true;
      const below = cleanBoardText(String(b.below ?? ""), 60);
      if (below) beat.below = below;
      const say = cleanSay(b.say, narrationKey);
      if (say) beat.say = say;
      return beat;
    }
    case "fraction": {
      const prefix = cleanBoardText(String(b.prefix ?? ""), 22);
      const numT = cleanBoardText(String(b.num ?? ""), 30);
      const den = cleanBoardText(String(b.den ?? ""), 30);
      const suffix = cleanBoardText(String(b.suffix ?? ""), 22);
      if (!numT && !den) return null;
      const size =
        b.size === "lg" || b.size === "sm" || b.size === "md" ? b.size : "md";
      const beat: Beat = {
        type: "fraction",
        num: numT || "1",
        den: den || "1",
        color: normColor(b.color, "green"),
        size,
      };
      if (prefix) beat.prefix = prefix;
      if (suffix) beat.suffix = suffix;
      if (b.keep === true) beat.keep = true;
      const say = cleanSay(b.say, narrationKey);
      if (say) beat.say = say;
      return beat;
    }
    case "box":
    case "circle":
    case "underline":
    case "highlight": {
      const beat: Beat = { type, color: normColor(b.color, "yellow") } as Beat;
      const t = cleanTargetText(b.target, 60);
      if (t) (beat as { target: string }).target = t;
      return beat;
    }
    case "crossout": {
      const beat: Beat = { type: "crossout" };
      const t = cleanTargetText(b.target, 60);
      if (t) (beat as { target: string }).target = t;
      return beat;
    }
    case "arrow": {
      const beat: Beat = { type: "arrow", color: normColor(b.color, "orange") } as Beat;
      const f = cleanTargetText(b.from, 60);
      const t = cleanTargetText(b.to, 60);
      if (f) (beat as { from: string }).from = f;
      if (t) (beat as { to: string }).to = t;
      const label = cleanBoardText(String(b.label ?? ""), 26);
      if (label) (beat as { label: string }).label = label;
      return beat;
    }
    case "freebody": {
      const FB_DIRS = new Set([
        "down", "up", "left", "right", "normal", "upslope", "downslope",
      ]);
      const beat: Beat = {
        type: "freebody",
        angle: clamp(num(b.angle, 0), 0, 70),
        color: normColor(b.color, "yellow"),
      } as Beat;
      const block = cleanBoardText(String(b.block ?? ""), 10);
      if (block) (beat as { block: string }).block = block;
      if (Array.isArray(b.forces)) {
        const forces = b.forces
          .slice(0, 5)
          .map((f) => {
            const fp = (f ?? {}) as Record<string, unknown>;
            const dir = FB_DIRS.has(String(fp.dir)) ? (String(fp.dir) as never) : "down";
            const label = cleanBoardText(String(fp.label ?? ""), 10);
            return { dir, label: label || undefined } as ForceArrow;
          })
          .filter((f) => f.label || f.dir);
        if (forces.length) (beat as { forces: ForceArrow[] }).forces = forces;
      }
      const say = cleanSay(b.say, narrationKey);
      if (say) (beat as { say?: string }).say = say;
      return beat;
    }
    case "graph": {
      const expr = cleanMathText(cleanText(b.expr, 80));
      if (!expr) return null;
      const beat: Beat = {
        type: "graph",
        expr,
        color: normColor(b.color, "yellow"),
      };
      let xMin = clamp(num(b.xMin, -5), -60, 60);
      let xMax = clamp(num(b.xMax, 5), -60, 60);
      if (xMax - xMin < 0.5) {
        xMin = -5;
        xMax = 5;
      }
      beat.xMin = xMin;
      beat.xMax = xMax;
      const label = cleanBoardText(String(b.label ?? ""), 40);
      if (label) beat.label = label;
      if (Array.isArray(b.points)) {
        beat.points = b.points.slice(0, 4).map((p) => {
          const pt = p as Record<string, unknown>;
          return {
            x: clamp(num(pt.x, 0), -60, 60),
            y: clamp(num(pt.y, 0), -60, 60),
            label: cleanBoardText(String(pt.label ?? ""), 12),
          };
        });
      }
      const say = cleanSay(b.say, narrationKey);
      if (say) beat.say = say;
      return beat;
    }
    case "numberline": {
      const min = clamp(num(b.min, 0), -500, 500);
      const max = clamp(num(b.max, 10), -500, 500);
      if (max - min < 1) return null;
      const beat: Beat = {
        type: "numberline",
        min,
        max,
        color: normColor(b.color, "blue"),
      };
      if (Array.isArray(b.hops)) {
        beat.hops = b.hops.slice(0, 4).map((h) => {
          const hp = h as Record<string, unknown>;
          return {
            from: clamp(num(hp.from, 0), min, max),
            to: clamp(num(hp.to, 0), min, max),
            label: cleanBoardText(String(hp.label ?? ""), 12),
          };
        });
      }
      if (Array.isArray(b.points)) {
        beat.points = b.points.slice(0, 6).map((p) => {
          const pt = p as Record<string, unknown>;
          return {
            at: clamp(num(pt.at, 0), min, max),
            label: cleanBoardText(String(pt.label ?? ""), 12),
          };
        });
      }
      const say = cleanSay(b.say, narrationKey);
      if (say) beat.say = say;
      return beat;
    }
    case "table": {
      const headers = Array.isArray(b.headers)
        ? b.headers.slice(0, 3).map((h) => cleanBoardText(String(h ?? ""), 14))
        : undefined;
      const rows = Array.isArray(b.rows)
        ? b.rows.slice(0, 4).map(
            (r) =>
              Array.isArray(r)
                ? r.slice(0, 3).map((c) => cleanBoardText(String(c ?? ""), 14))
                : []
          )
        : [];
      if (!rows.length && !headers?.length) return null;
      const beat: Beat = {
        type: "table",
        rows,
        color: normColor(b.color, "green"),
      };
      if (headers?.length) beat.headers = headers;
      const title = cleanBoardText(String(b.title ?? ""), 30);
      if (title) beat.title = title;
      const say = cleanSay(b.say, narrationKey);
      if (say) beat.say = say;
      return beat;
    }
    case "erase": {
      const beat: Beat = { type: "erase" };
      if (Array.isArray(b.keep)) {
        beat.keep = b.keep.slice(0, 4).map((k) => cleanTargetText(k, 24)).filter(Boolean);
      }
      return beat;
    }
    case "wait":
      return { type: "wait", ms: clamp(num(b.ms, 500), 100, 3000) };
    case "point": {
      const beat: Beat = {
        type: "point",
        ms: clamp(num(b.ms, 1000), 300, 2500),
      };
      const t = cleanTargetText(b.target, 40);
      if (t) beat.target = t;
      return beat;
    }
    case "newline":
      return { type: "newline", n: clamp(Math.round(num(b.n, 1)), 1, 4) };
    default:
      if (typeof b.text === "string" && b.text.trim()) {
        const text = cleanBoardText(b.text, 110);
        if (text) return { type: "write", text, color: normColor(b.color, "white") };
      }
      return null;
  }
}

/* -------------------------- script sanitizer ---------------------- */

export function sanitizeScript(
  raw: unknown,
  stats?: { proseDropped: number }
): SolveScript | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  let scenesRaw: unknown = o.scenes;
  if (!Array.isArray(scenesRaw)) {
    const inner =
      (o.script as Record<string, unknown> | undefined) ??
      (o.video as Record<string, unknown> | undefined) ??
      (o.lesson as Record<string, unknown> | undefined);
    if (inner && Array.isArray(inner.scenes)) scenesRaw = inner.scenes;
  }
  if (!Array.isArray(scenesRaw)) return null;

  const title = cleanText(o.title, 70) || "Solve with me";
  const subject = cleanText(o.subject, 36) || undefined;
  const question = cleanText(o.question, 600) || title;

  const scenes: SolveScene[] = [];
  for (const sRaw of scenesRaw.slice(0, 14)) {
    if (!sRaw || typeof sRaw !== "object") continue;
    const s = sRaw as Record<string, unknown>;
    const chapter = cleanText(s.chapter ?? s.title, 42) || `Step ${scenes.length + 1}`;
    const narration = cleanNarration(s.narration);
    const narrationKey = normSpeechKey(narration);
    let beatsRaw: unknown = s.beats;
    if (!Array.isArray(beatsRaw) && Array.isArray(s.blocks)) beatsRaw = s.blocks;
    const beats: Beat[] = [];
    const prose: string[] = [];
    if (Array.isArray(beatsRaw)) {
      for (const bRaw of beatsRaw.slice(0, 22)) {
        const beat = sanitizeBeat(bRaw, narrationKey);
        if (!beat) continue;
        if (beat.type === "write" && isBoardProse(beat.text)) {
          prose.push(beat.text); // explanations are SPOKEN, never written
          if (stats) stats.proseDropped += 1;
          continue;
        }
        beats.push(beat);
      }
    }
    if (prose.length) {
      console.log(
        `[board-discipline] scene "${chapter}" — dropped ${prose.length} prose beat(s) (the planner's narration already carries these words): ${prose
          .map((p) => JSON.stringify(p))
          .join(", ")}`
      );
    }
    if (!beats.length) continue;
    scenes.push({ chapter, narration, beats, intro: s.intro === true });
  }
  if (!scenes.length) return null;
  return { title, subject, question, scenes };
}

/* --------------------------- JSON rescue --------------------------- */

function escapeRawControls(s: string): string {
  let out = "";
  let inStr = false;
  let esc = false;
  for (const ch of s) {
    if (inStr) {
      if (esc) {
        esc = false;
        out += ch;
        continue;
      }
      if (ch === "\\") {
        esc = true;
        out += ch;
        continue;
      }
      if (ch === '"') {
        inStr = false;
        out += ch;
        continue;
      }
      if (ch === "\n") {
        out += "\\n";
        continue;
      }
      if (ch === "\r") {
        out += "\\r";
        continue;
      }
      if (ch === "\t") {
        out += "\\t";
        continue;
      }
      if (ch < " ") {
        out += " ";
        continue;
      }
      out += ch;
      continue;
    }
    if (ch === '"') inStr = true;
    out += ch;
  }
  return out;
}

function closeTruncatedJson(sRaw: string): unknown {
  let s = sRaw.replace(/,\s*$/, "");
  const stack: string[] = [];
  let inStr = false;
  let esc = false;
  for (const ch of s) {
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }
  if (inStr) s += '"';
  s = s.replace(/,\s*$/, "");
  while (stack.length) {
    const open = stack.pop();
    s += open === "{" ? "}" : "]";
  }
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export function extractJson(text: string): unknown {
  let s = text.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  s = escapeRawControls(s);
  try {
    return JSON.parse(s);
  } catch {
    /* keep digging */
  }
  const a = s.indexOf("{");
  if (a >= 0) {
    const body = s.slice(a);
    const b = body.lastIndexOf("}");
    if (b > 0) {
      const obj = body.slice(0, b + 1);
      try {
        return JSON.parse(obj);
      } catch {
        try {
          return JSON.parse(obj.replace(/,(\s*[}\]])/g, "$1"));
        } catch {
          /* fall through */
        }
      }
    }
    const salvaged = closeTruncatedJson(body);
    if (salvaged) return salvaged;
  }
  return null;
}

/* --------------------------- misc helpers -------------------------- */

const THEME_KEY = "ember.theme";
const LEGACY_THEME_KEY = "livetutor.theme";

export function defaultTheme(): BoardThemeId {
  if (typeof window === "undefined") return "blackboard";
  let v = window.localStorage.getItem(THEME_KEY);
  if (!v) {
    /* rebrand migration: carry the chosen board across the rename */
    v = window.localStorage.getItem(LEGACY_THEME_KEY);
    if (v) {
      try {
        window.localStorage.setItem(THEME_KEY, v);
        window.localStorage.removeItem(LEGACY_THEME_KEY);
      } catch {
        /* ignore */
      }
    }
  }
  return v === "whiteboard" || v === "paper" || v === "blackboard"
    ? v
    : "blackboard";
}

export function saveTheme(t: BoardThemeId): void {
  try {
    window.localStorage.setItem(THEME_KEY, t);
    window.localStorage.removeItem(LEGACY_THEME_KEY);
  } catch {
    /* ignore */
  }
}
