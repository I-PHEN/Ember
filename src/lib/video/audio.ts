/* ------------------------------------------------------------------
   Scene audio manager — keeps one <audio> element per scene in sync
   with the video clock. Because the timeline is deterministic, seeking
   is just: pause everything → set currentTime → play the right one.
------------------------------------------------------------------- */

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
    return a && Number.isFinite(a.duration) ? a.duration : 0;
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
    const r = Math.max(0.5, Math.min(2, rate));
    if (a.playbackRate !== r) a.playbackRate = r;
    a.muted = muted;
    const dur = Number.isFinite(a.duration) ? a.duration : 0;
    const wantSound = playing && !muted && dur > 0 && offset < dur - 0.02;
    if (!wantSound) {
      if (!a.paused) a.pause();
      if (playing) a.currentTime = Math.min(offset, Math.max(0, dur - 0.05));
      return false;
    }
    const drift = a.currentTime - offset;
    if (Math.abs(drift) > 0.13) {
      try {
        a.currentTime = Math.min(offset, Math.max(0, dur - 0.05));
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
