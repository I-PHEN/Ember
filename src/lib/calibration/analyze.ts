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
  /** measured cap height in px — a visual anchor beats the row-span
   *  proxy (transition frames span multiple lines and pollute any
   *  percentile). Set by the driver; tests pin it. */
  capHeightOverride?: number;
}

export interface PauseEvent {
  t: number;
  dur: number;
  kind: "line" | "hold";
  /** pen travel across the pause: |burst_end_centroid − next_burst_start_centroid| */
  distPx: number;
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
  firstCx: number;
  firstCy: number;
  lastCx: number;
  lastCy: number;
  /** accumulated centroid travel across the burst's writing events */
  pathPx: number;
}

export class FrameAnalyzer {
  private opts: AnalyzeOptions & {
    diffThreshold: number;
    minChanged: number;
    burstGapFrames: number;
    capSpanClamp: number;
  };
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
      capHeightOverride: opts.capHeightOverride,
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
          firstCx: ev.cx,
          firstCy: ev.cy,
          lastCx: ev.cx,
          lastCy: ev.cy,
          pathPx: 0,
        };
        this.bursts.push(this.cur);
      } else {
        this.cur.endT = t;
        this.cur.writing++;
        this.cur.pathPx += Math.hypot(ev.cx - this.cur.lastCx, ev.cy - this.cur.lastCy);
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
    let capHeightPx: number;
    if (
      this.opts.capHeightOverride !== undefined &&
      Number.isFinite(this.opts.capHeightOverride) &&
      this.opts.capHeightOverride >= 2
    ) {
      capHeightPx = Math.round(this.opts.capHeightOverride);
    } else {
      /* fallback proxy from STRONG strokes only — a frame's new-ink
         sliver spans the letter body on near-vertical strokes; the
         median sliver underestimates, so P90; fragile either way,
         which is why the driver passes the measured anchor */
      const strongMin = Math.max(30, 3 * this.opts.minChanged);
      const strongSpans = writingEvents
        .filter((e) => e.changed >= strongMin)
        .map((e) => e.rowSpan);
      capHeightPx = Math.min(
        60,
        Math.max(
          5,
          Math.round(
            percentile(
              strongSpans.length >= 20
                ? strongSpans
                : writingEvents.map((e) => e.rowSpan),
              90
            )
          )
        )
      );
    }

    /* per-BURST speeds: accumulated centroid path ÷ burst wall time.
       Frame-level speeds are threshold-biased at high fps (light
       writing frames fall below minChanged and only fast frames
       register), which inflates the median; the burst integral is
       robust to missed frames. */
    const speedsPxPerSec: number[] = [];
    for (const b of this.bursts) {
      const dur = Math.max(b.endT - b.startT, 1 / this.fps);
      const speed = b.pathPx / dur;
      if (speed > 5) speedsPxPerSec.push(speed);
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
      const dy = Math.abs(next.firstCy - prev.lastCy);
      /* 1.5×cap: centroid drag from vanishing ink halves the apparent
         jump, so the threshold sits below the true 2-3-cap line pitch */
      pauses.push({
        t: prev.endT,
        dur,
        kind: dy > 1.5 * capHeightPx ? "line" : "hold",
        distPx: Math.hypot(next.firstCx - prev.lastCx, next.firstCy - prev.lastCy),
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
    /* duty from burst wall time — detected-frame counts are fps-biased */
    const burstT = this.bursts.reduce(
      (a, b) => a + (b.endT - b.startT + 1 / this.fps),
      0
    );
    const dutyCycle = totalT > 0 ? Math.min(1, burstT / totalT) : 0;

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
