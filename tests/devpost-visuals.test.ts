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

test('full-screen film mounts actual pages without an outer presentation frame', () => {
  const film = fs.readFileSync('tools/devpost/Film.tsx', 'utf8');
  const css = fs.readFileSync('tools/devpost/fullscreen.css', 'utf8');
  expect(film).toContain('import StudioPage from "../../src/app/studio/page"');
  expect(film).toContain('import GalleryPage from "../../src/app/gallery/page"');
  expect(film).toContain('<GalleryPage/> : <StudioPage/>');
  expect(film).toContain('ReadOnlyAuthProvider');
  expect(film).not.toContain('StudioTourScene');
  expect(film).not.toContain('film-product');
  expect(film).not.toContain('LessonScene');
  expect(css).toContain('inset:0; width:100%; height:100%');
  expect(css).not.toContain('scale(');
  expect(css).not.toContain('font-family:Arial');
  expect(film).toContain('full-screen-film antialiased');
  expect(film).toContain('prepared exchange, not a live response');
  expect(film).toContain('not a speed benchmark');
});

test('offline presentation disables generation and resume without changing live defaults', () => {
  const hook = fs.readFileSync('src/lib/use-video-job.ts', 'utf8');
  const studio = fs.readFileSync('src/app/studio/page.tsx', 'utf8');
  expect(hook).toContain('enabled = true');
  expect(hook).toContain('if (!enabled) return;');
  expect(hook).toContain('if (!enabled) return false;');
  expect(studio).toContain('useVideoJob(handleScript, !presentation)');
  expect(studio).toContain('autoPlay={!presentation}');
  expect(studio).toContain('presentationTime={presentation?.boardTime}');
});
