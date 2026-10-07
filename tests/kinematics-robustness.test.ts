import { expect, test } from "bun:test";
import { defaultSynthesizer, strokeProgressAt } from "../src/lib/video/kinematics";
import { compileTimeline, setSceneAudio } from "../src/lib/video/compile";
import type { PathStroke } from "../src/lib/video/types";

test("subpixel and coincident strokes never overshoot or reverse progress", () => {
  for (const length of [0, 0.001, 0.1, 1, 10]) {
    const profile = defaultSynthesizer.synthesize([{x:0,y:0},{x:length,y:0}]);
    expect(profile.timeLut).toHaveLength(64);
    let previous = 0;
    for (const progress of profile.timeLut) {
      expect(Number.isFinite(progress)).toBe(true);
      expect(progress).toBeGreaterThanOrEqual(previous);
      expect(progress).toBeLessThanOrEqual(1);
      previous = progress;
    }
    expect(previous).toBe(1);
  }
});

test("compiled glyph geometry and per-point measurements share one index space", () => {
  const profile = defaultSynthesizer.synthesize([{x:0,y:0},{x:0.1,y:0},{x:10,y:0}]);
  expect(profile.pts).toBeDefined();
  expect(profile.cum).toHaveLength(profile.pts.length);
  expect(profile.widths).toHaveLength(profile.pts.length);
  const tl = compileTimeline({title:"T",question:"Q",scenes:[{chapter:"C",narration:"",
    beats:[{type:"write",text:"abcdefghijklmnopqrstuvwxyz 0123456789",size:"sm"}]}]});
  for (const s of tl.scenes[0].strokes) if (s.kind === "path") {
    expect(s.cum).toHaveLength(s.pts.length);
    expect(s.widths).toHaveLength(s.pts.length);
    expect(s.cum.at(-1)).toBeCloseTo(s.len, 8);
  }
});

test("ballistic lines respect the configured peak speed and acceleration limits", () => {
  for (const length of [40,420,1000]) {
    const p = defaultSynthesizer.synthesize([{x:0,y:0},{x:length,y:0}],3,"ballistic-line");
    expect(1.875*length/p.duration).toBeLessThanOrEqual(defaultSynthesizer.vClamp + 1e-8);
    expect((10/Math.sqrt(3))*length/p.duration**2).toBeLessThanOrEqual(defaultSynthesizer.aMax + 1e-8);
  }
});

test("invalid geometry fails explicitly instead of poisoning a timeline with NaN", () => {
  for (const pts of [[],[{x:0,y:0}], [{x:0,y:0},{x:NaN,y:2}]]) {
    expect(() => defaultSynthesizer.synthesize(pts)).toThrow();
  }
});

test("real audio retiming preserves normalized stroke shape and geometry", () => {
  const tl = compileTimeline({title:"T",question:"Q",scenes:[{chapter:"C",narration:"Write x equals two.",
    beats:[{type:"write",text:"x = 2",say:"x equals two"}]}]});
  const s = tl.scenes[0].strokes.find(s => s.kind === "path") as PathStroke;
  const before = {pts:JSON.stringify(s.pts), lut:JSON.stringify(s.timeLut), progress:strokeProgressAt(s,0.4)};
  expect(setSceneAudio(tl,0,10,[{id:"s0b1",start:2,end:8}])).toBe(true);
  expect(JSON.stringify(s.pts)).toBe(before.pts);
  expect(JSON.stringify(s.timeLut)).toBe(before.lut);
  expect(strokeProgressAt(s,0.4)).toBe(before.progress);
});
