import { expect, test } from "bun:test";
import { createJob, getJob, runClaimedJob, type EngineProviders } from "../src/lib/video-jobs";
import { SOLVER_SYSTEM, REVIEWER_SYSTEM, TRANSCRIPT_PROMPT } from "../src/lib/prompts";
import { pcmToWav } from "../src/lib/ai/gemini";
import { compileTimeline } from "../src/lib/video/compile";
import { testStore } from "./helpers/durable-db";

test("a durable lesson publishes measured speech steps and never reveals a prediction answer early", async () => {
  const {store}=await testStore();
  const narrations=["We have x plus two equals five, and we want to find the unknown x.","What is five minus two? Three is the result, so our unknown x equals three."];
  const providers:EngineProviders={
    complete:async(system,user)=>{
      let data:unknown;
      if(system===SOLVER_SYSTEM)data={answer:"3",steps:[]};
      else if(system.startsWith("You DIRECT"))data={title:"Algebra",question:"x+2=5",scenes:[{chapter:"Given",summary:"x+2=5"},{chapter:"Subtract",summary:"x=3"}]};
      else if(system===TRANSCRIPT_PROMPT)data={scenes:narrations.map(script=>({script}))};
      else if(system===REVIEWER_SYSTEM)data={verdict:"pass"};
      else {const i=Number(user.match(/YOUR SCENE: scene (\d+)/)?.[1])-1;data={narration:narrations[i],beats:[{type:i===0?"title":"write",text:i===0?"Solve for x: x + 2 = 5":"x = 3",say:i===0?narrations[0]:"Three is the result, so our unknown x equals three.",keep:true}]};}
      return{text:JSON.stringify(data),provider:"test",hops:0};
    },
    synthesize:async text=>({buffer:pcmToWav(Buffer.alloc(text.split(/\s+/).length*36000)),ms:1,cached:false}),
  };
  const id=await createJob("Solve x+2=5",store),claim=(await store.claimJob(id))!;
  await runClaimedJob(claim,store,providers);
  const job=await getJob(id,store);
  expect(job?.phase).toBe("ready");
  expect(job?.voicesDone).toBe(2);
  expect(job?.script?.scenes.map(s=>s.delivery)).toEqual(["step","step","step"]);
  expect(job?.script?.scenes[1].beats).toEqual([]);
  expect(job?.script?.scenes[2].beats[0]).toMatchObject({text:"x = 3"});
  const timeline=compileTimeline(job!.script!);
  expect(timeline.scenes[0].strokes[0].t0).toBeLessThan(.15);
  for(const scene of job!.script!.scenes) {
    expect(scene.audio?.duration).toBeGreaterThan(0);
    expect(await store.readAudio(scene.audio!.key)).not.toBeNull();
  }
});
