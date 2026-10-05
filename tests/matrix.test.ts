import { expect, test } from "bun:test";
import { sanitizeSceneBeats } from "../src/lib/solve-schema";
import { compileTimeline } from "../src/lib/video/compile";
import { auditTimeline } from "../src/lib/video/layout-audit";

const matrix = { type: "matrix", id: "A", label: "A", rows: [["2", "7", "-4"], ["6", "3", "5"]], keep: true };
const compile = (raw: unknown[]) => compileTimeline({ title: "Matrices", question: "Find a23", scenes: [
  { chapter: "Matrix", narration: "", beats: sanitizeSceneBeats(raw, "") },
] });

test("matrix sanitizer preserves all six entries as structured data", () => {
  expect(sanitizeSceneBeats([matrix], "")[0]).toMatchObject(matrix);
});
test("matrix cells form separate aligned rows and columns with brackets", () => {
  const tl = compile([matrix]);
  const g = tl.scenes[0].groups[0];
  expect(g?.boardId).toBe("A");
  const r = g.regions!;
  expect(Object.keys(r).filter(k => k.startsWith("cell:"))).toHaveLength(6);
  expect(r["cell:1:1"].y).toBe(r["cell:1:3"].y);
  expect(r["cell:2:1"].y).toBeGreaterThan(r["cell:1:1"].y + r["cell:1:1"].h);
  expect(r["cell:1:3"].x).toBe(r["cell:2:3"].x);
  expect(r["cell:1:2"].x).toBeGreaterThan(r["cell:1:1"].x + r["cell:1:1"].w);
  expect(auditTimeline(tl)).toEqual([]);
  expect(tl.scenes[0].strokes.length).toBeGreaterThan(10);
});
test("cell highlights use the entry region, not the last board line", () => {
  const tl = compile([matrix, { type: "write", text: "a23 = 5" }, { type: "highlight", target: "matrix:A:cell:2:3" }]);
  const g = tl.scenes[0].groups[0];
  const h = tl.scenes[0].strokes.find(s => s.kind === "highlight");
  expect(h?.kind).toBe("highlight");
  if (h?.kind !== "highlight") return;
  expect(h.rect.x).toBeCloseTo(g.bbox.x + g.regions!["cell:2:3"].x - 7);
  expect(tl.scenes[0].groups.at(-1)?.anchor).toBe(g);
  expect(auditTimeline(tl)).toEqual([]);
});
test("unknown matrix targets leave no misleading highlight", () => {
  const tl = compile([matrix, { type: "highlight", target: "matrix:A:cell:9:9" }]);
  expect(tl.scenes[0].strokes.filter(s => s.kind === "highlight")).toHaveLength(0);
});
test("invalid matrix data fails explicitly rather than disappearing or truncating", () => {
  for (const rows of [[], [["1"], ["2","3"]], [[""]], [["1🙂"]], [["x".repeat(25)]], Array.from({length:7}, () => ["1"])]) {
    expect(() => sanitizeSceneBeats([{ ...matrix, rows }], "")).toThrow(/matrix/i);
  }
});

test("persistent matrix cell targets follow erasure reflow across scenes", () => {
  const tl = compileTimeline({ title:"T", question:"Q", scenes:[
    { chapter:"Given", narration:"", beats:sanitizeSceneBeats([{type:"title",text:"Read the matrix"}, matrix], "") },
    { chapter:"Entry", narration:"", beats:sanitizeSceneBeats([{type:"erase"},{type:"point",target:"matrix:A:cell:2:3"},{type:"highlight",target:"matrix:A:row:2"}], "") },
  ] });
  const root = tl.scenes[0].groups.find(g => g.boardId === "A")!;
  expect(root.strokes.every(s => s.eraseAt === undefined)).toBe(true);
  const point = tl.scenes[1].strokes.find(s => s.kind === "path" && s.width === 0.01);
  expect(point?.kind).toBe("path");
  if (point?.kind !== "path") return;
  const box = root.regions!["cell:2:3"];
  expect(point.pts[0].x).toBeCloseTo(root.bbox.x+box.x+box.w*0.32);
  expect(point.pts[0].y).toBeCloseTo(root.bbox.y+box.y+box.h+10);
  expect(tl.scenes[1].groups.at(-1)?.anchor).toBe(root);
  expect(auditTimeline(tl)).toEqual([]);
});

test("conflicting live IDs and oversized glyph layouts fail instead of overlapping", () => {
  expect(() => compile([matrix,{...matrix,rows:[["9"]]}])).toThrow(/already/);
  expect(() => compile([{...matrix,rows:[Array(6).fill("W".repeat(24))]}])).toThrow(/wide/);
});

test("independent writers repeating the identical matrix reference existing ink", () => {
  const tl = compile([matrix,matrix]);
  expect(tl.scenes[0].groups.filter(g => g.boardId === "A")).toHaveLength(1);
  expect(tl.scenes[0].strokes.filter(s => s.kind === "path" && s.width === 0.01)).toHaveLength(1);
  expect(auditTimeline(tl)).toEqual([]);
});

test("matrix handwriting uses finite normal-speed strokes", () => {
  const tl = compile([matrix]);
  for (const s of tl.scenes[0].strokes) if (s.kind === "path") {
    expect(s.dur).toBeGreaterThan(0);
    expect(s.len/s.dur).toBeLessThanOrEqual(166);
  }
});
