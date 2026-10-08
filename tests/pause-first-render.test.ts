import { expect, test } from "bun:test";
import { renderFrame } from "../src/lib/video/render";
import { THEMES, type Timeline, type PathStroke } from "../src/lib/video/types";

test("pen holds before its scheduled flight and seeking is deterministic", () => {
  const pen: number[][] = [];
  const ctx = {
    save() {}, restore() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, fill() {}, stroke() {},
    arc(x: number, y: number, r: number) { pen.push([x, y, r]); },
    createPattern() { return null; }, createRadialGradient() { return { addColorStop() {} }; },
    createImageData() { return { data: new Uint8ClampedArray(256 * 256 * 4) }; }, putImageData() {},
  };
  const old = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement() { return { getContext() { return ctx; } }; } } });
  try {
    const stroke = (x: number, t0: number): PathStroke => ({ kind: "path", pts: [{ x, y: 0 }, { x: x + 100, y: 0 }], cum: [0, 100], len: 100, width: 3, color: "white", t0, dur: 1, timeLut: [0, 1] });
    const next = stroke(300, 6); next.travel = { t0: 5, dur: 1 };
    const tl: Timeline = { title: "T", question: "Q", scenes: [{ chapter: "C", narration: "", head: 0, writeEnd: 7, dur: 10, locked: false, strokes: [stroke(0, 0), next], groups: [], erases: [] }] };
    const at = (t: number) => { pen.length = 0; renderFrame(ctx as unknown as CanvasRenderingContext2D, tl, t, THEMES.blackboard); return pen.at(-1); };
    expect(at(2)).toEqual([100, 0, 3.4]);
    expect(at(4)).toEqual([100, 0, 3.4]);
    const middle = at(5.5);
    expect(middle?.[0]).toBeGreaterThan(100);
    expect(middle?.[0]).toBeLessThan(300);
    at(6.5);
    expect(at(5.5)).toEqual(middle);
    expect(at(4)).toEqual([100, 0, 3.4]);
  } finally {
    if (old) Object.defineProperty(globalThis, "document", old);
    else Reflect.deleteProperty(globalThis, "document");
  }
});
