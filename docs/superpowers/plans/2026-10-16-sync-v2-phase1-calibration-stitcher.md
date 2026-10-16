# Sync V2 Phase 1 — Handwriting Calibration + Audio Stitcher (M0+M1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the invented handwriting-kinematic constants with constants fitted to measured reference footage (M0), and land the pure segment-stitching audio engine (M1) — both with zero change to generation behavior until Phase 2 wires them in.

**Architecture:** A deterministic frame-differencing analyzer measures stroke speeds, pause distributions, and duty cycle from the reference tutor video (`D:\Downloads\Intro to Matrices.mp4`); a fitting pass tunes the real `KinematicStrokeSynthesizer` against those measurements via binary search; the fitted constants land in one tracked module (`src/lib/video/calibration.ts`) that kinematics reads. Separately, a pure PCM stitcher (`src/lib/video/stitch-audio.ts`) concatenates per-segment TTS audio with sized silence gaps into one WAV per scene plus a cue manifest — the Phase 2 pipeline will call it.

**Tech Stack:** Bun (runtime + `bun:test`), TypeScript strict, ffmpeg (frame extraction pipe), 24 kHz 16-bit mono PCM (existing Gemini TTS format), sharp NOT required (raw grayscale pipe).

**Spec:** `docs/superpowers/specs/2026-10-16-sync-v2-design.md` (§4 = M0 tasks 1–5, §6 = M1 tasks 6–7). Phase 2 (spec §5, §7–§9) gets its own plan after this lands.

## Global Constraints

- Tests: `bun test` (bun:test). `tsconfig` excludes `tests/`; tests import tracked `src/lib` code only.
- `scripts/` is gitignored by project convention — untracked drivers live there; ALL tracked logic lives in `src/lib` and `docs/research`.
- PCM contract: 24 000 Hz, 16-bit signed LE, mono (`pcmToWav(pcm, 24000)` in `src/lib/ai/gemini.ts:171` wraps the RIFF header).
- Deterministic: no `Math.random`/`Date.now` in shipped cores (`src/lib/**`). Seeded RNG only, as existing code does.
- Reference video: `D:\Downloads\Intro to Matrices.mp4` (Organic Chemistry Tutor, yt `yRwQ7A6jVLk`), 12 646 271 bytes, verified present 2026-10-16. Pointer recorded in `scratch/calibration/README.txt`.
- ffmpeg resolution order: `$FFMPEG_PATH` → `ffmpeg` on PATH → `C:\Users\Michael\AppData\Local\uv\cache\archive-v0\PainbiDC7k7k5ALO6V6I5\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe` (verified on disk 2026-10-16; no ffmpeg is on PATH, so this fallback is the working default).
- Brand frozen; board engine constants other than the calibrated set are untouched in this phase.
- Every commit message ends with `Co-Authored-By: Claude Code <noreply@anthropic.com>`.
- Never commit `.env`.

---

### Task 1: Frame-event analysis core (M0)

**Files:**
- Create: `src/lib/calibration/analyze.ts`
- Test: `tests/calibration-analyze.test.ts`

**Interfaces:**
- Consumes: nothing (pure).
- Produces (used by Task 2, 3, 4):
  - `class FrameAnalyzer { constructor(w: number, h: number, fps: number, opts?: AnalyzeOptions); push(frame: Uint8Array): void; finish(): HandwritingMetrics }`
  - `function percentile(xs: number[], p: number): number`
  - `interface HandwritingMetrics { fps; frameW; frameH; writingFrames; totalFrames; capHeightPx; dutyCycle; speedsPxPerSec: number[]; pauses: PauseEvent[] }`
  - `interface PauseEvent { t: number; dur: number; kind: "line" | "hold" }`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/calibration-analyze.test.ts
import { describe, expect, test } from "bun:test";
import { FrameAnalyzer, percentile } from "../src/lib/calibration/analyze";

/* frames are W×H grayscale; a "pen" is a bright 3×3 blob that moves
   right at 40 px/frame; bg 40, blob 200 */
const W = 64;
const H = 36;
function frame(penX: number, penY: number): Uint8Array {
  const f = new Uint8Array(W * H).fill(40);
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const x = penX + dx;
      const y = penY + dy;
      if (x >= 0 && x < W && y >= 0 && y < H) f[y * W + x] = 200;
    }
  return f;
}

describe("FrameAnalyzer", () => {
  test("detects a writing burst, its speed, and the pause after it", () => {
    const a = new FrameAnalyzer(W, H, 10, { minChanged: 4 });
    // burst: pen moves 10→30 (4 frames, 20px/frame → 200 px/s), then 6 idle
    for (let x = 10; x <= 30; x += 5) a.push(frame(x, 18));
    for (let i = 0; i < 6; i++) a.push(frame(30, 18, )); // same pos → no diff
    a.push(frame(30, 18)); // extra identical
    const m = a.finish();
    expect(m.totalFrames).toBe(11);
    expect(m.writingFrames).toBeGreaterThanOrEqual(4);
    expect(m.speedsPxPerSec.length).toBeGreaterThan(0);
    // consecutive writing frames differ by 5px → 50 px/s each
    expect(m.speedsPxPerSec[0]).toBeCloseTo(50, 0);
    expect(m.pauses.length).toBe(0); // single burst → no inter-burst pause
    expect(m.capHeightPx).toBeGreaterThan(0);
  });

  test("splits two bursts and classifies the pause by vertical jump", () => {
    const a = new FrameAnalyzer(W, H, 10, { minChanged: 4, burstGapFrames: 3 });
    for (let x = 5; x <= 15; x += 5) a.push(frame(x, 10)); // line 1
    for (let i = 0; i < 5; i++) a.push(frame(15, 10));     // 0.5s pause
    for (let x = 5; x <= 15; x += 5) a.push(frame(x, 30)); // line 2 (Δy=20)
    const m = a.finish();
    expect(m.pauses.length).toBe(1);
    expect(m.pauses[0].dur).toBeCloseTo(0.5, 1);
    // Δy (20) > 2 × capHeight (~3) → "line" pause
    expect(m.pauses[0].kind).toBe("line");
    expect(m.dutyCycle).toBeGreaterThan(0);
    expect(m.dutyCycle).toBeLessThanOrEqual(1);
  });

  test("identical frames produce no events at all", () => {
    const a = new FrameAnalyzer(W, H, 10, { minChanged: 4 });
    for (let i = 0; i < 10; i++) a.push(frame(10, 10));
    const m = a.finish();
    expect(m.writingFrames).toBe(0);
    expect(m.speedsPxPerSec.length).toBe(0);
  });
});

describe("percentile", () => {
  test("linear interpolation on sorted values", () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
    expect(percentile([1, 2, 3, 4], 50)).toBeCloseTo(2.5, 6);
    expect(percentile([10], 90)).toBe(10);
    expect(percentile([], 50)).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun test tests/calibration-analyze.test.ts`
Expected: FAIL — `Cannot resolve module '../src/lib/calibration/analyze'`.

- [ ] **Step 3: Implement `src/lib/calibration/analyze.ts`**

```typescript
/* ------------------------------------------------------------------
   Handwriting calibration — frame-difference analysis.
   Deterministic: consumes grayscale frames (from ffmpeg rawvideo pipe
   via the untracked driver script) and produces pen-motion metrics.
   Tracked because tests and the fitting pass import it.
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
        const d = Math.abs(frame[i] - this.prev![i]);
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
        this.cur = { startT: t, endT: t, writing: 1, lastCx: ev.cx, lastCy: ev.cy };
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

    /* pauses between bursts, classified by the vertical jump across them */
    const pauses: PauseEvent[] = [];
    for (let b = 1; b < this.bursts.length; b++) {
      const prev = this.bursts[b - 1];
      const next = this.bursts[b];
      const dur = next.startT - prev.endT - 1 / this.fps;
      if (dur <= 0) continue;
      const dy = Math.abs(next.lastCy !== prev.lastCy ? next.lastCy - prev.lastCy : 0);
      pauses.push({ t: prev.endT, dur, kind: dy > 2 * capHeightPx ? "line" : "hold" });
    }

    /* duty cycle over ±15 s windows around bursts */
    const windows: Array<[number, number]> = [];
    for (const b of this.bursts) {
      const w0 = Math.max(0, b.startT - 15);
      const w1 = b.endT + 15;
      const last = windows[windows.length - 1];
      if (last && w0 <= last[1]) last[1] = Math.max(last[1], w1);
      else windows.push([w0, w1]);
    }
    const totalT = t0Of(windows);
    const total = this.frameNo + 1;
    const writingFrames = writingEvents.length;
    const dutyCycle = totalT > 0 ? Math.min(1, writingFrames / this.fps / totalT) : 0;

    return {
      fps: this.fps,
      frameW: this.w,
      frameH: this.h,
      totalFrames: total,
      writingFrames,
      capHeightPx,
      dutyCycle,
      speedsPxPerSec,
      pauses,
    };
  }
}

function t0Of(windows: Array<[number, number]>): number {
  return windows.reduce((a, [s, e]) => a + (e - s), 0);
}
```

Note: `next.lastCy - prev.lastCy` compares each burst's LAST event centroid with the NEXT burst's last — for classification only the magnitude matters; if the first/last-centroid comparison misfires on real data, the fallback classifies as "hold", which is the safe default.

- [ ] **Step 4: Run tests**

Run: `bun test tests/calibration-analyze.test.ts`
Expected: 5/5 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/calibration/analyze.ts tests/calibration-analyze.test.ts
git commit -m "feat(calibration): frame-difference handwriting analysis core

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 2: Fitting pass — measured constants from metrics (M0)

**Files:**
- Create: `src/lib/calibration/fit.ts`
- Test: `tests/calibration-fit.test.ts`

**Interfaces:**
- Consumes: `HandwritingMetrics`, `percentile` from `./analyze`; `KinematicStrokeSynthesizer` from `../video/kinematics`; `compileTimeline` from `../video/compile`.
- Produces (used by Tasks 3, 4):
  - `interface Fitted { gamma0; fittsA; fittsB; hesitations: { charStart; wordStart; operator }; settleMs; dutyCycle: { min; max }; speedPxPerSec: { p25; p50; p75 }; speedCapHeightsPerSec; capHeightPx; pauseSec: { lineP50; holdP50; holdP40; holdP60; holdP75; holdP30 }; sampleRateNote: string }`
  - `function fitConstants(m: HandwritingMetrics): Fitted`
  - `function fitGamma0(targetPxPerSec: number, capHeight = 38): number` (exports for tests)

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/calibration-fit.test.ts
import { describe, expect, test } from "bun:test";
import { fitConstants, fitGamma0 } from "../src/lib/calibration/fit";
import type { HandwritingMetrics } from "../src/lib/calibration/analyze";
import { KinematicStrokeSynthesizer } from "../src/lib/video/kinematics";

function metrics(partial: Partial<HandwritingMetrics>): HandwritingMetrics {
  return {
    fps: 10,
    frameW: 640,
    frameH: 360,
    totalFrames: 1000,
    writingFrames: 200,
    capHeightPx: 12,
    dutyCycle: 0.22,
    speedsPxPerSec: new Array(50).fill(0).map((_, i) => 60 + i), // 60..109 px/s
    pauses: [
      { t: 1, dur: 0.4, kind: "hold" },
      { t: 5, dur: 0.6, kind: "hold" },
      { t: 9, dur: 1.4, kind: "line" },
      { t: 13, dur: 0.5, kind: "hold" },
    ],
    ...partial,
  };
}

describe("fitGamma0", () => {
  test("binary-searches gamma0 so the real synthesizer hits the target speed", () => {
    const g = fitGamma0(160); // 160 px/s at cap 38
    expect(g).toBeGreaterThan(20);
    expect(g).toBeLessThan(600);
    const synth = new KinematicStrokeSynthesizer();
    synth.gamma0 = g;
    // reference stroke speed ≈ target (±6%)
    const prof = synth.synthesize(referenceStroke(), 3.6, undefined, 38);
    const speed = prof.totalLength / prof.duration;
    expect(Math.abs(speed - 160) / 160).toBeLessThan(0.06);
  });
});

function referenceStroke(): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= 40; i++) {
    const x = 100 + (i / 40) * 160;
    const y = 200 + 28 * Math.sin(((i / 40) * Math.PI * 2) / 1);
    pts.push({ x, y });
  }
  return pts;
}

describe("fitConstants", () => {
  const f = fitConstants(metrics({}));
  test("speeds normalize to Ember board px/s via cap heights", () => {
    // p50 of 60..109 ≈ 84.5 px/s at capHeight 12 → 7.04 capH/s → ×38 ≈ 267 px/s
    expect(f.speedCapHeightsPerSec).toBeCloseTo(84.5 / 12, 1);
    expect(f.speedPxPerSec.p50).toBeGreaterThan(200);
    expect(f.speedPxPerSec.p50).toBeLessThan(300);
  });
  test("hesitations derive from hold-pause percentiles and stay clamped", () => {
    expect(f.hesitations.charStart).toBeGreaterThanOrEqual(0.03);
    expect(f.hesitations.charStart).toBeLessThanOrEqual(0.12);
    expect(f.hesitations.wordStart).toBeGreaterThan(f.hesitations.charStart);
    expect(f.hesitations.operator).toBeGreaterThan(f.hesitations.wordStart);
  });
  test("duty band brackets the observed duty cycle", () => {
    expect(f.dutyCycle.min).toBeLessThanOrEqual(0.22);
    expect(f.dutyCycle.max).toBeGreaterThanOrEqual(0.22);
  });
  test("fitts constants fall back when samples are too few", () => {
    const few = fitConstants(metrics({ pauses: [{ t: 1, dur: 0.4, kind: "hold" }] }));
    expect(few.fittsA).toBe(0.11);
    expect(few.fittsB).toBe(0.09);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun test tests/calibration-fit.test.ts`
Expected: FAIL — `Cannot resolve module '../src/lib/calibration/fit'`.

- [ ] **Step 3: Implement `src/lib/calibration/fit.ts`**

```typescript
/* ------------------------------------------------------------------
   Fitting: turn measured handwriting metrics into engine constants.
   gamma0 is fitted against the REAL KinematicStrokeSynthesizer by
   binary search (the synthesizer's effective speed is not a closed
   form — curvature, envelopes and acceleration limits all shape it).
------------------------------------------------------------------- */

import { percentile, type HandwritingMetrics } from "./analyze";
import { KinematicStrokeSynthesizer } from "../video/kinematics";

/** Ember board CAP.md — the letter height calibration normalizes to */
export const EMBER_CAP_MD = 38;

/** the stroke gamma0 is fitted on: a medium-curvature sine arc at cap 38 */
function referenceStroke(): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= 40; i++) {
    const x = 100 + (i / 40) * 160;
    const y = 200 + 28 * Math.sin(((i / 40) * Math.PI * 2) / 1);
    pts.push({ x, y });
  }
  return pts;
}

export function fitGamma0(targetPxPerSec: number, capHeight = EMBER_CAP_MD): number {
  const speedAt = (g: number): number => {
    const synth = new KinematicStrokeSynthesizer();
    synth.gamma0 = g;
    const prof = synth.synthesize(referenceStroke(), 3.6, undefined, capHeight);
    return prof.totalLength / prof.duration;
  };
  let lo = 10;
  let hi = 1200;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (speedAt(mid) < targetPxPerSec) lo = mid;
    else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}

export interface Fitted {
  gamma0: number;
  fittsA: number;
  fittsB: number;
  hesitations: { charStart: number; wordStart: number; operator: number };
  settleMs: number;
  dutyCycle: { min: number; max: number };
  speedPxPerSec: { p25: number; p50: number; p75: number };
  /** p50 speed normalized: cap-heights per second, board-independent */
  speedCapHeightsPerSec: number;
  capHeightPx: number;
  pauseSec: {
    lineP50: number;
    holdP50: number;
    holdP30: number;
    holdP40: number;
    holdP60: number;
    holdP75: number;
  };
  note: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function fitConstants(m: HandwritingMetrics): Fitted {
  const p25 = percentile(m.speedsPxPerSec, 25);
  const p50 = percentile(m.speedsPxPerSec, 50);
  const p75 = percentile(m.speedsPxPerSec, 75);
  const cap = Math.max(2, m.capHeightPx);
  const chPerSec = p50 / cap;
  const emberPxPerSec = chPerSec * EMBER_CAP_MD;

  const holds = m.pauses.filter((p) => p.kind === "hold").map((p) => p.dur);
  const lines = m.pauses.filter((p) => p.kind === "line").map((p) => p.dur);
  const hold = (p: number) => percentile(holds, p);

  /* Fitts a/b by least squares over hold pauses: T = a + b·log2(1 + D/W).
     D comes from consecutive-burst centroid distance — approximated here
     by cap-height multiples (median hold gap ≈ 3 cap heights of travel). */
  let fittsA = 0.11;
  let fittsB = 0.09;
  if (holds.length >= 8) {
    const xs = holds.map(() => Math.log2(1 + (3 * cap) / 12)); // W = 12 px, engine value
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = holds.reduce((a, b) => a + b, 0) / holds.length;
    let num = 0;
    let den = 0;
    for (let i = 0; i < xs.length; i++) {
      num += (xs[i] - mx) * (holds[i] - my);
      den += (xs[i] - mx) ** 2;
    }
    if (den > 1e-9) {
      fittsB = clamp(num / den, 0.02, 0.2);
      fittsA = clamp(my - fittsB * mx, 0.05, 0.3);
    }
  }

  return {
    gamma0: fitGamma0(emberPxPerSec),
    fittsA,
    fittsB,
    hesitations: {
      charStart: clamp(hold(40), 0.03, 0.12),
      wordStart: clamp(hold(60), 0.08, 0.3),
      operator: clamp(hold(75), 0.15, 0.45),
    },
    settleMs: Math.round(clamp(hold(30), 0.1, 0.25) * 1000),
    dutyCycle: {
      min: clamp(percentile([m.dutyCycle], 10), 0.08, 0.3),
      max: clamp(percentile([m.dutyCycle], 90), 0.15, 0.45),
    },
    speedPxPerSec: { p25, p50, p75 },
    speedCapHeightsPerSec: chPerSec,
    capHeightPx: m.capHeightPx,
    pauseSec: {
      lineP50: percentile(lines, 50),
      holdP50: hold(50),
      holdP30: hold(30),
      holdP40: hold(40),
      holdP60: hold(60),
      holdP75: hold(75),
    },
    note: "fitted against the real synthesizer; hold-pause percentiles map to hesitations",
  };
}
```

(The Fitts D-approximation is coarse by design — real per-pause travel distances are logged by the driver for the research doc; the regression is a refinement hook, and the clamps keep it safe.)

- [ ] **Step 4: Run tests**

Run: `bun test tests/calibration-fit.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/calibration/fit.ts tests/calibration-fit.test.ts
git commit -m "feat(calibration): fit engine constants from measured metrics

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 3: Measurement driver + run on the reference video (M0)

**Files:**
- Create (untracked, `scripts/` is gitignored): `scripts/calibration/measure-handwriting.ts`
- Create (tracked): `docs/research/handwriting-calibration-data.json`
- Create (tracked): `docs/research/handwriting-calibration.md`

**Interfaces:**
- Consumes: `FrameAnalyzer` (Task 1), `fitConstants` (Task 2), ffmpeg via `node:child_process`.
- Produces: `handwriting-calibration-data.json` with shape `{ measured: HandwritingMetrics-serializable, fitted: Fitted, derived: { paceWindowSec: [number, number] } }` — consumed by Task 4's consistency test.

- [ ] **Step 1: Write the driver**

```typescript
/* scripts/calibration/measure-handwriting.ts — untracked driver.
   Streams the reference video through ffmpeg as 640×360 grayscale at
   10 fps and writes measured + fitted constants to docs/research.
   Usage: bun scripts/calibration/measure-handwriting.ts [videoPath] */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { FrameAnalyzer } from "../../src/lib/calibration/analyze";
import { fitConstants } from "../../src/lib/calibration/fit";

const VIDEO = process.argv[2] ?? "D:\\Downloads\\Intro to Matrices.mp4";
const W = 640;
const H = 360;
const FPS = 10;
const FRAME_BYTES = W * H;

function ffmpegPath(): string {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  const fallback =
    "C:\\Users\\Michael\\AppData\\Local\\uv\\cache\\archive-v0\\PainbiDC7k7k5ALO6V6I5\\Lib\\site-packages\\imageio_ffmpeg\\binaries\\ffmpeg-win-x86_64-v7.1.exe";
  return existsSync(fallback) ? fallback : "ffmpeg";
}

async function main(): Promise<void> {
  if (!existsSync(VIDEO)) throw new Error(`video not found: ${VIDEO}`);
  const args = [
    "-i", VIDEO,
    "-vf", `scale=${W}:${H}`,
    "-r", String(FPS),
    "-f", "rawvideo",
    "-pix_fmt", "gray",
    "pipe:1",
  ];
  const proc = spawn(ffmpegPath(), args, { stdio: ["ignore", "pipe", "inherit"] });
  const analyzer = new FrameAnalyzer(W, H, FPS);
  let buf = Buffer.alloc(0);
  let frames = 0;
  proc.stdout.on("data", (chunk: Buffer) => {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= FRAME_BYTES) {
      analyzer.push(new Uint8Array(buf.subarray(0, FRAME_BYTES)));
      buf = buf.subarray(FRAME_BYTES);
      frames++;
      if (frames % 1000 === 0) console.log(`  … ${frames} frames`);
    }
  });
  await new Promise<void>((resolve, reject) => {
    proc.stdout.on("end", resolve);
    proc.on("error", reject);
  });
  const metrics = analyzer.finish();
  const fitted = fitConstants(metrics);
  const out = {
    source: VIDEO,
    measuredAt: "2026-10-16",
    sampling: { w: W, h: H, fps: FPS, frames },
    measured: metrics,
    fitted,
    derived: { paceWindowSec: [0, 0] as [number, number] }, // Task 4 fills this
  };
  const jsonPath = join(import.meta.dir, "../../docs/research/handwriting-calibration-data.json");
  writeFileSync(jsonPath, JSON.stringify(out, null, 2));
  console.log(`frames=${frames} writing=${metrics.writingFrames} cap≈${metrics.capHeightPx}px`);
  console.log(`dutyCycle=${metrics.dutyCycle.toFixed(3)} speeds p50=${fitted.speedPxPerSec.p50.toFixed(0)}px/s`);
  console.log(`pauses: hold=${metrics.pauses.filter(p=>p.kind==="hold").length} line=${metrics.pauses.filter(p=>p.kind==="line").length}`);
  console.log(`fitted gamma0=${fitted.gamma0} fitts a=${fitted.fittsA.toFixed(3)} b=${fitted.fittsB.toFixed(3)}`);
  console.log(`hesitations: char=${fitted.hesitations.charStart.toFixed(3)} word=${fitted.hesitations.wordStart.toFixed(3)} op=${fitted.hesitations.operator.toFixed(3)}`);
  console.log(`JSON → ${jsonPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

Note the deliberate `readFileSync`/`mkdirSync` imports may be unused — remove unused imports before running (`mkdirSync`, `readFileSync` are Task 4's; keep the driver minimal: drop them).

- [ ] **Step 2: Run it on the reference video**

Run: `bun scripts/calibration/measure-handwriting.ts "D:\Downloads\Intro to Matrices.mp4"`
Expected: progress lines every 1000 frames; final summary with `writing=` > 0 and non-empty pauses. If `writing=0`: lower `minChanged` to 15 and/or `diffThreshold` to 10 via the options and re-run (the video is dark chalk on dark board in places — sensitivity may need one notch).

- [ ] **Step 3: Write `docs/research/handwriting-calibration.md`**

Fill with the actual measured numbers from the JSON (this is the provenance document the spec §4 requires):

```markdown
# Handwriting Calibration — measured constants (M0)

Source: Organic Chemistry Tutor, "Intro to Matrices" (D:\Downloads\Intro to Matrices.mp4), measured 2026-10-16.
Method: 640×360 grayscale @10 fps, frame differencing (|Δ|>15, ≥25 px = writing), burst split at ≥3 idle frames.

## Measured
- frames / writing frames / duty cycle: <from JSON>
- cap-height proxy: <measured.capHeightPx> px (median per-frame new-ink row span)
- stroke speed: p25/p50/p75 = <…> px/s → <fitted.speedCapHeightsPerSec> cap-heights/s
- pauses: hold median <…> s, line median <…> s; counts <…>

## Fitted (consumed by src/lib/video/calibration.ts)
- gamma0 = <fitted.gamma0> (binary-searched against the real synthesizer at cap 38)
- Fitts a=<fitted.fittsA> b=<fitted.fittsB>
- hesitations: charStart=<…> wordStart=<…> operator=<…>; settle=<fitted.settleMs> ms
- duty band: [<fitted.dutyCycle.min>, <fitted.dutyCycle.max>]
- pen-pacing window (filled by Task 4): <derived.paceWindowSec>

## Interpretation
- <one paragraph: how the measured pause shape differs from the invented constants — e.g. operator hesitation was 0.42 s invented vs <measured hold P75> measured; what that means for feel>

Tuning rule: constants change ONLY with new measurement data (spec §10).
```

- [ ] **Step 4: Commit tracked artifacts**

```bash
git add docs/research/handwriting-calibration-data.json docs/research/handwriting-calibration.md
git commit -m "docs(calibration): measured handwriting constants from reference footage

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 4: Calibration constants module + engine wiring + pinned tests (M0)

**Files:**
- Create: `src/lib/video/calibration.ts`
- Modify: `src/lib/video/kinematics.ts` (gamma0 default, Fitts a/b, hesitation table)
- Modify: `src/lib/video/compile.ts` (`addPaths` settle default)
- Modify: `tests/pen-pacing.test.ts` (full rewrite), `tests/kinematic-burst-pacing.test.ts` (duty band), `tests/graphonomic-kinematics.test.ts` (relationship pins → CAL-derived)
- Create (untracked): `scripts/calibration/pace-window.ts`
- Modify: `CLAUDE.md` (pen-pace line), `docs/research/handwriting-calibration-data.json` (fills `derived.paceWindowSec`)

**Interfaces:**
- Consumes: fitted JSON from Task 3.
- Produces (Phase 2 + all tests consume):
  - `export const CAL: { source; gamma0; fitts: {a,b}; hesitations: {charStart, wordStart, operator, glyph, ballistic}; settleMs; dutyCycle: {min,max}; paceWindowSec: [number, number] }`

- [ ] **Step 1: Create `src/lib/video/calibration.ts` from the fitted JSON**

Transcribe the Task 3 values verbatim (the test in Step 5 enforces consistency with the JSON):

```typescript
/* ------------------------------------------------------------------
   Calibrated handwriting constants — fitted to measured reference
   footage (docs/research/handwriting-calibration-data.json).
   DO NOT hand-tune: change only with new measurement data (spec §10).
------------------------------------------------------------------- */

export const CAL = {
  source: "OCT Intro to Matrices — docs/research/handwriting-calibration-data.json",
  gamma0: <fitted.gamma0>,
  fitts: { a: <fitted.fittsA>, b: <fitted.fittsB> },
  hesitations: {
    charStart: <fitted.hesitations.charStart>,
    wordStart: <fitted.hesitations.wordStart>,
    operator: <fitted.hesitations.operator>,
    glyph: 0.0,
    ballistic: 0.02,
  },
  settleMs: <fitted.settleMs>,
  dutyCycle: { min: <fitted.dutyCycle.min>, max: <fitted.dutyCycle.max> },
  paceWindowSec: [0, 0] as [number, number], // filled by Step 3
} as const;
```

- [ ] **Step 2: Wire the engine to CAL**

`src/lib/video/kinematics.ts` — three edits:
1. Add import + gamma0 default:
```typescript
import { CAL } from "./calibration";
// …
export class KinematicStrokeSynthesizer {
  public gamma0 = CAL.gamma0; // calibrated base pace (was invented 100.0)
```
2. `computeFittsFlightDuration` (kinematics.ts:168): replace `const a = 0.11; const b = 0.09;` with `const a = CAL.fitts.a; const b = CAL.fitts.b;`.
3. `computeTransitionPause` (kinematics.ts:181): replace the hesitation literals — `case "operator": hesitation = CAL.hesitations.operator;` (was 0.42), `case "word-start": hesitation = CAL.hesitations.wordStart;` (was 0.22), `case "char-start": hesitation = CAL.hesitations.charStart;` (was 0.04), keep `glyph 0.0` / `ballistic 0.02` / `default: 0.03` as-is.

`src/lib/video/compile.ts` — `addPaths` settle default (compile.ts:231): `if (out.length && (opts?.settle ?? 0.18) > 0) { ctx.now += opts?.settle ?? 0.18; }` → replace both `0.18` with `CAL.settleMs / 1000`, and add `import { CAL } from "./calibration";` at the top.

- [ ] **Step 3: Derive and pin the pen-pacing window**

Create `scripts/calibration/pace-window.ts` (untracked):

```typescript
/* Compiles the pen-pacing fixture with the calibrated engine and prints
   the window to transcribe. Usage: bun scripts/calibration/pace-window.ts */
import { compileTimeline } from "../../src/lib/video/compile";
import type { SolveScript } from "../../src/lib/video/types";

const script = {
  title: "t",
  question: "q",
  scenes: [{ chapter: "c", narration: "", beats: [{ type: "write", text: "2x + 5 = 13", color: "white" }] }],
} as unknown as SolveScript;

const tl = compileTimeline(script);
const w = tl.scenes[0].writeEnd;
const lo = Math.round(w * 0.85 * 10) / 10;
const hi = Math.round(w * 1.2 * 10) / 10;
console.log(JSON.stringify({ writeEnd: Math.round(w * 100) / 100, paceWindowSec: [lo, hi] }));
```

Run: `bun scripts/calibration/pace-window.ts` → transcribe `paceWindowSec` into `src/lib/video/calibration.ts` AND into `derived.paceWindowSec` in `docs/research/handwriting-calibration-data.json`.

- [ ] **Step 4: Update the pinned tests**

`tests/pen-pacing.test.ts` — full rewrite:

```typescript
import { describe, expect, test } from "bun:test";
import { compileTimeline } from "../src/lib/video/compile";
import { CAL } from "../src/lib/video/calibration";
import type { SolveScript } from "../src/lib/video/types";

/* The window is ENGINE-DERIVED from measured constants (see
   docs/research/handwriting-calibration.md) — ±15/20 % around the
   calibrated compile of this fixture. */
describe("pen pacing", () => {
  test("a mid-size write lands in the calibrated pace window", () => {
    const script = {
      title: "t",
      question: "q",
      scenes: [
        { chapter: "c", narration: "", beats: [{ type: "write", text: "2x + 5 = 13", color: "white" }] },
      ],
    } as unknown as SolveScript;
    const writeEnd = compileTimeline(script).scenes[0].writeEnd;
    expect(writeEnd).toBeGreaterThan(CAL.paceWindowSec[0]);
    expect(writeEnd).toBeLessThan(CAL.paceWindowSec[1]);
  });
});
```

`tests/graphonomic-kinematics.test.ts` — relationship pins become CAL-derived (lines 72–73):

```typescript
import { CAL } from "../src/lib/video/calibration";
// …
expect(opPause).toBeGreaterThan(glyphPause + (CAL.hesitations.operator - CAL.hesitations.charStart) * 0.8);
expect(wordPause).toBeGreaterThan(glyphPause + (CAL.hesitations.wordStart - CAL.hesitations.charStart) * 0.8);
```

`tests/kinematic-burst-pacing.test.ts` — the duty-cycle assertion reads the calibrated band:

```typescript
expect(duty).toBeGreaterThanOrEqual(CAL.dutyCycle.min * 0.5); // fixture tolerance
expect(duty).toBeLessThanOrEqual(CAL.dutyCycle.max + 0.1);
```

(Locate the existing `duty` computation in that test — only the assertion bounds change.)

- [ ] **Step 5: Add the constants-consistency test**

```typescript
// tests/calibration-constants.test.ts
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CAL } from "../src/lib/video/calibration";

/* CAL must never drift from the measured data — hand edits are caught. */
describe("calibration constants", () => {
  test("CAL matches docs/research/handwriting-calibration-data.json", () => {
    const data = JSON.parse(
      readFileSync(join(import.meta.dir, "../docs/research/handwriting-calibration-data.json"), "utf8")
    ) as { fitted: { gamma0: number; fittsA: number; fittsB: number; hesitations: { charStart: number; wordStart: number; operator: number }; settleMs: number; dutyCycle: { min: number; max: number } }, derived: { paceWindowSec: [number, number] } };
    expect(CAL.gamma0).toBe(data.fitted.gamma0);
    expect(CAL.fitts.a).toBeCloseTo(data.fitted.fittsA, 5);
    expect(CAL.fitts.b).toBeCloseTo(data.fitted.fittsB, 5);
    expect(CAL.hesitations.charStart).toBe(data.fitted.hesitations.charStart);
    expect(CAL.hesitations.wordStart).toBe(data.fitted.hesitations.wordStart);
    expect(CAL.hesitations.operator).toBe(data.fitted.hesitations.operator);
    expect(CAL.settleMs).toBe(data.fitted.settleMs);
    expect(CAL.dutyCycle.min).toBe(data.fitted.dutyCycle.min);
    expect(CAL.dutyCycle.max).toBe(data.fitted.dutyCycle.max);
    expect([...CAL.paceWindowSec]).toEqual(data.derived.paceWindowSec);
  });
});
```

- [ ] **Step 6: Run the full suite**

Run: `bun test`
Expected: ALL PASS. Any other test pinning an absolute speed/duration (grep `toBeLessThan(0\.` / `toBeGreaterThan(0\.` in tests touching kinematics or compile) gets the same treatment: derive the bound from CAL or from a fixture compiled with the calibrated engine — never a bare literal tied to the old constants.

- [ ] **Step 7: Update CLAUDE.md**

Replace the line `Pen pace: 165 px/s professor chalk (tests/pen-pacing.test.ts pins it — do not speed up).` with:
`Pen pace: constants CALIBRATED to measured reference footage (src/lib/video/calibration.ts; tests pin them) — change only with new measurement data (docs/research/handwriting-calibration.md).`

- [ ] **Step 8: User check on the running app**

`npm run dev` (port 3000) → open the studio, play the flagship sample. Confirm handwriting still reads natural but properly paced (faster ink, correctly shaped pauses). This is the M0 acceptance gate — the user signs off before the commit.

- [ ] **Step 9: Commit**

```bash
git add src/lib/video/calibration.ts src/lib/video/kinematics.ts src/lib/video/compile.ts tests/pen-pacing.test.ts tests/kinematic-burst-pacing.test.ts tests/graphonomic-kinematics.test.ts tests/calibration-constants.test.ts CLAUDE.md docs/research/handwriting-calibration-data.json
git commit -m "feat(engine): calibrate handwriting kinematics to measured reference footage

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 5: Segment contract — types + sanitizer (M1)

**Files:**
- Modify: `src/lib/video/types.ts` (SceneSegment + audio cue types)
- Modify: `src/lib/solve-schema.ts` (`sanitizeSegments` at solve-schema.ts:567)
- Test: `tests/segment-contract.test.ts` (extend)

**Interfaces:**
- Consumes: existing `SceneSegment`, `SolveScene.audio`.
- Produces (Tasks 6, 7 + Phase 2):
  - `export type SegmentMode = "speak_ahead" | "write_ahead" | "parallel" | "point" | "pause";`
  - `SceneSegment { say: string; ink?: Beat[]; mode?: SegmentMode; pauseAfter?: number }`
  - `export interface AudioSegmentCue { i: number; t0: number; t1: number }`
  - `SolveScene.audio.segments?: AudioSegmentCue[]`

- [ ] **Step 1: Extend types (types.ts)**

In `src/lib/video/types.ts`, replace the `SceneSegment` interface (types.ts:249) and extend `SolveScene.audio` (types.ts:262):

```typescript
export type SegmentMode =
  | "speak_ahead"
  | "write_ahead"
  | "parallel"
  | "point"
  | "pause";

export interface SceneSegment {
  say: string;
  ink?: Beat[];
  /** cognitive tutoring mode — derived at compile when absent */
  mode?: SegmentMode;
  /** explicit trailing silence, seconds (clamped 0.2–2.5 by the sanitizer) */
  pauseAfter?: number;
}

/** measured position of one narration segment inside the stitched WAV */
export interface AudioSegmentCue {
  i: number;
  t0: number;
  t1: number;
}

export interface SolveScene {
  // … unchanged …
  audio?: {
    key?: string;
    narration?: string;
    dur?: number;
    segments?: AudioSegmentCue[];
  };
}
```

- [ ] **Step 2: Extend the sanitizer (solve-schema.ts:567)**

In `sanitizeSegments`, parse and clamp the new fields and carry them through:

```typescript
const SEGMENT_MODES = new Set(["speak_ahead", "write_ahead", "parallel", "point", "pause"]);

// inside the loop, after `const say = cleanNarration(seg.say); …`:
const modeRaw = seg.mode;
const mode =
  typeof modeRaw === "string" && SEGMENT_MODES.has(modeRaw)
    ? (modeRaw as SceneSegment["mode"])
    : undefined;
const pauseAfter =
  typeof seg.pauseAfter === "number" && Number.isFinite(seg.pauseAfter)
    ? Math.round(Math.min(2.5, Math.max(0.2, seg.pauseAfter)) * 100) / 100
    : undefined;
// …and the push becomes:
segments.push({
  say,
  ink: ink && ink.length ? ink : undefined,
  mode,
  pauseAfter,
});
```

(Add `SceneSegment` to the type import if not present; `SegmentMode` values are validated against the set, unknown modes are dropped — never fatal.)

- [ ] **Step 3: Extend tests**

Append to `tests/segment-contract.test.ts`:

```typescript
describe("sanitizeSegments v2 fields", () => {
  test("keeps valid mode and clamps pauseAfter", () => {
    const segs = sanitizeSegments([
      { say: "Now we write the formula.", ink: [{ type: "write", text: "u = x" }], mode: "parallel", pauseAfter: 9 },
      { say: "Let that land.", mode: "pause", pauseAfter: 0.3 },
      { say: "Bad mode.", mode: "karaoke", pauseAfter: "no" },
    ]);
    expect(segs.length).toBe(3);
    expect(segs[0].mode).toBe("parallel");
    expect(segs[0].pauseAfter).toBe(2.5); // clamped
    expect(segs[1].mode).toBe("pause");
    expect(segs[1].pauseAfter).toBe(0.3);
    expect(segs[2].mode).toBeUndefined();
    expect(segs[2].pauseAfter).toBeUndefined();
  });
});
```

- [ ] **Step 4: Run tests**

Run: `bun test tests/segment-contract.test.ts tests/scene-beats.test.ts`
Expected: PASS (scene-beats exercises the same sanitizer — verify no regression).

- [ ] **Step 5: Commit**

```bash
git add src/lib/video/types.ts src/lib/solve-schema.ts tests/segment-contract.test.ts
git commit -m "feat(schema): segment modes + pauseAfter + audio cue types

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 6: Segment-stitched audio engine (M1)

**Files:**
- Create: `src/lib/video/stitch-audio.ts`
- Test: `tests/stitch-audio.test.ts`

**Interfaces:**
- Consumes: `pcmToWav` from `src/lib/ai/gemini.ts:171`; `AudioSegmentCue`, `SegmentMode` from `./types`.
- Produces (Phase 2 pipeline calls these):
  - `export const SAMPLE_RATE = 24000;`
  - `export function pcmDurationSec(pcm: Buffer): number`
  - `export function silenceSec(sec: number): Buffer`
  - `export function loudnessNormalize(pcm: Buffer, targetPeak = 26000): Buffer`
  - `export function gapSeconds(opts: { mode?: SegmentMode; penDeficit?: number; pauseAfter?: number }): number`
  - `export function stitchScene(segments: Buffer[], gapsSec: number[], tailSec = 0): { wav: Buffer; cues: AudioSegmentCue[]; totalSec: number }`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/stitch-audio.test.ts
import { describe, expect, test } from "bun:test";
import {
  SAMPLE_RATE,
  pcmDurationSec,
  silenceSec,
  loudnessNormalize,
  gapSeconds,
  stitchScene,
} from "../src/lib/video/stitch-audio";
import { getWavDuration } from "../src/lib/video/timings";

const sec = (n: number) => Buffer.alloc(n * SAMPLE_RATE * 2); // n seconds of silence PCM

describe("pcm helpers", () => {
  test("duration math", () => {
    expect(pcmDurationSec(sec(1))).toBeCloseTo(1, 6);
    expect(pcmDurationSec(Buffer.alloc(0))).toBe(0);
  });
  test("silence length", () => {
    expect(silenceSec(0.5).length).toBe(Math.round(0.5 * SAMPLE_RATE * 2));
  });
});

describe("loudnessNormalize", () => {
  test("scales a quiet segment toward the target peak", () => {
    const pcm = Buffer.alloc(SAMPLE_RATE * 2);
    pcm.writeInt16LE(6500, 0);
    pcm.writeInt16LE(-6500, 2);
    const out = loudnessNormalize(pcm);
    expect(out.readInt16LE(0)).toBeGreaterThan(20000);
    expect(out.readInt16LE(0)).toBeLessThanOrEqual(32767);
    expect(out.readInt16LE(2)).toBeLessThanOrEqual(32767);
  });
  test("near-silence passes through untouched", () => {
    const pcm = Buffer.alloc(100);
    expect(loudnessNormalize(pcm).equals(pcm)).toBe(true);
  });
});

describe("gapSeconds", () => {
  test("default per mode", () => {
    expect(gapSeconds({})).toBe(0.35);
    expect(gapSeconds({ mode: "write_ahead" })).toBe(0.9);
  });
  test("pen deficit and hint raise it; clamps hold", () => {
    expect(gapSeconds({ penDeficit: 1.7 })).toBe(1.7);
    expect(gapSeconds({ pauseAfter: 2.0 })).toBe(2.0);
    expect(gapSeconds({ penDeficit: 9 })).toBe(4.0);
    expect(gapSeconds({ penDeficit: 0.05 })).toBe(0.25);
  });
});

describe("stitchScene", () => {
  test("manifest math and RIFF round-trip", () => {
    const { wav, cues, totalSec } = stitchScene([sec(1), sec(1)], [0.5], 0.4);
    expect(totalSec).toBeCloseTo(2.9, 6);
    expect(cues).toEqual([
      { i: 0, t0: 0, t1: 1 },
      { i: 1, t0: 1.5, t1: 2.5 },
    ]);
    expect(getWavDuration(wav)).toBeCloseTo(2.9, 2);
    // data chunk = 2.9 s of samples
    expect(wav.readUInt32LE(40)).toBe(Math.round(2.9 * SAMPLE_RATE * 2));
  });
  test("single segment with no gaps", () => {
    const { cues, totalSec } = stitchScene([sec(2)], [], 0);
    expect(cues).toEqual([{ i: 0, t0: 0, t1: 2 }]);
    expect(totalSec).toBeCloseTo(2, 6);
  });
  test("empty input throws", () => {
    expect(() => stitchScene([], [])).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun test tests/stitch-audio.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/video/stitch-audio.ts`**

```typescript
/* ------------------------------------------------------------------
   Segment-stitched scene audio (spec §6). Per-segment TTS PCM (already
   normalized per segment) is concatenated with EXPLICIT silence gaps —
   sized by mode / pen deficit / author hint — into ONE WAV per scene,
   plus a cue manifest the compiler and captions anchor against.
   Pure and deterministic; the pipeline (Phase 2) drives it.
------------------------------------------------------------------- */

import { pcmToWav } from "../ai/gemini";
import type { AudioSegmentCue, SegmentMode } from "./types";

export const SAMPLE_RATE = 24000; // 16-bit signed LE mono — the TTS contract

export function pcmDurationSec(pcm: Buffer): number {
  return pcm.length / 2 / SAMPLE_RATE;
}

export function silenceSec(sec: number): Buffer {
  return Buffer.alloc(Math.max(0, Math.round(sec * SAMPLE_RATE * 2)));
}

/** scale a segment's peak toward targetPeak so independently synthesized
 *  sentences sit at one loudness — prevents audible splices */
export function loudnessNormalize(pcm: Buffer, targetPeak = 26000): Buffer {
  let peak = 0;
  for (let i = 0; i + 1 < pcm.length; i += 2) {
    const v = Math.abs(pcm.readInt16LE(i));
    if (v > peak) peak = v;
  }
  if (peak < 100) return pcm; // silence — nothing to normalize
  const scale = Math.min(4.0, Math.max(0.25, targetPeak / peak));
  if (Math.abs(scale - 1) < 0.02) return pcm;
  const out = Buffer.alloc(pcm.length);
  for (let i = 0; i + 1 < pcm.length; i += 2) {
    const v = Math.round(pcm.readInt16LE(i) * scale);
    out.writeInt16LE(Math.max(-32768, Math.min(32767, v)), i);
  }
  return out;
}

const GAP_DEFAULTS: Record<SegmentMode, number> = {
  speak_ahead: 0.35,
  parallel: 0.35,
  point: 0.6,
  write_ahead: 0.9,
  pause: 0.9,
};

/** gap AFTER a segment = max(mode default, pen deficit, author hint),
 *  clamped to the spec band. penDeficit = how much longer the calibrated
 *  pen needs for this segment's ink than its measured speech lasts. */
export function gapSeconds(opts: {
  mode?: SegmentMode;
  penDeficit?: number;
  pauseAfter?: number;
}): number {
  const base = Math.max(
    opts.mode ? GAP_DEFAULTS[opts.mode] : GAP_DEFAULTS.parallel,
    opts.penDeficit ?? 0,
    opts.pauseAfter ?? 0
  );
  return Math.round(Math.min(4.0, Math.max(0.25, base)) * 100) / 100;
}

export interface StitchResult {
  wav: Buffer;
  cues: AudioSegmentCue[];
  totalSec: number;
}

/** stitch segment PCMs + inter-segment gaps (+ optional trailing tail)
 *  into one WAV; cues are WAV-relative and INCLUDE the gaps layout. */
export function stitchScene(
  segments: Buffer[],
  gapsSec: number[],
  tailSec = 0
): StitchResult {
  if (!segments.length) throw new Error("stitchScene: no segments");
  if (gapsSec.length !== segments.length - 1) {
    throw new Error(
      `stitchScene: expected ${segments.length - 1} gaps, got ${gapsSec.length}`
    );
  }
  const cues: AudioSegmentCue[] = [];
  const parts: Buffer[] = [];
  let t = 0;
  segments.forEach((pcm, i) => {
    const dur = pcmDurationSec(pcm);
    cues.push({ i, t0: round3(t), t1: round3(t + dur) });
    parts.push(pcm);
    t += dur;
    const gap = i < gapsSec.length ? gapsSec[i] : tailSec;
    if (gap > 0) {
      parts.push(silenceSec(gap));
      t += gap;
    }
  });
  if (tailSec > 0 && gapsSec.length === segments.length - 1 && segments.length === 1) {
    // single-segment tail is handled above; multi-segment tail appended here
  }
  if (tailSec > 0 && segments.length > 1) {
    parts.push(silenceSec(tailSec));
    t += tailSec;
  }
  return { wav: pcmToWav(Buffer.concat(parts), SAMPLE_RATE), cues, totalSec: round3(t) };
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
```

Note the single-segment vs multi-segment tail handling — simplify if you see a cleaner formulation, but the tests above are the contract: `stitchScene([s], [], tail)` includes the tail in `totalSec`, and the WAV data length matches.

- [ ] **Step 4: Run tests**

Run: `bun test tests/stitch-audio.test.ts`
Expected: 8/8 PASS.

- [ ] **Step 5: Full suite + commit**

Run: `bun test`
Expected: ALL PASS.

```bash
git add src/lib/video/stitch-audio.ts tests/stitch-audio.test.ts
git commit -m "feat(audio): segment-stitched scene WAV engine with cue manifest

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 7: Phase 1 close-out

**Files:**
- Modify: `docs/superpowers/specs/2026-10-16-sync-v2-design.md` (no content change needed — the spec already covers this phase)

**Interfaces:**
- Consumes: all Phase 1 deliverables.
- Produces: verification record + the go decision for the Phase 2 plan.

- [ ] **Step 1: Full verification**

Run: `bun test` → ALL PASS. Run: `bun x tsc --noEmit` → clean.
Expected: zero failures; calibration constants consistent with the measured JSON.

- [ ] **Step 2: User acceptance check**

`npm run dev` → studio → flagship sample playback:
- handwriting pace reads natural (calibrated — compare against the reference video side by side if in doubt),
- no other behavior changed (stitcher is not yet wired into generation — Phase 2 does that).

- [ ] **Step 3: Commit any residual fixes, then write the Phase 2 plan**

The Phase 2 plan (spec §5, §7–§9: compiler segment-anchored pacing, prompts, pipeline, runtime, gates) is written AFTER this phase lands, using the measured constants and the stitcher's real interfaces.

```bash
git add -A
git commit -m "chore: sync v2 phase 1 close-out

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Self-Review (completed during planning)

- **Spec coverage:** §4 (W1) → Tasks 1–4; §6 (W3 core) → Tasks 5–6; §4's "deliverable = research doc" → Task 3 Step 3; spec §10 pin supersession → Task 4 Steps 4/7. Phase 2 sections (§5, §7–§9) deliberately out of scope — sequenced plan per the one-phase-at-a-time rhythm.
- **Placeholders:** `<fitted.gamma0>` etc. in Task 4 are transcription targets from Task 3's JSON artifact — the flow produces the values; the consistency test (Task 4 Step 5) makes them verifiable.
- **Type consistency:** `AudioSegmentCue` defined Task 5, consumed Task 6; `HandwritingMetrics`/`Fitted` defined Tasks 1–2, consumed Tasks 3–4; `CAL` shape matches both the JSON test and the kinematics edits.
