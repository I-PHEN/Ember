import { CAP, type Beat, type BBox } from "./types";
import { layoutText, measureText, type RawStroke } from "./text";

export type MatrixBeat = Extract<Beat, { type: "matrix" }>;

export function validateMatrix(value: { id?: unknown; label?: unknown; rows?: unknown }): asserts value is MatrixBeat {
  if (typeof value.id !== "string" || !/^[A-Za-z][A-Za-z0-9_]{0,15}$/.test(value.id)) throw new Error("Matrix needs a stable ASCII id (1–16 characters)");
  if (value.label !== undefined && (typeof value.label !== "string" || value.label.length > 24 || /[\r\n]/.test(value.label))) throw new Error("Matrix label is invalid");
  const rows = value.rows;
  if (!Array.isArray(rows) || !rows.length || rows.length > 6 || !Array.isArray(rows[0]) || !rows[0].length || rows[0].length > 6) throw new Error("Matrix must have 1–6 rows and columns");
  const cols = rows[0].length;
  if (rows.some(r => !Array.isArray(r) || r.length !== cols || r.some(c => typeof c !== "string" || !c.trim() || c.length > 24 || /[\r\n]/.test(c)))) throw new Error("Matrix cells must be nonempty strings in rectangular rows (24 characters maximum)");
}

/** Local geometry, translated only once the compiler has found board space. */
export function layoutMatrix(beat: MatrixBeat, maxWidth: number) {
  validateMatrix(beat);
  const color = beat.color ?? "white";
  const requested = CAP[beat.size ?? "md"];
  for (const cap of [...new Set([requested, 28, 24, 20].filter(c => c <= requested))]) {
    const widths = beat.rows[0].map((_, c) => Math.max(cap, ...beat.rows.map(r => measureText(r[c], cap))) + 28);
    const labelWidth = beat.label ? measureText(`${beat.label} =`, cap) + 24 : 0;
    const width = labelWidth + widths.reduce((a,b) => a+b, 0) + 32;
    if (width > maxWidth) continue;
    const rowH = cap * 1.8;
    const height = beat.rows.length * rowH + 16;
    const strokes: RawStroke[] = [];
    const regions: Record<string, BBox> = {};
    if (beat.label) strokes.push(...layoutText(`${beat.label} =`, 0, height/2 + cap/3, { cap, color, jitter: false, seed: beat.id }).strokes);
    const left = labelWidth, right = width;
    const bracket = (x: number, inward: number): RawStroke => ({ color, width: 2.8, pts: [
      {x:x+inward,y:0}, {x,y:0}, {x,y:height}, {x:x+inward,y:height},
    ] });
    strokes.push(bracket(left, 12));
    beat.rows.forEach((row,r) => {
      let x = left + 16;
      row.forEach((cell,c) => {
        const box = { x, y:8+r*rowH, w:widths[c], h:rowH };
        regions[`cell:${r+1}:${c+1}`] = { x:box.x+8, y:box.y+4, w:box.w-16, h:box.h-8 };
        strokes.push(...layoutText(cell, x+(widths[c]-measureText(cell,cap))/2, box.y + cap + 4, {
          cap, color, jitter:false, seed:`${beat.id}:${r}:${c}`,
        }).strokes);
        x += widths[c];
      });
      regions[`row:${r+1}`] = { x:left+16, y:8+r*rowH, w:width-labelWidth-32, h:rowH };
    });
    let x = left + 16;
    widths.forEach((w,c) => {
      regions[`col:${c+1}`] = { x, y:8, w, h:beat.rows.length*rowH };
      x += w;
    });
    strokes.push(bracket(right,-12));
    return { strokes, regions, width, height, cap };
  }
  throw new Error("Matrix is too wide to render legibly; split the lesson board");
}
