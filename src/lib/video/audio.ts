/* ------------------------------------------------------------------
   Scene audio manager — keeps one <audio> element per scene in sync
   with the video clock. Because the timeline is deterministic, seeking
   is just: pause everything → set currentTime → play the right one.
------------------------------------------------------------------- */

/** Calibrated base speech rate multiplier for natural conversational lecture delivery
 *  (~140-155 WPM standard conversational speed). */
export const BASE_SPEECH_RATE = 1.0;

export class SceneAudio {
  private els: (HTMLAudioElement | null)[] = [];
  private urls = new Set<string>();
  private starting = new WeakSet<HTMLAudioElement>();
  private rates = new WeakMap<HTMLAudioElement, number>();
  private failures = new WeakSet<HTMLAudioElement>();
  public blocked = false;

  attach(i: number, url: string, dur: number, speechRate = BASE_SPEECH_RATE): HTMLAudioElement | null {
    if (!Number.isFinite(dur) || dur <= 0) return null;
    if (!Number.isFinite(speechRate) || speechRate <= 0) return null;
    const existing = this.els[i];
    if (existing) {
      if (existing.dataset.url === url) return existing;
      existing.pause();
      URL.revokeObjectURL?.(existing.src);
      this.els[i] = null;
    }
    const a = new Audio();
    a.addEventListener("error", () => this.failures.add(a));
    a.preload = "auto";
    a.src = url;
    a.dataset.url = url;
    this.els[i] = a;
    this.rates.set(a, speechRate);
    this.urls.add(url);
    return a;
  }

  has(i: number): boolean {
    return !!this.els[i];
  }

  failed(i: number): boolean {
    const a = this.els[i];
    return !!a && this.failures.has(a);
  }

  duration(i: number): number {
    const a = this.els[i];
    const raw = a && Number.isFinite(a.duration) ? a.duration : 0;
    return raw / (a ? this.rates.get(a) ?? BASE_SPEECH_RATE : BASE_SPEECH_RATE);
  }

  /** Audible position in board-clock seconds; null after speech's end. */
  clockTime(i: number): number | null {
    const a = this.els[i];
    if (!a) return null;
    if (!Number.isFinite(a.duration) || a.duration <= 0) return 0;
    if (a.currentTime >= a.duration - .02) return null;
    return a.currentTime / (this.rates.get(a) ?? BASE_SPEECH_RATE);
  }

  seek(i: number, offset: number): void {
    const a = this.els[i];
    if (!a) return;
    try { a.currentTime = Math.max(0, Math.min(offset * (this.rates.get(a) ?? BASE_SPEECH_RATE), Number.isFinite(a.duration) ? a.duration : Infinity)); }
    catch { /* metadata may still be loading; tick retries on startup */ }
  }

  /**
   * Called every frame (and after seeks / state changes).
   * Returns true if playback was blocked by the browser.
   */
  tick(
    i: number,
    offset: number,
    playing: boolean,
    rate: number,
    muted: boolean,
    audioMaster = false,
  ): boolean {
    const a = this.els[i];
    if (!a) {
      this.pauseOthers(-1);
      return false;
    }
    this.pauseOthers(i);
    const speechRate = this.rates.get(a) ?? BASE_SPEECH_RATE;
    const r = Math.max(0.1, Math.min(5, speechRate * rate));
    if (a.playbackRate !== r) a.playbackRate = r;
    a.muted = muted;
    const rawDur = Number.isFinite(a.duration) ? a.duration : 0;
    const effectiveDur = rawDur / speechRate;
    const wantSound = playing && !muted && effectiveDur > 0 && offset < effectiveDur - 0.02;
    if (!wantSound) {
      if (!a.paused) a.pause();
      if (playing && rawDur > 0) a.currentTime = Math.min(offset * speechRate, rawDur);
      return false;
    }
    const audioTarget = offset * speechRate;
    const drift = a.currentTime - audioTarget;
    if (Math.abs(drift) > 0.12 && (!audioMaster || (a.paused && !this.starting.has(a)))) {
      try {
        a.currentTime = Math.min(audioTarget, Math.max(0, rawDur - 0.05));
      } catch {
        /* not loaded yet */
      }
    }
    if (a.paused && !this.starting.has(a) && !this.blocked) {
      this.starting.add(a);
      try {
        const p = a.play();
        if (p && typeof p.catch === "function") {
          p.catch((err: unknown) => {
            if ((err as DOMException)?.name === "NotAllowedError") {
              this.blocked = true;
            } else if ((err as DOMException)?.name !== "AbortError") {
              this.failures.add(a);
            }
          }).finally(() => this.starting.delete(a));
        } else {
          this.starting.delete(a);
        }
      } catch (err) {
        this.starting.delete(a);
        if ((err as DOMException)?.name === "NotAllowedError") this.blocked = true;
        else if ((err as DOMException)?.name !== "AbortError") this.failures.add(a);
      }
    }
    return this.blocked;
  }

  pauseAll(): void {
    for (const a of this.els) a?.pause();
  }

  /** resume after the user interacts (autoplay unlock) */
  retry(): void {
    this.blocked = false;
  }

  dispose(): void {
    for (const a of this.els) {
      if (a) {
        a.pause();
        a.src = "";
      }
    }
    this.els = [];
    this.urls.clear();
  }

  private pauseOthers(except: number): void {
    this.els.forEach((a, k) => {
      if (a && k !== except && !a.paused) a.pause();
    });
  }
}
