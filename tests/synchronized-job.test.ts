import { expect, test } from "bun:test";
import { createJob, getJob, runClaimedJob, type EngineProviders } from "../src/lib/video-jobs";
import { SOLVER_SYSTEM, REVIEWER_SYSTEM, TRANSCRIPT_PROMPT } from "../src/lib/prompts";
import { pcmToWav } from "../src/lib/ai/gemini";
import { compileTimeline } from "../src/lib/video/compile";
import { testStore } from "./helpers/durable-db";

test("a durable lesson publishes measured speech steps and never reveals a prediction answer early", async () => {
  const {store}=await testStore();
  const narrations=["We have x plus two equals five, and we want to find the unknown x.","What is five minus two? Three is the result, so our unknown x equals three."];
  let givenAttempts=0;
  let receivedTimingFeedback=false;
  const providers:EngineProviders={
    complete:async(system,user)=>{
      let data:unknown;
      if(system===SOLVER_SYSTEM)data={answer:"3",steps:[]};
      else if(system.startsWith("You DIRECT"))data={title:"Algebra",question:"x+2=5",scenes:[{chapter:"Given",summary:"x+2=5"},{chapter:"Subtract",summary:"x=3"}]};
      else if(system===TRANSCRIPT_PROMPT)data={scenes:narrations.map(script=>({script}))};
      else if(system===REVIEWER_SYSTEM)data=user.includes("Given")
        ? {verdict:"fixed",beats:[{type:"write",text:"x + 2 - 2 = 5 - 2",say:narrations[0],keep:true}]}
        : {verdict:"pass"};
      else {
        const i=Number(user.match(/YOUR SCENE: scene (\d+)/)?.[1])-1;
        const overfull=i===0 && givenAttempts++===0;
        if(i===0 && !overfull) receivedTimingFeedback=user.includes("seconds of board motion");
        data={narration:narrations[i],beats:[{type:overfull?"write":i===0?"title":"write",text:overfull?"x + 2 - 2 = 5 - 2":i===0?"Solve for x: x + 2 = 5":"x = 3",say:i===0?narrations[0]:"Three is the result, so our unknown x equals three.",keep:true}]};
      }
      return{text:JSON.stringify(data),provider:"test",hops:0};
    },
    synthesize:async text=>({buffer:pcmToWav(Buffer.alloc(text.split(/\s+/).length*36000)),ms:1,cached:false}),
  };
  const id=await createJob("Solve x+2=5",store),claim=(await store.claimJob(id))!;
  await runClaimedJob(claim,store,providers);
  const job=await getJob(id,store);
  expect(job?.phase).toBe("ready");
  expect(receivedTimingFeedback).toBe(true);
  expect(job?.script?.scenes[0].beats[0]).toMatchObject({text:"x + 2 = 5"});
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

test("exhausted timing retries do not enqueue an unanchored summary fallback", async () => {
  const {store,client}=await testStore();
  const narration="Subtract two from both sides to isolate the unknown.";
  const providers:EngineProviders={complete:async(system)=>{
    const data=system===SOLVER_SYSTEM?{answer:"3",steps:[]}
      :system.startsWith("You DIRECT")?{title:"t",question:"x+2=5",scenes:[{chapter:"One",summary:"x+2=5"},{chapter:"Two",summary:"x=3"}]}
      :system===TRANSCRIPT_PROMPT?{scenes:[{script:narration},{script:narration}]}
      :system===REVIEWER_SYSTEM?{verdict:"pass"}
      :{narration,beats:[{type:"write",text:"x + 2 - 2 = 5 - 2",say:narration}]};
    return {text:JSON.stringify(data),provider:"test",hops:0};
  },synthesize:async()=>{throw new Error("invalid authoring must not reach voice generation");}};
  const id=await createJob("Solve x+2=5",store);
  await runClaimedJob((await store.claimJob(id))!,store,providers);
  expect((await getJob(id,store))?.phase).toBe("error");
  const row=await client.videoJobRecord.findUniqueOrThrow({where:{id}});
  const state=JSON.parse(row.state);
  expect(state.checkpoint.results.filter(Boolean)).toHaveLength(0);
  expect(state.voiceFailures).toEqual([]);
  expect(state.voicesDone).toBe(0);
});
