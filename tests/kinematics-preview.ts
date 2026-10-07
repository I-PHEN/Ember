// Local visual QA harness: production compiler/renderer, no providers or authentication.
// bun build tests/kinematics-preview.ts --target browser --outfile scratch/kinematics-preview.js
import { compileTimeline } from "../src/lib/video/compile";
import { renderFrame } from "../src/lib/video/render";
import { THEMES, totalDuration } from "../src/lib/video/types";

const timeline = compileTimeline({title:"Matrix handwriting QA",question:"Find a23",scenes:[
  {chapter:"Matrix",narration:"",beats:[
    {type:"matrix",id:"A",label:"A",rows:[["2","7","-4"],["6","3","5"]],keep:true},
    {type:"highlight",target:"matrix:A:cell:2:3",color:"blue"},
    {type:"write",text:"a_{23} = 5",color:"green"},
    {type:"wait",ms:1000},
  ]},
]});
const canvas = document.querySelector("canvas")!;
const context = canvas.getContext("2d")!;
const slider = document.querySelector("input")!;
const button = document.querySelector("button")!;
const output = document.querySelector("output")!;
const duration = totalDuration(timeline);
slider.max = String(duration);
let time = 0;
let playing = false;
let previous = performance.now();
function draw() {
  renderFrame(context,timeline,time,THEMES.blackboard);
  slider.value = String(time);
  output.textContent = time.toFixed(2) + " / " + duration.toFixed(2) + " seconds";
}
slider.addEventListener("input",() => {time=Number(slider.value);draw();});
button.addEventListener("click",() => {
  if(time>=duration) time=0;
  playing=!playing;
  button.textContent=playing?"Pause":"Play";
});
function frame(now:number) {
  if(playing) {
    time=Math.min(duration,time+(now-previous)/1000);
    if(time===duration) {playing=false;button.textContent="Play";}
    draw();
  }
  previous=now;
  requestAnimationFrame(frame);
}
draw();
requestAnimationFrame(frame);
