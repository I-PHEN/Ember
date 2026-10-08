/** Pure timing compiler. All times are seconds; geometry is deliberately absent. */
export interface TimingSpan { kind: "ink" | "travel" | "pause" | "fixed"; t0: number; t1: number; minDuration?: number; maxDuration?: number }
export interface BeatTiming { id: string; t0: number; t1: number; say?: string; fixed?: boolean; spans?: readonly TimingSpan[] }
export interface SpeechAnchor { id: string; wordStart: number; wordEnd: number }
export interface PhraseTiming { id: string; start: number; end: number }
export interface VoiceTiming { duration: number; phrases?: readonly PhraseTiming[]; estimated?: boolean }
export interface TimingIssue { kind: "missing-anchor" | "overflow"; beatId: string; seconds?: number }
export interface TimingWindow { id: string; kind: TimingSpan["kind"]; rawStart: number; rawEnd: number; start: number; end: number; scale: number }
export interface TimingPlan {
  source: "estimated" | "duration" | "aligned";
  windows: TimingWindow[];
  writeEnd: number;
  issues: TimingIssue[];
  feasibility: "fits" | "needs-revision";
  holds: { id: string; start: number; end: number }[];
}
export const MAX_INK_SPEEDUP = 1.25;

function spansFor(beat: BeatTiming): TimingSpan[] {
  if (beat.spans === undefined) return [{ kind: beat.fixed ? "fixed" : "ink", t0: beat.t0, t1: beat.t1 }];
  if (!Array.isArray(beat.spans)) throw new Error("Invalid timing spans");
  const result: TimingSpan[] = [];
  let cursor = beat.t0;
  for (const span of beat.spans) {
    const duration = span.t1 - span.t0;
    if (!["ink", "travel", "pause", "fixed"].includes(span.kind) ||
        !Number.isFinite(span.t0) || !Number.isFinite(span.t1) || span.t0 < cursor - 1e-8 ||
        duration < 0 || span.t1 > beat.t1 + 1e-8 ||
        (span.minDuration !== undefined && (!Number.isFinite(span.minDuration) || span.minDuration < 0 || span.minDuration > duration)) ||
        (span.maxDuration !== undefined && (!Number.isFinite(span.maxDuration) || span.maxDuration < duration)) ||
        (span.kind !== "pause" && (span.minDuration !== undefined || span.maxDuration !== undefined))) {
      throw new Error("Invalid timing span clocks or bounds");
    }
    if (span.t0 > cursor) result.push({ kind: "fixed", t0: cursor, t1: span.t0 });
    // Zero-length markers have no motion or elastic capacity.
    if (duration > 0) result.push({ ...span, kind: beat.fixed ? "fixed" : span.kind });
    cursor = span.t1;
  }
  if (cursor < beat.t1) result.push({ kind: "fixed", t0: cursor, t1: beat.t1 });
  return result;
}
const words = (text: string) => text.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

export function matchSpeechAnchors(narration: string, beats: readonly BeatTiming[]): SpeechAnchor[] {
  const tokens = words(narration);
  const result: SpeechAnchor[] = [];
  let cursor = 0;
  for (const beat of beats) {
    const phrase = words(beat.say ?? "");
    if (!phrase.length) continue;
    for (let i = cursor; i <= tokens.length - phrase.length; i++) {
      if (!phrase.every((word, j) => tokens[i + j] === word)) continue;
      result.push({ id: beat.id, wordStart: i, wordEnd: i + phrase.length });
      cursor = i + phrase.length;
      break;
    }
  }
  return result;
}

export function compileBeatTiming(beats: readonly BeatTiming[], narration: string, voice: VoiceTiming): TimingPlan {
  if (!Number.isFinite(voice.duration) || voice.duration <= 0) throw new Error("Invalid voice duration");
  const ids = new Set(beats.map(b => b.id));
  if (ids.size !== beats.length || beats.some((b, i) =>
    !Number.isFinite(b.t0) || !Number.isFinite(b.t1) || b.t0 < 0 || b.t1 < b.t0 ||
    (i > 0 && b.t0 < beats[i - 1].t1 - 1e-8))) throw new Error("Invalid beat clocks");
  const normalized = new Map(beats.map(b => [b.id, spansFor(b)]));
  const anchors = matchSpeechAnchors(narration, beats);
  const issues: TimingIssue[] = [];
  const count = Math.max(1, words(narration).length);
  const phrases = new Map<string, PhraseTiming>();
  if (voice.phrases !== undefined) {
    if (!voice.phrases.length || voice.estimated) throw new Error("Aligned timing requires measured phrases");
    let lastEnd = 0;
    let lastIndex = -1;
    for (const phrase of voice.phrases) {
      const index = beats.findIndex(b => b.id === phrase.id);
      if (index <= lastIndex || phrases.has(phrase.id) || !ids.has(phrase.id) ||
          !Number.isFinite(phrase.start) || !Number.isFinite(phrase.end) ||
          phrase.start < lastEnd || phrase.end <= phrase.start || phrase.end > voice.duration) {
        throw new Error("Invalid aligned phrase timing");
      }
      phrases.set(phrase.id, phrase);
      lastEnd = phrase.end;
      lastIndex = index;
    }
    // An aligned track must account for every authored speech anchor.
    if (beats.some(b => b.say && !phrases.has(b.id))) throw new Error("Incomplete aligned phrase timing");
  } else {
    for (const anchor of anchors) phrases.set(anchor.id, {
      id: anchor.id, start: voice.duration * anchor.wordStart / count,
      end: voice.duration * anchor.wordEnd / count,
    });
  }
  for (const beat of beats) {
    if (beat.say && !phrases.has(beat.id)) issues.push({ kind: "missing-anchor", beatId: beat.id });
  }
  // Every anchor opens a group; following untagged actions decorate that group.
  const groups: { beats: BeatTiming[]; start: number; end: number }[] = [];
  for (const beat of beats.filter(b => b.t1 > b.t0)) {
    const phrase = phrases.get(beat.id);
    if (!groups.length || phrase) {
      groups.push({ beats: [], start: phrase?.start ?? 0.15, end: phrase?.end ?? voice.duration });
    }
    groups[groups.length - 1].beats.push(beat);
  }
  const windows: TimingWindow[] = [];
  const holds: TimingPlan["holds"] = [];
  let previousEnd = 0;
  for (const [index, group] of groups.entries()) {
    const previousBeat = groups[index - 1]?.beats.at(-1);
    if (previousBeat && group.beats[0].t0 > previousBeat.t1) {
      const gap = group.beats[0].t0 - previousBeat.t1;
      // A synthetic terminal hold may house this protected source gap, but
      // authored waits, pauses and ink are never silently discarded here.
      const hold = holds.at(-1);
      if (hold && Math.abs(hold.end - previousEnd) < 1e-8) {
        const reclaimed = Math.min(gap, hold.end - hold.start);
        hold.end -= reclaimed;
        previousEnd -= reclaimed;
        if (hold.end <= hold.start) holds.pop();
      }
      windows.push({ id: group.beats[0].id, kind: "fixed", rawStart: previousBeat.t1, rawEnd: group.beats[0].t0,
        start: previousEnd, end: previousEnd + gap, scale: 1 });
      previousEnd += gap;
    }
    const start = Math.max(0, group.start, previousEnd);
    // Estimated words have no trustworthy phrase end: use until the next anchor.
    const deadline = voice.phrases === undefined
      ? (groups[index + 1]?.start ?? voice.duration)
      : Math.min(group.end, groups[index + 1]?.start ?? voice.duration);
    const spans: (TimingSpan & { id: string })[] = [];
    for (const [i, beat] of group.beats.entries()) {
      const previous = group.beats[i - 1];
      if (previous && beat.t0 > previous.t1) spans.push({ id: beat.id, kind: "fixed", t0: previous.t1, t1: beat.t0 });
      spans.push(...normalized.get(beat.id)!.map(span => ({ ...span, id: beat.id })));
    }
    const durations = spans.map(s => s.t1 - s.t0);
    const natural = durations.reduce((a, b) => a + b, 0);
    let difference = deadline - start - natural;
    const capacity = spans.map((s, i) => s.kind !== "pause" ? 0 : difference < 0
      ? durations[i] - (s.minDuration ?? 0)
      : Math.max(0, Math.min(s.maxDuration ?? Infinity, durations[i] + .5, Math.max(durations[i], 1.2)) - durations[i]));
    const totalCapacity = capacity.reduce((a, b) => a + b, 0);
    const adjustment = Math.sign(difference) * Math.min(Math.abs(difference), totalCapacity);
    if (totalCapacity > 0) for (let i = 0; i < spans.length; i++) durations[i] += adjustment * capacity[i] / totalCapacity;
    difference -= adjustment;
    if (difference < 0) {
      const ink = spans.reduce((n, s, i) => n + (s.kind === "ink" ? durations[i] : 0), 0);
      const scale = ink > 0 ? Math.max(1 / MAX_INK_SPEEDUP, 1 + difference / ink) : 1;
      for (let i = 0; i < spans.length; i++) if (spans[i].kind === "ink") durations[i] *= scale;
    }
    let clock = start;
    for (const [i, span] of spans.entries()) {
      const end = clock + durations[i];
      windows.push({ id: span.id, kind: span.kind, rawStart: span.t0, rawEnd: span.t1, start: clock, end,
        scale: span.t1 > span.t0 ? durations[i] / (span.t1 - span.t0) : 1 });
      clock = end;
    }
    if (clock > deadline + 0.001) issues.push({ kind: "overflow", beatId: group.beats[0].id, seconds: clock - deadline });
    if (clock < deadline) {
      holds.push({ id: group.beats[group.beats.length - 1].id, start: clock, end: deadline });
      clock = deadline;
    }
    previousEnd = clock;
  }
  return {
    source: voice.phrases !== undefined ? "aligned" : voice.estimated ? "estimated" : "duration",
    windows, writeEnd: previousEnd, issues, holds, feasibility: issues.length ? "needs-revision" : "fits",
  };
}

/** Right-continuous at beat boundaries: an erase/slide belongs to the new beat. */
export function mapTimingTime(plan: TimingPlan, time: number, edge: "start" | "end" = "start"): number {
  if (edge === "end") {
    for (const w of plan.windows) {
      if (time >= w.rawStart - 1e-8 && time <= w.rawEnd + 1e-8) return w.start + Math.max(0, Math.min(w.rawEnd - w.rawStart, time - w.rawStart)) * w.scale;
    }
  }
  for (let i = plan.windows.length - 1; i >= 0; i--) {
    const w = plan.windows[i];
    if (time >= w.rawStart - 1e-8) return w.start + (time - w.rawStart) * w.scale;
  }
  return plan.windows[0]?.start ?? time;
}
export function timingScaleAt(plan: TimingPlan, time: number): number {
  for (let i = plan.windows.length - 1; i >= 0; i--) {
    if (time >= plan.windows[i].rawStart - 1e-8) return plan.windows[i].scale;
  }
  return 1;
}

