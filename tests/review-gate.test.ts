import { expect, test } from "bun:test";
import { collectSceneReviews } from "../src/lib/video/review-gate";
import { acceptSceneReview, normalizeReviewFix } from "../src/lib/video/review";

test("all scene approvals are required, in scene order", async () => {
  expect(await collectSceneReviews([Promise.resolve("a"),Promise.resolve("b")],100)).toEqual({passed:true,results:["a","b"],statuses:["passed","passed"]});
  expect((await collectSceneReviews([],10)).passed).toBe(false);
});
test("provider rejection and invalid/rejected correction fail closed", async () => {
  const r = await collectSceneReviews([Promise.resolve("a"),Promise.reject(new Error("provider")),Promise.resolve(null)],100);
  expect(r.passed).toBe(false);
  expect(r.statuses).toEqual(["passed","failed","failed"]);
});
test("deadline closes results and late approvals cannot change them", async () => {
  let finish!: (v:string)=>void;
  const pending = new Promise<string>(r=>{finish=r;});
  const r = await collectSceneReviews([Promise.resolve("a"),pending],10);
  expect(r).toEqual({passed:false,results:["a",null],statuses:["passed","timed-out"]});
  finish("late");
  await pending;
  await Promise.resolve();
  expect(r).toEqual({passed:false,results:["a",null],statuses:["passed","timed-out"]});
});

test("passing reviewer cannot approve wrong arithmetic or an invalid matrix fix", () => {
  expect(acceptSceneReview({verdict:"pass"},[{type:"write",text:"2 + 2 = 5"}],"Check","",0)).toBeNull();
  expect(acceptSceneReview({verdict:"fixed",beats:[{type:"matrix",id:"A",rows:[]}]},[],"Check","",0)).toBeNull();
  expect(acceptSceneReview({verdict:"fixed",beats:[{type:"write",text:"2 + 2 = 4"}]},[],"Check","",0)?.fixed).toBe(true);
});

test("review acceptance cannot silently discard unsupported or excess beats", () => {
  expect(acceptSceneReview({verdict:"fixed",beats:[{type:"write",text:"x = 4"},{type:"unknown"}]},[],"Check","",0)).toBeNull();
  expect(normalizeReviewFix({verdict:"fixed",beats:Array(23).fill({type:"write",text:"x = 4"})})).toBeNull();
});
