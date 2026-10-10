"use client";

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
  private cache = new Map<string, Promise<string>>();
  private inflight = new Map<string, Promise<string>>();

  private async attempt(text: string, voice: string, audioKey?: string): Promise<string> {
    const r = await fetch(audioKey ? `/api/narrate/${audioKey}` : "/api/narrate", audioKey ? {
      cache: "no-store",
    } : {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice }),
    });
    if (r.status === 429 || r.status >= 500 || (audioKey && r.status === 404)) {
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
    const blob = await r.blob();
    if (!blob.type.startsWith("audio")) {
      throw new Error("narrate returned non-audio");
    }
    return URL.createObjectURL(blob);
  }

  private fetchWithPatience(text: string, voice: string, audioKey?: string): Promise<string> {
    return (async () => {
      let lastErr: TransientError | null = null;
      for (let a = 0; a < ATTEMPT_GAPS.length; a++) {
        if (a > 0) {
          // honor the server's pacing hint over our own backoff when given
          const hint = lastErr?.retryAfterMs ?? 0;
          await sleep(Math.max(ATTEMPT_GAPS[a], hint));
        }
        try {
          return await withTimeout(this.attempt(text, voice, audioKey), ATTEMPT_TIMEOUT);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          // permanent client-side failure (bad request / bad body) — stop
          if (/^narrate 4\d\d$/.test(msg) && !/^narrate 429$/.test(msg) && !(audioKey && msg === "narrate 404")) {
            throw e;
          }
          lastErr = e as TransientError;
        }
      }
      throw lastErr ?? new Error("narrate failed");
    })();
  }

  /** single-flight fetch — one request per (voice, text) at a time */
  private fetchOnce(text: string, voice: string, audioKey?: string): Promise<string> {
    const key = audioKey ?? `${voice}::${text}`;
    let p = this.inflight.get(key);
    if (!p) {
      const raw = this.fetchWithPatience(text, voice, audioKey);
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

  get(text: string, voice = "jam", audioKey?: string): Promise<string> {
    const key = audioKey ?? `${voice}::${text}`;
    let p = this.cache.get(key);
    if (!p) {
      p = this.fetchOnce(text, voice, audioKey);
      this.cache.set(key, p);
      // drop failures so a later get() can start fresh
      p.catch(() => {
        if (this.cache.get(key) === p) this.cache.delete(key);
      });
    }
    return p;
  }
}

export const narrationStore = new NarrationStore();
