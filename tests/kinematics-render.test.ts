import { expect, test } from "bun:test";
import { renderFrame } from "../src/lib/video/render";
import { THEMES, type Timeline, type PathStroke } from "../src/lib/video/types";

test("revealing ink does not repaint old segments at a different width and pen stays on ink", () => {
  const widths: number[] = [];
  const pen: number[][] = [];
  const ctx = {
    lineWidth: 0,
    save() {}, restore() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
    fill() {}, stroke() { widths.push(this.lineWidth); },
    arc(x:number,y:number,r:number) { pen.push([x,y,r]); },
    createPattern() { return null; },
    createRadialGradient() { return {addColorStop() {}}; },
    createImageData() { return {data:new Uint8ClampedArray(256*256*4)}; },
    putImageData() {},
  };
  const old = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis,"document",{configurable:true,value:{
    createElement() { return {getContext() { return ctx; }}; },
  }});
  try {
    const stroke:PathStroke = {kind:"path",pts:[{x:0,y:0},{x:100,y:0}],
      cum:[0,100],len:100,width:4,widths:[2,6],timeLut:[0,1],
      velocities:[100],color:"white",t0:0,dur:1};
    const tl:Timeline = {title:"T",question:"Q",scenes:[{chapter:"C",narration:"",
      head:0,writeEnd:1,dur:2,locked:false,strokes:[stroke],groups:[],erases:[]}]};
    renderFrame(ctx as unknown as CanvasRenderingContext2D,tl,0.25,THEMES.blackboard);
    const partialWidth = widths.at(-1);
    expect(pen.at(-1)?.[0]).toBeCloseTo(25,8);
    expect(pen.at(-1)?.[1]).toBeCloseTo(0,8);
    renderFrame(ctx as unknown as CanvasRenderingContext2D,tl,1,THEMES.blackboard,{pen:false});
    expect(widths.at(-1)).toBe(partialWidth);
  } finally {
    if (old) Object.defineProperty(globalThis,"document",old);
    else Reflect.deleteProperty(globalThis,"document");
  }
});
