import { sanitizeScript } from "../solve-schema";
import { compileTimeline } from "../video/compile";
import { scriptOverlap } from "../video/overlap";
import { auditTimeline, type LayoutViolation } from "../video/layout-audit";
import { repairLayout } from "../video/layout-repair";
import type { SolveScript, Timeline } from "../video/types";

export interface MergedScriptResult {
  script: SolveScript;
  timeline: Timeline;
  overlapPct: number;
  layoutViolations: LayoutViolation[];
}

export function mergeScript(
  outline: {
    title: string;
    subject?: string;
    question: string;
    scenes: Array<{ chapter: string }>;
  },
  results: Array<{ narration?: string; beats: unknown[] } | null>,
  stats?: {
    proseDropped?: number;
    overlapPct?: number | null;
    layoutViolations?: number | null;
  }
): MergedScriptResult | null {
  const rawScript = {
    title: outline.title,
    subject: outline.subject,
    question: outline.question,
    scenes: outline.scenes.map((scene, i) => ({
      chapter: scene.chapter,
      narration: results[i]?.narration ?? "",
      beats: results[i]?.beats ?? [],
      segments: (results[i] as { segments?: unknown })?.segments,
    })),
  };

  const script = sanitizeScript(rawScript, stats);
  if (!script || script.scenes.length < 2) {
    return null;
  }

  let finalScript = script;
  let timeline = compileTimeline(script);
  let layoutViolations = auditTimeline(timeline);

  if (layoutViolations.length > 0) {
    const repaired = repairLayout(script);
    if (repaired.remainingViolations < layoutViolations.length) {
      finalScript = repaired.script;
      timeline = compileTimeline(finalScript);
      layoutViolations = auditTimeline(timeline);
    }
  }

  const overlapPct = Math.round(scriptOverlap(finalScript) * 100);

  if (stats) {
    stats.overlapPct = overlapPct;
    stats.layoutViolations = layoutViolations.length;
  }

  return {
    script: finalScript,
    timeline,
    overlapPct,
    layoutViolations,
  };
}
