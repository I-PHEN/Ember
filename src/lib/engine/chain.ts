import nerdamer from "nerdamer";
import "nerdamer/Algebra.js";
import { compareAnswers } from "../video/solver";
import { cleanNarration } from "../solve-schema";

export interface SolutionStep {
  eq: string;
  rule: string;
  why?: string;
}

export interface SolutionChain {
  steps: SolutionStep[];
  answer: string;
  units?: string;
}

export function normalizeSolutionChain(raw: unknown): SolutionChain | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const answer = cleanNarration(o.answer).slice(0, 120);
  if (!answer) return null;

  const units = typeof o.units === "string" ? cleanNarration(o.units).slice(0, 30) : undefined;

  const rawSteps = Array.isArray(o.steps)
    ? o.steps
    : Array.isArray(o.keySteps)
    ? o.keySteps.map((s) => ({ eq: String(s), rule: "step" }))
    : [];

  const steps: SolutionStep[] = [];
  for (const s of rawSteps.slice(0, 10)) {
    if (!s || typeof s !== "object") continue;
    const stepObj = s as Record<string, unknown>;
    const eq = cleanNarration(stepObj.eq ?? stepObj.equation ?? stepObj.step ?? "").slice(0, 120);
    const rule = cleanNarration(stepObj.rule ?? stepObj.operation ?? "move").slice(0, 80);
    const why = stepObj.why ? cleanNarration(stepObj.why).slice(0, 160) : undefined;
    if (eq) steps.push({ eq, rule, why });
  }

  return { steps, answer, units };
}

/**
 * Validates step-by-step transformations and confirms terminal answer alignment.
 */
export function verifyChain(chain: SolutionChain): { valid: boolean; flags: string[] } {
  const flags: string[] = [];

  if (!chain.steps.length) {
    flags.push("Empty steps in solution chain");
    return { valid: false, flags };
  }

  // Verify terminal step consistency with final answer
  const lastStep = chain.steps[chain.steps.length - 1];
  const terminalMatch = compareAnswers(lastStep.eq, chain.answer);
  if (terminalMatch === "mismatch") {
    flags.push(`Last step (${lastStep.eq}) contradicts final answer (${chain.answer})`);
  }

  // Check consecutive equation transitions where symbolic comparison applies
  for (let i = 1; i < chain.steps.length; i++) {
    const prev = chain.steps[i - 1].eq;
    const curr = chain.steps[i].eq;

    // Both are equations of the form LHS = RHS
    if (prev.includes("=") && curr.includes("=")) {
      const [pLhs, pRhs] = prev.split("=").map((s) => s.trim());
      const [cLhs, cRhs] = curr.split("=").map((s) => s.trim());

      try {
        const prevDiff = nerdamer(`(${pLhs})-(${pRhs})`).simplify().toString();
        const currDiff = nerdamer(`(${cLhs})-(${cRhs})`).simplify().toString();

        // If one is constant zero and the other simplifies to a non-zero numeric constant
        if (prevDiff === "0" && /^-?[\d.]*[1-9][\d.]*$/.test(currDiff)) {
          flags.push(`Step ${i + 1} (${curr}) introduces contradiction from step ${i} (${prev})`);
        }
      } catch {
        // Complex expressions that nerdamer cannot parse are safely skipped
      }
    }
  }

  return {
    valid: flags.length === 0,
    flags,
  };
}
