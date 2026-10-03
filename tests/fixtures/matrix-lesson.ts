export function matrixArtifacts() {
  return {
    lesson: { id: "matrix-elements", kind: "explain", domain: "math", title: "Matrix elements", learnerLevel: "university-intro",
      segments: [{ id: "orient", function: "orient", objective: "Read dimensions" }, { id: "read-a23", function: "work", objective: "Locate A₂₃" }] },
    narration: { lessonId: "matrix-elements", phrases: [
      { id: "p-orient", segmentId: "orient", text: "Two rows and three columns.", purpose: "Identify shape" },
      { id: "p-read", segmentId: "read-a23", text: "Row two, column three.", purpose: "Locate entry" }] },
    board: { lessonId: "matrix-elements",
      boardZones: { context: { purpose: "Keep givens" }, activeWork: { purpose: "Read entries" }, visualModel: { purpose: "Show matrix" }, conclusion: { purpose: "Summarize" } },
      landmarks: [
        { id: "matrix-a", primitive: "matrix", role: "representation", purpose: "Preserve matrix", zone: "visualModel", persistence: "lesson", relationTo: [] },
        { id: "row-index", primitive: "text", role: "index", purpose: "Select row", zone: "visualModel", persistence: "until-replaced", relationTo: ["matrix-a"] },
        { id: "column-index", primitive: "text", role: "index", purpose: "Select column", zone: "visualModel", persistence: "until-replaced", relationTo: ["matrix-a"] }],
      states: [
        { id: "show", segmentId: "orient", visibleIds: ["matrix-a"], add: ["matrix-a"], remove: [], emphasize: [], learnerFocus: "Dimensions", phraseIds: ["p-orient"] },
        { id: "read", segmentId: "read-a23", visibleIds: ["matrix-a", "row-index", "column-index"], add: ["row-index", "column-index"], remove: [], emphasize: ["row-index"], learnerFocus: "A₂₃", phraseIds: ["p-read"] }],
      visualGrammar: { colorRoles: { "row-index": "blue", "column-index": "red" }, alignmentRules: ["Align indices with entries"], erasePolicy: "preserve-context", whitespaceBudget: "balanced" } }
  };
}

