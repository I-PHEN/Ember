interface StepClockState {
  time:number;dt:number;rate:number;start:number;end:number;
  audioTime:number|null;needsVoice:boolean;failed:boolean;muted:boolean;
}

/** One clock: follow audible time while speech plays; wall time only for mute/tail. */
export function advanceStepClock(s:StepClockState) {
  if(s.failed) return {time:s.time,waiting:false,stop:true};
  if(s.needsVoice) return {time:s.time,waiting:true,stop:false};
  const time=!s.muted && s.audioTime!==null
    ? Math.max(s.start,Math.min(s.end,s.start+s.audioTime))
    : Math.min(s.end,s.time+Math.max(0,s.dt)*s.rate);
  return {time,waiting:!s.muted && s.audioTime!==null && time<=s.time+.001,stop:false};
}
