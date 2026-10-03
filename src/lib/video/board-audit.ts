import type { BoardScore } from "../lesson/contracts";

export interface BoardOwnershipViolation {
  kind: "missing-context" | "state-transition" | "persistence" | "color-role";
  stateId?: string;
  landmarkId?: string;
  detail: string;
}

/** Semantic audit of a normalized BoardScore; no layout or rendering required. */
export function auditBoardScore(score: BoardScore): BoardOwnershipViolation[] {
  const issues: BoardOwnershipViolation[] = [];
  const landmarks = new Map(score.landmarks.map(l => [l.id, l]));
  const persistent = new Set<string>();
  let previous = new Set<string>();
  let previousSegment: string | undefined;
  const colors = score.visualGrammar.colorRoles;
  const row = colors["row-index"]?.trim().toLowerCase();
  const column = colors["column-index"]?.trim().toLowerCase();
  if (("row-index" in colors || "column-index" in colors) && (!row || !column || row === column)) {
    issues.push({ kind: "color-role", detail: "Row and column indices need distinct color roles." });
  }
  for (const state of score.states) {
    const current = new Set(state.visibleIds);
    const transition = (id: string, detail: string) =>
      issues.push({ kind: "state-transition", stateId: state.id, landmarkId: id, detail });
    for (const id of state.add) {
      if (previous.has(id)) transition(id, "Added landmark is already visible.");
      if (!current.has(id)) transition(id, "Added landmark is absent from the resulting state.");
    }
    for (const id of state.remove) {
      if (!previous.has(id)) transition(id, "Removed landmark was not visible.");
      if (current.has(id)) transition(id, "Removed landmark remains visible.");
    }
    for (const id of current) {
      if (!previous.has(id) && !state.add.includes(id)) transition(id, "Newly visible landmark lacks an add action.");
      if (landmarks.get(id)?.persistence === "lesson") persistent.add(id);
    }
    for (const id of previous) {
      const expires = landmarks.get(id)?.persistence === "scene" && previousSegment !== state.segmentId;
      if (!current.has(id) && !state.remove.includes(id) && !expires) {
        transition(id, "Landmark disappears without a remove action.");
      }
    }
    for (const id of persistent) {
      if (!current.has(id)) issues.push({
        kind: "persistence", stateId: state.id, landmarkId: id,
        detail: "Lesson-persistent landmark disappeared.",
      });
    }
    const roles = state.visibleIds.map(id => landmarks.get(id)?.role);
    if (roles.some(role => role === "operation" || role === "result") &&
        !roles.some(role => role === "given" || role === "definition" || role === "representation")) {
      issues.push({ kind: "missing-context", stateId: state.id, detail: "Work or result has no visible givens, definition, or representation." });
    }
    previous = current;
    previousSegment = state.segmentId;
  }
  return issues;
}

