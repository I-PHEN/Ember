/* ------------------------------------------------------------------
   Phase C — the SOLVER's deterministic half: output normalization,
   script-answer extraction, and Nerdamer equivalence with a numeric
   fallback. The blind LLM call itself lives in video-jobs.
   Comparison is CONSERVATIVE (spec §10): only a clear numeric or
   symbolic-constant disagreement is a mismatch; everything murky is
   "incomparable" and never triggers a rerun.
------------------------------------------------------------------- */

import nerdamer from "nerdamer";
import "nerdamer/Algebra.js"; // side-loads .simplify() onto nerdamer (not in core)
import { cleanMathText, cleanNarration } from "../solve-schema";
import type { Beat, SolveScript } from "./types";

export interface SolverAnswer {
  answer: string;
  keySteps: string[];
}

export function normalizeSolver(raw: unknown): SolverAnswer | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const answer = cleanNarration(o.answer).slice(0, 120);
  if (!answer) return null;
  const keySteps = Array.isArray(o.keySteps)
    ? o.keySteps
        .slice(0, 6)
        .map((s) => cleanNarration(s as unknown).slice(0, 100))
        .filter(Boolean)
    : [];
  return { answer, keySteps };
}

/* ---------- script side: find the lesson's final answer ---------- */

export interface ScriptAnswer {
  answer: string;
  scene: number;
}

function pickAnswerBeat(beats: Beat[]): string | null {
  for (let j = beats.length - 1; j >= 0; j--) {
    const b = beats[j] as Beat & { target?: string };
    if (
      (b.type === "box" || b.type === "circle") &&
      typeof b.target === "string" &&
      b.target.startsWith("text:")
    ) {
      return b.target.slice(5).trim();
    }
  }
  const writes = beats.filter((b) => b.type === "write") as Array<
    Beat & { text: string; keep?: boolean; color?: string }
  >;
  const kept = [...writes]
    .reverse()
    .find((w) => w.keep === true || w.color === "green");
  return (kept ?? writes[writes.length - 1])?.text ?? null;
}

export function extractScriptAnswer(script: SolveScript): ScriptAnswer | null {
  for (let i = script.scenes.length - 1; i >= 0; i--) {
    const s = script.scenes[i];
    if (!/answer|result/i.test(s.chapter)) continue;
    const pick = pickAnswerBeat(s.beats);
    if (pick) return { answer: pick, scene: i };
  }
  for (let i = script.scenes.length - 1; i >= 0; i--) {
    const beats = script.scenes[i].beats;
    for (let j = beats.length - 1; j >= 0; j--) {
      const b = beats[j] as Beat & { keep?: boolean; text?: string };
      if (b.type === "write" && b.keep === true && typeof b.text === "string") {
        return { answer: b.text, scene: i };
      }
    }
  }
  return null;
}

/* ---------- comparison: symbolic first, numeric fallback --------- */

export type VerifyVerdict = "match" | "mismatch" | "incomparable";

const UNITS = [
  "m/s²", "m/s", "kg", "km", "cm", "mm", "nm", "mol", "rad",
  "m", "s", "h", "N", "J", "W", "Pa", "Hz", "K", "°C", "Ω", "V", "A", "L", "g", "%",
];

function escapeRx(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\/°]/g, "\\$&");
}

function stripUnits(s: string): string {
  let out = s.trim();
  for (;;) {
    let hit = false;
    for (const u of UNITS) {
      const m = out.match(new RegExp(`\\s*${escapeRx(u)}$`));
      if (m && m.index !== undefined && out.slice(0, m.index).trim().length) {
        out = out.slice(0, m.index).trim();
        hit = true;
        break;
      }
    }
    if (!hit) return out;
  }
}

function answerCore(a: string): string {
  let s = a.trim();
  const eq = s.lastIndexOf("=");
  if (eq >= 0) s = s.slice(eq + 1);
  return stripUnits(s);
}

function toNerdamerExpr(sRaw: string): string | null {
  const s = cleanMathText(sRaw)
    // board notation ^{...} groups → nerdamer parens (braces overflow it)
    .replace(/\^\{([^{}]+)\}/g, "^($1)")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/√\s*\(/g, "sqrt(")
    .replace(/√/g, "sqrt")
    .replace(/π/g, "pi")
    .replace(/[·×]/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–]/g, "-")
    .replace(/\s+/g, "");
  return s || null;
}

function numeric(e: string): number | null {
  try {
    const t = nerdamer(e).evaluate().text();
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function compareOne(aRaw: string, bRaw: string): VerifyVerdict | null {
  const a = toNerdamerExpr(answerCore(aRaw));
  const b = toNerdamerExpr(answerCore(bRaw));
  if (!a || !b) return null;
  try {
    const diff = nerdamer(`(${a})-(${b})`).simplify().toString();
    if (diff === "0") return "match";
    const na = numeric(a);
    const nb = numeric(b);
    if (na !== null && nb !== null) {
      return Math.abs(na - nb) <=
        Math.max(0.01, 0.005 * Math.max(Math.abs(na), Math.abs(nb)))
        ? "match"
        : "mismatch";
    }
    return /^-?[\d.]+$/.test(diff) ? "mismatch" : null; // constant ≠ 0
  } catch {
    return null;
  }
}

function splitParts(s: string): string[] {
  return s
    .split(/,| and /)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function compareAnswers(a: string, b: string): VerifyVerdict {
  const pa = splitParts(a);
  const pb = splitParts(b);
  if (!pa.length || !pb.length || pa.length !== pb.length) return "incomparable";
  let sawMismatch = false;
  for (let i = 0; i < pa.length; i++) {
    const v = compareOne(pa[i], pb[i]);
    if (v === null) return "incomparable"; // any murky part → no verdict
    if (v === "mismatch") sawMismatch = true;
  }
  return sawMismatch ? "mismatch" : "match";
}
