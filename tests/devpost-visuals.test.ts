import { expect, test } from 'bun:test';
import { DEMO_LESSON, EDITED_DEMO_LESSON, editedTimeline, editedWritingClock, demoTimeline, demoDuration, writingClock } from '../tools/devpost/lesson';
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
  for (const step of [0,2,3,5]) {
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
  expect(css.match(/\.full-screen-app \{[^}]+\}/)?.[0]).not.toContain('scale(');
  expect(css).not.toContain('font-family:Arial');
  expect(film).toContain('full-screen-film antialiased');
  expect(film).toContain('prepared exchange, not a live response');
  expect(film).toContain('not a speed benchmark');
});

test('readable film demonstrates actual themes and labels the future honestly', () => {
  const film = fs.readFileSync('tools/devpost/Film.tsx', 'utf8');
  const studio = fs.readFileSync('src/app/studio/page.tsx', 'utf8');
  const player = fs.readFileSync('src/components/player/SolvePlayer.tsx', 'utf8');
  expect(film).toContain('width={1440} height={810}');
  expect(film).toContain('"paper" : "whiteboard"');
  expect(studio).toContain('presentationThemeMenuOpen={presentation?.themeMenuOpen}');
  expect(player).toContain('(presentationThemeMenuOpen ?? themeMenu)');
  expect(film).toContain('Planned—not available today');
  expect(film).toContain('segment.id === "close" ? <FutureClosing');
  expect(film).toContain('const diagram = architecture');
  expect(film).toContain('ember-original-score.wav');
});

test('original music generator uses narration ducking and no third-party samples', () => {
  const music = fs.readFileSync('tools/devpost/music.mjs','utf8');
  expect(music).toContain('Original procedural score');
  expect(music).toContain('speechDucked:true');
  expect(music).not.toContain('fetch(');
  const file = 'scratch/devpost/public/audio/ember-original-score.wav';
  if (fs.existsSync(file)) {
    const wav = fs.readFileSync(file);
    expect(wav.toString('ascii',0,4)).toBe('RIFF');
    expect(wav.readUInt16LE(22)).toBe(2);
    let peak=0;
    for(let i=44;i<wav.length;i+=2) peak=Math.max(peak,Math.abs(wav.readInt16LE(i))/32768);
    expect(peak).toBeGreaterThan(.01);
    expect(peak).toBeLessThan(.16);
  }
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

test('architecture holds its diagram and the demo shows genuine editing UI', () => {
  const film = fs.readFileSync('tools/devpost/Film.tsx', 'utf8');
  expect(film).toContain('const diagram = architecture;');
  expect(film).not.toContain('(architecture && p <');
  expect(film).toContain('mode:"edit"');
  expect(film).toContain('versions: edited ? [DEMO_LESSON, EDITED_DEMO_LESSON]');
  expect(auditTimeline(editedTimeline)).toEqual([]);
  expect(JSON.stringify(EDITED_DEMO_LESSON)).toContain('∫ e^(2x) dx = ½ e^(2x)');
  for(let sec=0;sec<20;sec+=.1) expect(editedWritingClock(sec+.1)-editedWritingClock(sec)).toBeLessThanOrEqual(.095000001);
});

test('narration names themes and community revisions without internal storage copy', () => {
  const script = JSON.parse(fs.readFileSync('tools/devpost/script.json','utf8')) as {id:string;text:string}[];
  expect(script.find(s=>s.id==='control')?.text).toContain('a blackboard, a whiteboard, or paper');
  expect(script.find(s=>s.id==='gallery')?.text).toContain('not overwriting the original community post');
  expect(script.find(s=>s.id==='gallery')?.text).not.toContain('store lesson scripts');
  const prepare=fs.readFileSync('tools/devpost/prepare.ts','utf8');
  expect(prepare).toContain('voice, voiceProfile, text: segment.text');
  expect(prepare).toContain('geminiTTS(segment.text, voice, voiceProfile)');
  expect(prepare).toContain('modelFallback: false');
});
