/** Pure timing compiler. All times are seconds; geometry is deliberately absent. */
export interface BeatTiming { id: string; t0: number; t1: number; say?: string; fixed?: boolean }
export interface SpeechAnchor { id: string; wordStart: number; wordEnd: number }
export interface PhraseTiming { id: string; start: number; end: number }
export interface VoiceTiming { duration: number; phrases?: readonly PhraseTiming[]; estimated?: boolean }
export interface TimingIssue { kind: "missing-anchor" | "overflow"; beatId: string; seconds?: number }
export interface TimingWindow { id: string; rawStart: number; rawEnd: number; start: number; end: number; scale: number }
export interface TimingPlan {
  source: "estimated" | "duration" | "aligned";
  windows: TimingWindow[];
  writeEnd: number;
  issues: TimingIssue[];
}
export const MAX_INK_SPEEDUP = 2.5;
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
  let previousEnd = 0;
  for (const [index, group] of groups.entries()) {
    const start = Math.max(0, group.start, previousEnd);
    // Estimated words have no trustworthy phrase end: use until the next anchor.
    const deadline = voice.phrases === undefined
      ? (groups[index + 1]?.start ?? voice.duration)
      : Math.min(group.end, groups[index + 1]?.start ?? voice.duration);
    const fixed = group.beats.filter(b => b.fixed).reduce((n, b) => n + b.t1 - b.t0, 0);
    const flexible = group.beats.filter(b => !b.fixed).reduce((n, b) => n + b.t1 - b.t0, 0);
    const scale = flexible > 0 ? Math.max(1 / MAX_INK_SPEEDUP, Math.min(1, (deadline - start - fixed) / flexible)) : 1;
    let clock = start;
    for (const beat of group.beats) {
      const speedScale = beat.fixed ? 1 : scale;
      const end = clock + (beat.t1 - beat.t0) * speedScale;
      windows.push({ id: beat.id, rawStart: beat.t0, rawEnd: beat.t1, start: clock, end, scale: speedScale });
      clock = end;
    }
    if (clock > deadline + 0.001) issues.push({ kind: "overflow", beatId: group.beats[0].id, seconds: clock - deadline });
    previousEnd = clock;
  }
  return {
    source: voice.phrases !== undefined ? "aligned" : voice.estimated ? "estimated" : "duration",
    windows, writeEnd: previousEnd, issues,
  };
}

/** Right-continuous at beat boundaries: an erase/slide belongs to the new beat. */
export function mapTimingTime(plan: TimingPlan, time: number): number {
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

