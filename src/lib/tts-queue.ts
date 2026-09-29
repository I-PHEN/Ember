import { geminiTTS } from "./ai/gemini";

/* ------------------------------------------------------------------
   The global TTS pipeline. Upstream speech is strictly rate-limited,
   so ALL text-to-speech in this app — the /api/narrate route AND the
   video-job voice pre-warm — funnels through this ONE serialized
   queue (spaced, 429-retried, response-cached). Because they share
   the cache, a voice the job pre-warmed is an instant cache hit for
   the player, and the player's own requests simply join the queue.
------------------------------------------------------------------- */

const MIN_GAP_MS = 1500;
const MAX_GAP_MS = 8000;
const MAX_CACHED = 64;
const MAX_TEXT = 1020;

const cache = new Map<string, Buffer>();
let lastCallAt = 0;
/* adaptive pacing: the limiter is account-wide, so after any 429 the
   whole TTS pipeline spaces its calls further apart (up to 8s) and
   recovers gradually once calls succeed again */
let gapMs = MIN_GAP_MS;
let lock: Promise<unknown> = Promise.resolve();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function voiceKey(voice: string, speed: number, text: string): string {
  return `${voice}|${speed}|${text}`;
}

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = lock.then(fn, fn);
  lock = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function ttsOnce(input: string, voice: string): Promise<Buffer> {
  /* Gemini TTS (voice is normalized to a prebuilt Gemini voice — the
     legacy "jam" the client sends maps to the configured Ember voice) */
  return geminiTTS(input, voice);
}

async function ttsWithRetry(
  input: string,
  voice: string
): Promise<Buffer> {
  const delays = [0, 1800, 4000, 8000, 14000];
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt]) await sleep(delays[attempt]);
    // keep calls spaced even across retries — wider after rate-limits
    const wait = lastCallAt + gapMs - Date.now();
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();
    try {
      const buf = await ttsOnce(input, voice);
      gapMs = Math.max(MIN_GAP_MS, Math.round(gapMs * 0.7));
      return buf;
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (/status 429/.test(msg)) {
        gapMs = Math.min(MAX_GAP_MS, gapMs * 2);
      }
      // non-retryable (bad input) — bail early
      if (/status 4[0-9]{2}/.test(msg) && !/status 429/.test(msg)) break;
    }
  }
  throw lastErr ?? new Error("tts failed");
}

/**
 * Speak (or fetch from cache) one narration. Serialized globally.
 * Returns the WAV buffer and the ms it took (for ETA statistics).
 */
export function speak(
  text: string,
  voice = "jam",
  speed = 1
): Promise<{ buffer: Buffer; ms: number; cached: boolean }> {
  const t0 = Date.now();
  return withLock(async () => {
    const key = voiceKey(voice, speed, text);
    const hit = cache.get(key);
    if (hit) return { buffer: hit, ms: Date.now() - t0, cached: true };

    const buffer = await ttsWithRetry(text.slice(0, MAX_TEXT), voice);
    if (cache.size >= MAX_CACHED) {
      const first = cache.keys().next().value;
      if (first !== undefined) cache.delete(first);
    }
    cache.set(key, buffer);
    return { buffer, ms: Date.now() - t0, cached: false };
  });
}

/** Cached-peek used by the narrate route's fast path (no queue join). */
export function peekCache(text: string, voice = "jam", speed = 1): Buffer | undefined {
  return cache.get(voiceKey(voice, speed, text));
}
