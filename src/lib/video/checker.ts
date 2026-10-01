/* ------------------------------------------------------------------
   Phase C — the CHECKER: deterministic numeric spot-checks of equation
   lines (pure Node, milliseconds). Never mutates the script; flags
   only. Deliberately narrow: CONSTANT arithmetic identities — "Check:
   2(4) + 5 = 13"-class lines where both sides are pure numbers.
   Conditional equations ("2x = 8", true only at the solution) and
   unit-bearing lines are counted skipped: sampling them would
   false-flag every correct solve line. Zero false positives first.
------------------------------------------------------------------- */

import { tryCompileExpr } from "../expr";
import type { SolveScript } from "./types";

export interface CheckerFlag {
  scene: number;
  text: string;
  detail: string;
}
export interface CheckerTally {
  checked: number;
  skipped: number;
  flags: CheckerFlag[];
}

/** constant value of one side, or null when it isn't a pure constant
    (free variable x, unknown identifier/unit, parse failure) */
function evalConstant(src: string): number | null {
  if (/(^|[^a-zA-Z])x([^a-zA-Z]|$)/.test(src)) return null; // conditional
  const { fn } = tryCompileExpr(src);
  if (!fn) return null;
  const v = fn(0);
  return Number.isFinite(v) ? v : null;
}

function checkLine(
  text: string
): { status: "checked"; ok: boolean; detail?: string } | { status: "skipped" } {
  const parts = text.split("=");
  if (parts.length < 2) return { status: "skipped" };
  const vals: number[] = [];
  for (const p of parts) {
    const v = evalConstant(p.trim());
    if (v === null) return { status: "skipped" };
    vals.push(v);
  }
  for (let i = 0; i + 1 < vals.length; i++) {
    const a = vals[i];
    const b = vals[i + 1];
    const tol = Math.max(0.01, 0.005 * Math.max(Math.abs(a), Math.abs(b)));
    if (Math.abs(a - b) > tol) {
      return {
        status: "checked",
        ok: false,
        detail: `${parts[i].trim()} evaluates to ${a} but ${parts[i + 1].trim()} evaluates to ${b}`,
      };
    }
  }
  return { status: "checked", ok: true };
}

export function checkSceneLines(sceneIdx: number, beats: unknown[]): CheckerTally {
  const out: CheckerTally = { checked: 0, skipped: 0, flags: [] };
  for (const b of beats.slice(0, 22)) {
    const beat = b as { type?: unknown; text?: unknown };
    if (beat?.type !== "write" || typeof beat.text !== "string") continue;
    // strip a short leading label ("Check:", "Sub:", "LHS:")
    const text = beat.text.replace(/^[A-Za-z][A-Za-z\s]{1,12}:\s*/, "").trim();
    if (!text.includes("=")) continue; // not an equation line — not our business
    const r = checkLine(text);
    if (r.status === "skipped") {
      out.skipped++;
      continue;
    }
    out.checked++;
    if (!r.ok) out.flags.push({ scene: sceneIdx, text, detail: r.detail! });
  }
  return out;
}

export function checkScriptLines(script: SolveScript): CheckerTally {
  const out: CheckerTally = { checked: 0, skipped: 0, flags: [] };
  script.scenes.forEach((s, i) => {
    const r = checkSceneLines(i, s.beats as unknown[]);
    out.checked += r.checked;
    out.skipped += r.skipped;
    out.flags.push(...r.flags);
  });
  return out;
}
