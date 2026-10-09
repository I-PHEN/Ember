import { SAMPLE_CALCULUS } from '../../src/lib/samples';
import { compileTimeline } from '../../src/lib/video/compile';
import { totalDuration, type SolveScript } from '../../src/lib/video/types';

/** Reviewed mathematics, existing stroke engine; condensed visual montage. */
export const DEMO_LESSON: SolveScript = { ...SAMPLE_CALCULUS, scenes: [{ chapter: 'Integration by parts · worked example', narration: '', beats: [
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
