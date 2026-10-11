import { audioKey, ensureRecordedAudio } from "./audio-assets";
import { speak } from "../tts-queue";
import { planTeachingSteps, validatePredictionOrder, type StepKind } from "../video/teaching-steps";
import { readWav, joinWavs } from "../video/wav";
import type { SolveScene, SolveScript } from "../video/types";

interface AudioStore { readAudio(key:string):Promise<Buffer|null>;saveAudio(key:string,data:Buffer):Promise<void> }
export interface RecordedStep { narration:string; key:string; duration:number; kind:StepKind }
export const stepAudioKey = (text:string) => audioKey(`step-recording-v1:${text}`);

export async function ensureStepAudio(scene:SolveScene,store:AudioStore,synthesize= speak,assignedKey=stepAudioKey(scene.narration)) {
  const plan=planTeachingSteps(scene), buffers:Buffer[]=[], steps:RecordedStep[]=[];
  let ms=0, cached=true;
  for(const step of plan) {
    const recording=await ensureRecordedAudio(step.narration,"jam",store,synthesize);
    const {duration}=readWav(recording.buffer);
    buffers.push(recording.buffer);
    steps.push({narration:step.narration,key:recording.key,duration,kind:step.kind});
    ms+=recording.ms;cached &&=recording.cached;
  }
  const existing=await store.readAudio(assignedKey);
  const buffer=existing ?? joinWavs(buffers);
  if(!existing) await store.saveAudio(assignedKey,buffer);
  return {key:assignedKey,buffer,steps,ms,cached};
}

/** Reviews may change ink, but may never silently change recorded speech windows. */
export function materializeRecordedSteps(script:SolveScript,records:Record<string,RecordedStep[]>):SolveScript {
  const scenes=script.scenes.flatMap(scene=>{
    if(!scene.narration) return [scene];
    const saved=records[scene.audio?.key ?? ""];
    const planned=planTeachingSteps(scene);
    if(!saved || saved.length!==planned.length || saved.some((s,i)=>s.narration!==planned[i].narration || s.kind!==planned[i].kind)) throw new Error("Reviewed board does not match recorded teaching steps");
    return planned.map((step,i)=>({...step,chapter:scene.chapter,delivery:"step" as const,
      audio:{key:saved[i].key,narration:step.narration,duration:saved[i].duration}}));
  });
  validatePredictionOrder(scenes.map(scene=>({narration:scene.narration,beats:scene.beats,kind:scene.kind ?? "work"})));
  return {...script,scenes};
}
