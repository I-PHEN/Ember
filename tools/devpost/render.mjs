import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { selectComposition, renderStill, renderMedia } from '@remotion/renderer';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const scratch = path.join(root, 'scratch/devpost');
await fs.mkdir(scratch, { recursive: true });
const cssDir = path.join(root, '.next/static/css');
const cssFiles = (await fs.readdir(cssDir)).filter(name => name.endsWith('.css')).sort();
if (!cssFiles.length) throw new Error('Build the application first so its production styles are available.');
const appCss = (await Promise.all(cssFiles.map(name => fs.readFile(path.join(cssDir, name), 'utf8')))).join('\n');
await fs.writeFile(path.join(here, 'app.css'), appCss.replaceAll('/fonts/', '../../public/fonts/').replaceAll('/_next/static/media/', '../../.next/static/media/'));
const preview = process.argv.includes('--preview');
const stillsOnly = process.argv.includes('--stills-only');
const script = JSON.parse(await fs.readFile(path.join(here, 'script.json'), 'utf8'));
let props;
if (preview) {
  props = { segments: script.map(segment => ({ ...segment, duration: Math.max(12, segment.text.split(/\s+/).length / 2.5), captions: [{ start: 0, end: 120, text: segment.text.split('. ')[0] + '.' }] })), gallery: [] };
  try {
    const response = await fetch('http://localhost:3021/api/gallery');
    if (response.ok) {
      const catalogue = await response.json();
      props.gallery = Array.isArray(catalogue) ? catalogue : catalogue.items || [];
    }
  } catch { console.warn('Gallery unavailable; preview will show an explicitly labelled empty catalogue.'); }
  await fs.writeFile(path.join(scratch, 'preview-manifest.json'), JSON.stringify(props, null, 2));
} else {
  props = JSON.parse(await fs.readFile(path.join(scratch, 'manifest.json'), 'utf8'));
  if (props.segments.some(segment => !segment.audio)) throw new Error('Final film requires approved narration for every segment.');
}
const publicDir = path.join(scratch, 'public');
await fs.mkdir(publicDir, { recursive: true });
await fs.cp(path.join(root, 'public/fonts'), path.join(publicDir, 'fonts'), { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(here, 'Film.tsx'), publicDir, outDir: path.join(scratch, 'bundle'), webpackOverride: config => ({ ...config, resolve: { ...config.resolve, alias: { ...config.resolve?.alias, '@': path.join(root, 'src'), react: path.join(here, 'node_modules/react'), 'react-dom': path.join(here, 'node_modules/react-dom'), remotion: path.join(root, 'node_modules/remotion') } } }) });
const composition = await selectComposition({ serveUrl, id: 'EmberDevpost', inputProps: props });
console.log(`Composition: ${composition.width}x${composition.height}, ${composition.durationInFrames / 30}s`);
let offset = 0;
for (const segment of props.segments) {
  const frames = Math.ceil(segment.duration * 30);
  await renderStill({ serveUrl, composition, inputProps: props, frame: offset + Math.min(frames - 13, Math.floor(frames * .6)), output: path.join(scratch, `${segment.id}.png`), imageFormat: 'png' });
  if (stillsOnly && ['control', 'gallery'].includes(segment.id)) {
    for (const progress of [.18, .4, .85]) await renderStill({ serveUrl, composition, inputProps: props, frame: offset + Math.floor(frames * progress), output: path.join(scratch, `${segment.id}-${progress}.png`), imageFormat: 'png' });
  }
  offset += frames;
}
if (!preview && !stillsOnly) {
  const outputLocation = process.argv.find(arg => arg.startsWith('--output='))?.slice(9);
  if (!outputLocation || !path.isAbsolute(outputLocation)) throw new Error('Supply an absolute --output= path for the downloadable MP4.');
  try { await fs.access(outputLocation); throw new Error('Output already exists; choose a new filename.'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  let last = -1;
  await renderMedia({ serveUrl, composition, inputProps: props, outputLocation, codec: 'h264', crf: 20, audioCodec: 'aac', pixelFormat: 'yuv420p', concurrency: 2, onProgress: ({ progress }) => { const step = Math.floor(progress * 20); if (step > last) { last = step; console.log(`Rendering ${step * 5}%`); } } });
  console.log(`Rendered: ${outputLocation}`);
}
