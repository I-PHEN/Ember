import { z } from "zod";

// Structural validation uses the project's existing Zod dependency. Cross-artifact
// references are checked separately; invalid relationships are never repaired.
const text = z.string().trim().min(1);
const ids = z.array(text).refine(values => new Set(values).size === values.length);
const segment = z.object({
  id: text,
  function: z.enum(["hook", "orient", "pretrain", "plan", "work", "predict", "reveal", "check", "formalize", "misconception", "transfer", "recap"]),
  objective: text,
});
const lessonSchema = z.object({
  id: text, kind: z.enum(["solve", "explain"]),
  domain: z.enum(["math", "physics", "chemistry", "computing"]),
  title: text, learnerLevel: z.literal("university-intro"),
  segments: z.array(segment).min(1),
});
const phrase = z.object({ id: text, segmentId: text, text, purpose: text });
const narrationSchema = z.object({ lessonId: text, phrases: z.array(phrase).min(1) });
const zone = z.enum(["context", "activeWork", "visualModel", "conclusion"]);
const landmark = z.object({
  id: text,
  primitive: z.enum(["text", "equation", "matrix", "graph", "freebody", "structure", "table", "numberline", "trace"]),
  role: z.enum(["given", "definition", "representation", "index", "operation", "result", "check", "annotation"]),
  purpose: text, zone,
  persistence: z.enum(["scene", "lesson", "until-replaced"]),
  relationTo: ids,
});
const state = z.object({
  id: text, segmentId: text, visibleIds: ids, add: ids,
  emphasize: ids, remove: ids, learnerFocus: text, phraseIds: ids.min(1),
});
const zonePurpose = z.object({ purpose: text });
const boardSchema = z.object({
  lessonId: text,
  boardZones: z.object({ context: zonePurpose, activeWork: zonePurpose, visualModel: zonePurpose, conclusion: zonePurpose }),
  landmarks: z.array(landmark).min(1), states: z.array(state).min(1),
  visualGrammar: z.object({
    colorRoles: z.record(text, text),
    alignmentRules: z.array(text),
    erasePolicy: z.enum(["preserve-context", "clear-active-work", "replace-representation"]),
    whitespaceBudget: z.enum(["compact", "balanced", "generous"]),
  }),
});

export type LessonPlan = z.infer<typeof lessonSchema>;
export type LessonSegment = z.infer<typeof segment>;
export type LessonKind = LessonPlan["kind"];
export type LessonDomain = LessonPlan["domain"];
export type SegmentFunction = LessonSegment["function"];
export type PhraseAnchor = z.infer<typeof phrase>;
export type NarrationScore = z.infer<typeof narrationSchema>;
export type BoardScore = z.infer<typeof boardSchema>;
export type BoardLandmark = z.infer<typeof landmark>;
export type BoardState = z.infer<typeof state>;
export type BoardZoneName = z.infer<typeof zone>;
export type BoardPrimitive = BoardLandmark["primitive"];
export type LandmarkRole = BoardLandmark["role"];
export type Persistence = BoardLandmark["persistence"];
export type BoardZones = BoardScore["boardZones"];
export type BoardVisualGrammar = BoardScore["visualGrammar"];

function unique(items: { id: string }[]): boolean {
  return new Set(items.map(item => item.id)).size === items.length;
}

export function normalizeLessonPlan(raw: unknown): LessonPlan | null {
  const result = lessonSchema.safeParse(raw);
  return result.success && unique(result.data.segments) ? result.data : null;
}

export function normalizeNarrationScore(raw: unknown, lesson: LessonPlan): NarrationScore | null {
  const result = narrationSchema.safeParse(raw);
  if (!result.success) return null;
  const score = result.data;
  const segments = new Set(lesson.segments.map(s => s.id));
  return score.lessonId === lesson.id && unique(score.phrases) &&
    score.phrases.every(p => segments.has(p.segmentId)) ? score : null;
}

export function normalizeBoardScore(raw: unknown, lesson: LessonPlan, narration: NarrationScore): BoardScore | null {
  const result = boardSchema.safeParse(raw);
  if (!result.success || !normalizeNarrationScore(narration, lesson)) return null;
  const score = result.data;
  if (score.lessonId !== lesson.id || !unique(score.landmarks) || !unique(score.states)) return null;
  const landmarks = new Set(score.landmarks.map(l => l.id));
  const segments = new Set(lesson.segments.map(s => s.id));
  const phrases = new Map(narration.phrases.map(p => [p.id, p.segmentId]));
  if (!score.landmarks.every(l => l.relationTo.every(id => id !== l.id && landmarks.has(id)))) return null;
  for (const s of score.states) {
    if (!segments.has(s.segmentId) || !s.phraseIds.every(id => phrases.get(id) === s.segmentId)) return null;
    if (![...s.visibleIds, ...s.add, ...s.remove, ...s.emphasize].every(id => landmarks.has(id))) return null;
    if (!s.emphasize.every(id => s.visibleIds.includes(id))) return null;
    if (!s.add.every(id => s.visibleIds.includes(id) && !s.remove.includes(id))) return null;
    if (s.remove.some(id => s.visibleIds.includes(id))) return null;
  }
  return score;
}

