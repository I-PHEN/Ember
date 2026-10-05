// Deterministic geometry preview; no provider calls. Run: bun tests/matrix-preview.ts
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { compileTimeline } from "../src/lib/video/compile";
import { sanitizeSceneBeats } from "../src/lib/solve-schema";

const tl = compileTimeline({title:"Matrix preview",question:"Find a23",scenes:[{
  chapter:"Entry",narration:"",beats:sanitizeSceneBeats([
    {type:"title",text:"Reading a matrix"},
    {type:"matrix",id:"A",label:"A",rows:[["2","7","-4"],["6","3","5"]],keep:true},
    {type:"highlight",target:"matrix:A:cell:2:3",color:"blue"},
    {type:"write",text:"a_{23} = 5",color:"green"},
  ],""),
}]});
const colors:Record<string,string> = {white:"#f1eee7",yellow:"#f0d560",green:"#82d896",blue:"#68bce0"};
const ink = tl.scenes[0].strokes.map(s => s.kind === "path"
  ? `<polyline points="${s.pts.map(p=>`${p.x},${p.y}`).join(" ")}" fill="none" stroke="${colors[s.color] ?? '#fff'}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round"/>`
  : `<rect x="${s.rect.x}" y="${s.rect.y}" width="${s.rect.w}" height="${s.rect.h}" fill="${colors[s.color]}" opacity="0.22"/>`).join("");
await mkdir("scratch/matrix",{recursive:true});
const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="#111315"/>${ink}</svg>`);
await sharp(svg).png().toFile("scratch/matrix/reference.png");
await sharp(svg).resize(640,360).png().toFile("scratch/matrix/reference-small.png");
console.log("Rendered scratch/matrix/reference.png and reference-small.png");
