import { SAMPLE_CALCULUS } from '../../src/lib/samples';
import { compileTimeline } from '../../src/lib/video/compile';
import { totalDuration, type SolveScript } from '../../src/lib/video/types';

/** Reviewed mathematics, existing stroke engine; condensed visual montage. */
export const DEMO_LESSON: SolveScript = { ...SAMPLE_CALCULUS, title: 'Integration by parts: ∫ x·e²ˣ dx', scenes: [{ chapter: 'Integration by parts · worked example', narration: '', beats: [
  { type: 'write', text: '∫ x·e^(2x) dx', size: 'lg', color: 'blue' }, { type: 'newline', n: 1 },
  { type: 'write', text: '∫ u dv = uv − ∫ v du', size: 'md', color: 'orange' }, { type: 'newline', n: 1 },
  { type: 'write', text: 'u = x          →  du = dx', size: 'md', color: 'white' }, { type: 'newline', n: 1 },
  { type: 'write', text: 'dv = e^(2x) dx →  v = ½ e^(2x)', size: 'md', color: 'yellow' }, { type: 'newline', n: 1 },
  { type: 'write', text: '= ½ x·e^(2x) − ½ ∫ e^(2x) dx', size: 'md', color: 'white' }, { type: 'newline', n: 1 },
  { type: 'write', text: '= ½ x·e^(2x) − ¼ e^(2x) + C', size: 'md', color: 'green' },
  { type: 'box', target: 'text:= ½ x·e^(2x) − ¼ e^(2x) + C', color: 'yellow' },
] }] };
export const demoTimeline = compileTimeline(DEMO_LESSON);
export const demoDuration = totalDuration(demoTimeline);

/** Prepared Office Hours revision: make the previously implicit integral explicit. */
export const EDITED_DEMO_LESSON: SolveScript = { ...DEMO_LESSON, scenes: [{
  ...DEMO_LESSON.scenes[0], beats: [
    ...DEMO_LESSON.scenes[0].beats.slice(0, 8),
    { type: 'write', text: '∫ e^(2x) dx = ½ e^(2x)', size: 'md', color: 'orange' },
    { type: 'newline', n: 1 },
    ...DEMO_LESSON.scenes[0].beats.slice(8),
  ],
}] };
export const editedTimeline = compileTimeline(EDITED_DEMO_LESSON);
export function editedWritingClock(seconds: number) {
  const group = editedTimeline.scenes[0].groups[4];
  const start = Math.max(0, group.born - .35);
  const end = Math.max(...group.strokes.map(stroke => stroke.t0 + stroke.dur)) + .45;
  return Math.min(end, start + Math.max(0, seconds) * .95);
}

/** Excerpts advance at 0.95× authored ink speed, then hold the completed step. */
export function writingClock(step: number, seconds: number) {
  const group = demoTimeline.scenes[0].groups[step];
  const start = Math.max(0, group.born - .35);
  const end = Math.max(...group.strokes.map(stroke => stroke.t0 + stroke.dur)) + .45;
  return Math.min(end, start + Math.max(0, seconds) * .95);
}
