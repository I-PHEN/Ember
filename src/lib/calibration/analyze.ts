/* ------------------------------------------------------------------
   Handwriting calibration — frame-difference analysis.
   Deterministic: consumes grayscale frames (from an ffmpeg rawvideo
   pipe driven by scripts/calibration/measure-handwriting.ts) and
   produces pen-motion metrics. Tracked because tests and the fitting
   pass import it.
------------------------------------------------------------------- */

export interface AnalyzeOptions {
  /** per-pixel |Δ| above this counts as changed */
  diffThreshold?: number;
  /** changed pixels above this = a writing frame */
  minChanged?: number;
  /** consecutive non-writing frames that split a burst */
  burstGapFrames?: number;
  /** cap-height estimate clamp in px (a text line is never taller) */
  capSpanClamp?: number;
}

export interface PauseEvent {
  t: number;
  dur: number;
  kind: "line" | "hold";
}

export interface HandwritingMetrics {
  fps: number;
  frameW: number;
  frameH: number;
  totalFrames: number;
  writingFrames: number;
  /** median vertical span of per-frame new ink — the cap-height proxy */
  capHeightPx: number;
  /** writing frames ÷ frames inside ±15 s windows around bursts */
  dutyCycle: number;
  /** centroid speeds across consecutive writing frames (px/s) */
  speedsPxPerSec: number[];
  pauses: PauseEvent[];
}

export function percentile(xs: number[], p: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const idx = (p / 100) * (s.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

interface Event {
  t: number;
  writing: boolean;
  cx: number;
  cy: number;
  changed: number;
  rowSpan: number;
}

interface Burst {
  startT: number;
  endT: number;
  writing: number;
  lastCx: number;
  lastCy: number;
}

export class FrameAnalyzer {
  private opts: Required<AnalyzeOptions>;
  private prev: Uint8Array | null = null;
  private events: Event[] = [];
  private bursts: Burst[] = [];
  private cur: Burst | null = null;
  private idleRun = 0;
  private frameNo = -1;

  constructor(
    private w: number,
    private h: number,
    private fps: number,
    opts: AnalyzeOptions = {}
  ) {
    this.opts = {
      diffThreshold: opts.diffThreshold ?? 15,
      minChanged: opts.minChanged ?? 25,
      burstGapFrames: opts.burstGapFrames ?? 3,
      capSpanClamp: opts.capSpanClamp ?? Math.round(h / 3),
    };
  }

  push(frame: Uint8Array): void {
    this.frameNo++;
    const t = this.frameNo / this.fps;
    if (this.prev === null) {
      this.prev = frame;
      return;
    }
    let changed = 0;
    let sx = 0;
    let sy = 0;
    let minRow = this.h;
    let maxRow = 0;
    for (let y = 0; y < this.h; y++) {
      const row = y * this.w;
      for (let x = 0; x < this.w; x++) {
        const i = row + x;
        const d = Math.abs(frame[i] - this.prev[i]);
        if (d > this.opts.diffThreshold) {
          changed++;
          sx += x;
          sy += y;
          if (y < minRow) minRow = y;
          if (y > maxRow) maxRow = y;
        }
      }
    }
    this.prev = frame;
    const writing = changed >= this.opts.minChanged;
    const ev: Event = {
      t,
      writing,
      cx: changed ? sx / changed : NaN,
      cy: changed ? sy / changed : NaN,
      changed,
      rowSpan: writing
        ? Math.min(maxRow - minRow + 1, this.opts.capSpanClamp)
        : 0,
    };
    this.events.push(ev);

    if (writing) {
      this.idleRun = 0;
      if (!this.cur) {
        this.cur = {
          startT: t,
          endT: t,
          writing: 1,
          lastCx: ev.cx,
          lastCy: ev.cy,
        };
        this.bursts.push(this.cur);
      } else {
        this.cur.endT = t;
        this.cur.writing++;
        this.cur.lastCx = ev.cx;
        this.cur.lastCy = ev.cy;
      }
    } else if (this.cur) {
      this.idleRun++;
      if (this.idleRun >= this.opts.burstGapFrames) this.cur = null;
    }
  }

  finish(): HandwritingMetrics {
    const writingEvents = this.events.filter((e) => e.writing);
    const capHeightPx = Math.max(
      2,
      Math.round(percentile(writingEvents.map((e) => e.rowSpan), 50))
    );

    /* speeds across consecutive writing frames inside one burst */
    const speedsPxPerSec: number[] = [];
    for (let i = 1; i < this.events.length; i++) {
      const a = this.events[i - 1];
      const b = this.events[i];
      if (!a.writing || !b.writing) continue;
      const d = Math.hypot(b.cx - a.cx, b.cy - a.cy);
      if (d > 2) speedsPxPerSec.push(d * this.fps);
    }

    /* pauses between bursts, classified by the vertical jump across
       them: a new writing line lands well below the previous one,
       a within-board hold does not */
    const pauses: PauseEvent[] = [];
    for (let b = 1; b < this.bursts.length; b++) {
      const prev = this.bursts[b - 1];
      const next = this.bursts[b];
      const dur = next.startT - prev.endT - 1 / this.fps;
      if (dur <= 0) continue;
      const dy = Math.abs(next.lastCy - prev.lastCy);
      pauses.push({
        t: prev.endT,
        dur,
        kind: dy > 2 * capHeightPx ? "line" : "hold",
      });
    }

    /* duty cycle over ±15 s windows around bursts (merged) */
    const windows: Array<[number, number]> = [];
    for (const b of this.bursts) {
      const w0 = Math.max(0, b.startT - 15);
      const w1 = b.endT + 15;
      const last = windows[windows.length - 1];
      if (last && w0 <= last[1]) last[1] = Math.max(last[1], w1);
      else windows.push([w0, w1]);
    }
    const totalT = windows.reduce((a, [s, e]) => a + (e - s), 0);
    const dutyCycle =
      totalT > 0
        ? Math.min(1, writingEvents.length / this.fps / totalT)
        : 0;

    return {
      fps: this.fps,
      frameW: this.w,
      frameH: this.h,
      totalFrames: this.frameNo + 1,
      writingFrames: writingEvents.length,
      capHeightPx,
      dutyCycle,
      speedsPxPerSec,
      pauses,
    };
  }
}
