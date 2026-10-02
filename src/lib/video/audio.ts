/* ------------------------------------------------------------------
   Scene audio manager — keeps one <audio> element per scene in sync
   with the video clock. Because the timeline is deterministic, seeking
   is just: pause everything → set currentTime → play the right one.
------------------------------------------------------------------- */

/** Calibrated base speech rate multiplier for calm, pedagogical university delivery
 *  (~115 WPM vs raw ~146 WPM TTS). Preserves pitch and gives students time to process. */
export const BASE_SPEECH_RATE = 0.83;

export class SceneAudio {
  private els: (HTMLAudioElement | null)[] = [];
  private urls = new Set<string>();
  public blocked = false;

  attach(i: number, url: string, dur: number): HTMLAudioElement | null {
    if (!Number.isFinite(dur) || dur <= 0) return null;
    const existing = this.els[i];
    if (existing) {
      if (existing.dataset.url === url) return existing;
      existing.pause();
      URL.revokeObjectURL?.(existing.src);
      this.els[i] = null;
    }
    const a = new Audio();
    a.preload = "auto";
    a.src = url;
    a.dataset.url = url;
    this.els[i] = a;
    this.urls.add(url);
    return a;
  }

  has(i: number): boolean {
    return !!this.els[i];
  }

  duration(i: number): number {
    const a = this.els[i];
    const raw = a && Number.isFinite(a.duration) ? a.duration : 0;
    return raw / BASE_SPEECH_RATE;
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
    muted: boolean
  ): boolean {
    const a = this.els[i];
    if (!a) {
      this.pauseOthers(-1);
      return false;
    }
    this.pauseOthers(i);
    const r = Math.max(0.4, Math.min(2.5, BASE_SPEECH_RATE * rate));
    if (a.playbackRate !== r) a.playbackRate = r;
    a.muted = muted;
    const rawDur = Number.isFinite(a.duration) ? a.duration : 0;
    const effectiveDur = rawDur / BASE_SPEECH_RATE;
    const wantSound = playing && !muted && effectiveDur > 0 && offset < effectiveDur - 0.02;
    if (!wantSound) {
      if (!a.paused) a.pause();
      if (playing) a.currentTime = Math.min(offset * BASE_SPEECH_RATE, Math.max(0, rawDur - 0.05));
      return false;
    }
    const audioTarget = offset * BASE_SPEECH_RATE;
    const drift = a.currentTime - audioTarget;
    if (Math.abs(drift) > 0.12) {
      try {
        a.currentTime = Math.min(audioTarget, Math.max(0, rawDur - 0.05));
      } catch {
        /* not loaded yet */
      }
    }
    if (a.paused) {
      const p = a.play();
      if (p && typeof p.catch === "function") {
        p.catch((err: unknown) => {
          if ((err as DOMException)?.name === "NotAllowedError") {
            this.blocked = true;
          }
        });
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
