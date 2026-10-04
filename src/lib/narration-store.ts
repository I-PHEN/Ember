"use client";
import { validateWordTiming, validateRecognizedTiming, type SpeechAlignment } from "./video/speech-alignment";

export interface NarrationTrack { url: string; alignment: SpeechAlignment }

/* ------------------------------------------------------------------
   Narration store — fetches + caches TTS audio (object URLs) for
   lesson steps. Shared by every player in the app.

   The upstream voice API is account-rate-limited (429) — often for a
   minute or more right after a generation burst — so this store is
   the ONE place that owns patience: every fetch is retried with
   growing backoff (honoring the server's Retry-After) until the
   voice either arrives or the outage clearly outlasts us. Callers
   just `await get()` and never see a transient 429.
------------------------------------------------------------------- */

/** backoff before attempt N — ~72s of patience on top of the server's
 *  own internal retries (each attempt can itself take ~30s) */
const ATTEMPT_GAPS = [0, 3000, 9000, 20000, 40000];
/** one HTTP attempt: the server retries internally, so be generous */
const ATTEMPT_TIMEOUT = 75000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** thrown by attempt() for 429/5xx — retryable, may carry a pacing hint */
interface TransientError extends Error {
  retryAfterMs?: number;
}

export class NarrationStore {
  private cache = new Map<string, Promise<NarrationTrack>>();
  private inflight = new Map<string, Promise<NarrationTrack>>();

  private async attempt(text: string, voice: string): Promise<NarrationTrack> {
    const r = await fetch("/api/narrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, format: "json" }),
    });
    if (r.status === 429 || r.status >= 500) {
      const err = new Error(
        `narrate ${r.status}`
      ) as TransientError;
      const retryAfter = Number(r.headers.get("retry-after"));
      if (Number.isFinite(retryAfter) && retryAfter > 0) {
        err.retryAfterMs = retryAfter * 1000;
      }
      throw err;
    }
    if (!r.ok) throw new Error(`narrate ${r.status}`); // permanent — no retry
    if (r.headers.get("Content-Type")?.includes("application/json")) {
      const data = await r.json();
      if (typeof data.audio !== "string" || data.audio.length > 24 * 1024 * 1024 ||
          !["audio/wav", "audio/mpeg"].includes(data.contentType)) throw new Error("Invalid narration audio");
      const bytes = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
      if (!bytes.length) throw new Error("Empty narration audio");
      const raw = data.alignment;
      const words = raw?.status === "recognized" ? validateRecognizedTiming(text, raw.words, raw.duration)
        : raw?.status === "aligned" ? validateWordTiming(text, raw.words, raw.duration) : null;
      const alignment: SpeechAlignment = words
        ? { status: raw.status, words, duration: raw.duration }
        : { status: ["unavailable", "timeout", "invalid"].includes(raw?.status) ? raw.status : "invalid", words: [] };
      return { url: URL.createObjectURL(new Blob([bytes], { type: data.contentType })), alignment };
    }
    // Compatibility with existing binary narration servers and saved fixtures.
    const blob = await r.blob();
    if (!blob.type.startsWith("audio")) {
      throw new Error("narrate returned non-audio");
    }
    return { url: URL.createObjectURL(blob), alignment: { status: "unavailable", words: [] } };
  }

  private fetchWithPatience(text: string, voice: string): Promise<NarrationTrack> {
    return (async () => {
      let lastErr: TransientError | null = null;
      for (let a = 0; a < ATTEMPT_GAPS.length; a++) {
        if (a > 0) {
          // honor the server's pacing hint over our own backoff when given
          const hint = lastErr?.retryAfterMs ?? 0;
          await sleep(Math.max(ATTEMPT_GAPS[a], hint));
        }
        try {
          return await withTimeout(this.attempt(text, voice), ATTEMPT_TIMEOUT);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          // permanent client-side failure (bad request / bad body) — stop
          if (/^narrate 4\d\d$/.test(msg) && !/^narrate 429$/.test(msg)) {
            throw e;
          }
          lastErr = e as TransientError;
        }
      }
      throw lastErr ?? new Error("narrate failed");
    })();
  }

  /** single-flight fetch — one request per (voice, text) at a time */
  private fetchOnce(text: string, voice: string): Promise<NarrationTrack> {
    const key = `${voice}::${text}`;
    let p = this.inflight.get(key);
    if (!p) {
      const raw = this.fetchWithPatience(text, voice);
      /* one promise, three jobs: dedupe (inflight), self-cleanup on
         settle, and a no-op rejection observer — a failed fetch must
         never surface as an unhandled "narrate 429" runtime error,
         even when every caller has already moved on. */
      p = raw.finally(() => {
        if (this.inflight.get(key) === p) this.inflight.delete(key);
      });
      p.catch(() => undefined);
      this.inflight.set(key, p);
    }
    return p;
  }

  getTrack(text: string, voice = "jam"): Promise<NarrationTrack> {
    const key = `${voice}::${text}`;
    let p = this.cache.get(key);
    if (!p) {
      p = this.fetchOnce(text, voice);
      this.cache.set(key, p);
      // drop failures so a later get() can start fresh
      p.catch(() => {
        if (this.cache.get(key) === p) this.cache.delete(key);
      });
    }
    return p;
  }

  async get(text: string, voice = "jam"): Promise<string> {
    return (await this.getTrack(text, voice)).url;
  }
}

export const narrationStore = new NarrationStore();
