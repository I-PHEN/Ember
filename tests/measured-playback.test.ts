import { expect, test } from "bun:test";
import { compileTimeline, setSceneAudio } from "../src/lib/video/compile";
import { SceneAudio } from "../src/lib/video/audio";
import type { SolveScript } from "../src/lib/video/types";

const key = "a".repeat(64);
test("synchronized writing uses the same readable stroke pace as the normal board", () => {
  const beats=[{type:"write" as const,text:"x + 2 = 5"}];
  const normal=compileTimeline({title:"t",question:"q",scenes:[{chapter:"c",narration:"",beats}]}).scenes[0];
  const step=compileTimeline({title:"t",question:"q",scenes:[{chapter:"c",narration:"Here is our equation.",beats,delivery:"step"}]}, {measureOnly:true}).scenes[0];
  expect(step.strokes.map(s=>s.dur)).toEqual(normal.strokes.map(s=>s.dur));
});
test("an ended recording never restarts while the board finishes its transition", () => {
  const original=globalThis.Audio;
  class AudioDouble {duration=20;currentTime=20;ended=true;paused=true;playbackRate=1;muted=false;src="";preload="";dataset={};addEventListener(){}pause(){}play(){this.currentTime=0;this.paused=false;return Promise.resolve();}}
  globalThis.Audio=AudioDouble as unknown as typeof Audio;
  const scene=new SceneAudio();
  try {const a=scene.attach(0,"test.wav",20,.9)!; scene.tick(0,22.19,true,1,false,true); expect(a.currentTime).toBe(20);expect(scene.clockTime(0)).toBeNull();}
  finally {scene.dispose();globalThis.Audio=original;}
});
test("boxing the recorded answer fits its speech without accelerating handwriting", () => {
  const narration="x equals three is what remains on the left, and three is our solution, so let's put a box around it.";
  const scene={chapter:"Answer",delivery:"step" as const,kind:"work" as const,narration,beats:[{type:"write" as const,text:"x = 3",size:"lg" as const,say:narration}],audio:{key,narration,duration:8.16}};
  const plain=compileTimeline({title:"t",question:"x+2=5",scenes:[scene]}).scenes[0];
  const boxed=compileTimeline({title:"t",question:"x+2=5",scenes:[{...scene,beats:[...scene.beats,{type:"box",target:"text:x = 3"}]}]}).scenes[0];
  expect(boxed.writeEnd-plain.writeEnd).toBeLessThan(3);
  expect(boxed.strokes.slice(0,plain.strokes.length).map(s=>[s.t0,s.dur])).toEqual(plain.strokes.map(s=>[s.t0,s.dur]));
  expect(boxed.writeEnd).toBeLessThan(boxed.dur);
});
test("a measured step starts writing immediately, without estimated speech windows", () => {
  const narration="We have x plus two equals five, and we want to find the unknown x.";
  const tl=compileTimeline({title:"t",question:"x+2=5",scenes:[{chapter:"Given",delivery:"step",kind:"work",narration,beats:[{type:"write",text:"x + 2 = 5",say:narration}],audio:{key,narration,duration:18}}]} as SolveScript);
  expect(tl.scenes[0].strokes[0].t0).toBeLessThan(.15);
  expect(tl.scenes[0].speechRate).toBe(.9);
  expect(tl.scenes[0].dur).toBe(20.15);
  const times=tl.scenes[0].strokes.map(s=>[s.t0,s.dur]);
  setSceneAudio(tl,0,18);setSceneAudio(tl,0,18);
  expect(tl.scenes[0].strokes.map(s=>[s.t0,s.dur])).toEqual(times);
  expect(tl.scenes[0].dur).toBe(20.15);
});
test("a pure question shows no result while its recorded audio plays", () => {
  const narration="What is five minus two?";
  const tl=compileTimeline({title:"t",question:"q",scenes:[{chapter:"Predict",delivery:"step",kind:"ask",narration,beats:[],audio:{key,narration,duration:4}}]});
  expect(tl.scenes[0].strokes).toEqual([]);
  expect(tl.scenes[0].dur).toBeCloseTo(4/.9+.6);
});
test("audio seeks and user speed use the same per-step rate as the board clock", async () => {
  const original=globalThis.Audio;
  class AudioDouble {duration=20;currentTime=0;paused=true;playbackRate=1;muted=false;src="";preload="";dataset:Record<string,string>={};addEventListener(){}pause(){this.paused=true;}async play(){this.paused=false;}}
  globalThis.Audio=AudioDouble as unknown as typeof Audio;
  const scene=new SceneAudio();
  try {
    const a=scene.attach(0,"test.wav",20,.8)!;
    scene.tick(0,5,true,1.5,false);
    expect(a.currentTime).toBe(4);
    expect(a.playbackRate).toBeCloseTo(1.2);
    expect(scene.duration(0)).toBe(25);
    expect(scene.clockTime(0)).toBe(5);
    scene.tick(0,4,true,1.5,false,true);
    expect(a.currentTime).toBe(4); // Audio-master playback must not seek back to a stale RAF clock.
    scene.seek(0,2);
    expect(a.currentTime).toBe(1.6);
  } finally {scene.dispose();globalThis.Audio=original;}
});

test("terminal play failures are exposed instead of buffering forever", async () => {
  const original=globalThis.Audio;
  class AudioDouble {duration=20;currentTime=0;paused=true;playbackRate=1;muted=false;src="";preload="";dataset={};addEventListener(){}pause(){}async play(){throw new DOMException("decode failed","NotSupportedError");}}
  globalThis.Audio=AudioDouble as unknown as typeof Audio;
  const scene=new SceneAudio();
  try {scene.attach(0,"test.wav",20);scene.tick(0,0,true,1,false,true);await new Promise(resolve=>setTimeout(resolve,0));expect(scene.failed(0)).toBe(true);}
  finally {scene.dispose();globalThis.Audio=original;}
});
