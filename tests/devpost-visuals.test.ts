import { expect, test } from 'bun:test';
import { DEMO_LESSON, demoTimeline, demoDuration, writingClock } from '../tools/devpost/lesson';
import { auditTimeline } from '../src/lib/video/layout-audit';
import fs from 'node:fs';

test('worked demo retains the complete integration-by-parts derivation', () => {
  const writes = DEMO_LESSON.scenes[0].beats.filter(beat => beat.type === 'write');
  expect(writes).toHaveLength(6);
  expect(JSON.stringify(writes)).toContain('¼ e^(2x) + C');
  expect(demoDuration).toBeGreaterThan(0);
  expect(Number.isFinite(demoDuration)).toBe(true);
  expect(auditTimeline(demoTimeline)).toEqual([]);
});
test('visual revision preserves narration and discloses prepared sequences', () => {
  const visuals = fs.readFileSync('tools/devpost/VisualScenes.tsx', 'utf8');
  expect(visuals).toContain('Reviewed excerpt of this question · prepared, not live replay');
  expect(visuals).toContain('Prepared follow-up, not a live response');
  expect(visuals).toContain('solver comparisons can remain unresolved');
  expect(visuals).not.toContain('geminiTTS');
  expect(visuals).not.toContain('fetch(');
  expect(visuals).toContain('String.raw');
});
test('visible writing never fast-forwards the authored stroke clock', () => {
  for (const step of [0,2,5]) {
    for (let sec = 0; sec < 30; sec += .1) {
      const advance = writingClock(step, sec + .1) - writingClock(step, sec);
      expect(advance).toBeGreaterThanOrEqual(0);
      expect(advance).toBeLessThanOrEqual(.095000001);
    }
    expect(writingClock(step, 1000)).toBe(writingClock(step, 2000));
  }
});
