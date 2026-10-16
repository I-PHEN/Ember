import { describe, expect, test } from "bun:test";
import { FrameAnalyzer, percentile } from "../src/lib/calibration/analyze";

/* frames are W×H grayscale; a "pen" is a bright 3×3 blob that moves
   right at 5 px/frame; bg 40, blob 200 */
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
  test("detects a writing burst, its speed, and no pause after it", () => {
    const a = new FrameAnalyzer(W, H, 10, { minChanged: 4 });
    // burst: pen moves 10→30 (5 frames), then identical frames (no diff)
    for (let x = 10; x <= 30; x += 5) a.push(frame(x, 18));
    for (let i = 0; i < 6; i++) a.push(frame(30, 18));
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
    for (let i = 0; i < 5; i++) a.push(frame(15, 10)); // 0.5s pause
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
