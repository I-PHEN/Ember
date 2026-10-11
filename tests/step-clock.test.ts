import { expect, test } from "bun:test";
import { advanceStepClock } from "../src/lib/video/step-clock";

const state={time:10,dt:.1,rate:1,start:10,end:20,audioTime:0 as number|null,needsVoice:false,failed:false,muted:false};
test("the board stays at entry until the recording actually starts",()=>{
  expect(advanceStepClock(state).time).toBe(10);
  expect(advanceStepClock({...state,needsVoice:true}).waiting).toBe(true);
});
test("stalled audio cannot let writing reveal a future result",()=>{
  expect(advanceStepClock({...state,time:12,audioTime:2}).time).toBe(12);
  expect(advanceStepClock({...state,time:12,audioTime:2.4}).time).toBe(12.4);
});
test("only the short transition after audio uses wall time",()=>{
  expect(advanceStepClock({...state,time:19.9,audioTime:null}).time).toBe(20);
});
test("missing audio stops rather than silently teaching",()=>{
  expect(advanceStepClock({...state,failed:true})).toMatchObject({time:10,stop:true,waiting:false});
});
test("explicit mute still permits visual playback at the user's chosen speed",()=>{
  expect(advanceStepClock({...state,muted:true,rate:2}).time).toBe(10.2);
});
