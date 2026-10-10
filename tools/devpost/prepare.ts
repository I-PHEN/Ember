/** Run only after the narration script has been approved. Keys stay in the environment. */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { geminiTTS } from '../../src/lib/ai/gemini';

if (!process.argv.includes('--approved-script')) throw new Error('Review script.json and explicitly supply --approved-script before paid synthesis.');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const scratch = path.join(root, 'scratch/devpost');
const audioDir = path.join(scratch, 'public/audio');
await fs.mkdir(audioDir, { recursive: true });
type ScriptSegment = { id: string; title: string; text: string };
type Caption = { start: number; end: number; text: string };
const script: ScriptSegment[] = JSON.parse(await fs.readFile(path.join(here, 'script.json'), 'utf8'));
const segments: (ScriptSegment & { duration: number; audio: string; audioDuration: number; captions: Caption[]; audioQuality: { rms: number; peak: number } })[] = [];
const voice = 'Aoede';
let subtitleIndex = 0;
let elapsed = 0;
const subtitles: string[] = [];
const timestamp = (seconds: number) => {
  const ms = Math.round(seconds * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
};
for (const segment of script) {
  if (!/^[a-z]+$/.test(segment.id)) throw new Error('Invalid segment ID.');
  const hash = createHash('sha256').update(`${voice}:${segment.text}`).digest('hex').slice(0, 16);
  const name = `${segment.id}-${hash}.wav`;
  const file = path.join(audioDir, name);
  let wav: Buffer;
  try { wav = await fs.readFile(file); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    console.log(`Synthesizing ${segment.id} with configured Gemini voice API.`);
    wav = await geminiTTS(segment.text, voice);
    await fs.writeFile(file, wav);
  }
  // Existing Gemini helper emits canonical mono PCM WAV with a 44-byte header.
  if (wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 36, 40) !== 'data' || wav.readUInt16LE(20) !== 1) throw new Error(`Unexpected WAV format: ${segment.id}`);
  const bytes = wav.readUInt32LE(40);
  if (bytes !== wav.length - 44) throw new Error(`Truncated WAV: ${segment.id}`);
  const audioDuration = bytes / wav.readUInt32LE(28);
  if (audioDuration < 2 || audioDuration > 100) throw new Error(`Unexpected narration duration: ${segment.id}`);
  let energy = 0;
  let peak = 0;
  for (let i = 44; i < wav.length; i += 2) { const sample = wav.readInt16LE(i) / 32768; energy += sample * sample; peak = Math.max(peak, Math.abs(sample)); }
  const rms = Math.sqrt(energy / (bytes / 2));
  if (rms < .002) throw new Error(`Narration appears silent: ${segment.id}`);
  const words = segment.text.split(/\s+/);
  const captions: Caption[] = [];
  // Word-count-based captions are approximate; manually review before submission.
  for (let i = 0; i < words.length; i += 13) {
    const end = Math.min(words.length, i + 13);
    const startSec = i / words.length * audioDuration;
    const endSec = end / words.length * audioDuration;
    const text = words.slice(i, end).join(' ');
    captions.push({ start: startSec, end: endSec, text });
    subtitles.push(`${++subtitleIndex}\n${timestamp(elapsed + startSec)} --> ${timestamp(elapsed + endSec)}\n${text}\n`);
  }
  const duration = Math.ceil((audioDuration + .8) * 30) / 30;
  segments.push({ ...segment, duration, audio: `audio/${name}`, audioDuration, captions, audioQuality: { rms, peak } });
  elapsed += duration;
  console.log(`${segment.id}: ${audioDuration.toFixed(1)}s, peak ${peak.toFixed(3)}`);
}
if (elapsed < 120 || elapsed > 240) throw new Error(`Film is ${elapsed.toFixed(1)} seconds; revise the script to meet the 2–4 minute target. Cached narration is preserved.`);
let gallery = [];
try {
  const response = await fetch('http://localhost:3021/api/gallery');
  if (!response.ok) throw new Error('Gallery unavailable');
  gallery = (await response.json()).items || [];
} catch {
  try { gallery = JSON.parse(await fs.readFile(path.join(scratch, 'preview-manifest.json'), 'utf8')).gallery || []; }
  catch { gallery = []; }
  console.warn(gallery.length ? 'Using the previously captured gallery snapshot, not live catalogue data.' : 'No gallery snapshot captured. The film will label the empty catalogue.');
}
await fs.writeFile(path.join(scratch, 'manifest.json'), JSON.stringify({ segments, gallery }, null, 2));
await fs.writeFile(path.join(scratch, 'Ember-Devpost-Captions.srt'), subtitles.join('\n'));
console.log(`Prepared ${elapsed.toFixed(1)}s. Captions require human timing review.`);
