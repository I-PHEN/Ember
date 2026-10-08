/** Frame clock excludes time spent paused, loading, or entering a new scene. */
export class PlaybackFrameClock {
  private previous: { now: number; scene: number; running: boolean } | null = null;
  reset(): void { this.previous = null; }
  /** Audio may start only after its scene has a runnable clock sample. */
  isRunningScene(scene: number): boolean {
    return this.previous?.scene === scene && this.previous.running;
  }
  elapsed(now: number, scene: number, running: boolean): number {
    const previous = this.previous;
    this.previous = { now, scene, running };
    return running && previous?.running && previous.scene === scene
      ? Math.max(0, (now - previous.now) / 1000) : 0;
  }
}
