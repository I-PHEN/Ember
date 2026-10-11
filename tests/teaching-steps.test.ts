import { expect, test } from "bun:test";
import { planTeachingSteps, preservesSpeechPartition } from "../src/lib/video/teaching-steps";
import type { SolveScene } from "../src/lib/video/types";

test("board corrections preserve already recorded speech partitions", () => {
  const scene: SolveScene = {chapter:"t",narration:"Subtract two. We get three.",beats:[{type:"write",text:"5 - 2",say:"Subtract two."},{type:"write",text:"x = 4",say:"We get three."}]};
  expect(preservesSpeechPartition(scene,{...scene,beats:[scene.beats[0],{type:"write",text:"x = 3",say:"We get three."}]})).toBe(true);
  expect(preservesSpeechPartition(scene,{...scene,beats:[{type:"write",text:"x = 3",say:"Subtract two."}]})).toBe(false);
});

test("a prediction question finishes before its answer is revealed", () => {
  const scene = { chapter: "Subtract", narration: "Subtract two. What is five minus two? It is three.", beats: [{ type: "write", text: "5 - 2 = 3", say: "It is three.", color: "white" }] } as SolveScene;
  const steps = planTeachingSteps(scene);
  expect(steps.map(s => s.kind)).toEqual(["explain", "ask", "work"]);
  expect(steps[1].beats).toEqual([]);
  expect(steps[2].beats[0]).toMatchObject({ text: "5 - 2 = 3" });
  expect(steps.map(s => s.narration).join(" ")).toBe(scene.narration);
});

test("the equation is a regular write without a title ritual", () => {
  const steps = planTeachingSteps({ chapter: "Given", narration: "We have x plus two equals five.", beats: [{ type: "title", text: "Solve for x: x + 2 = 5", say: "We have x plus two equals five." }] });
  expect(steps[0].beats).toEqual([{ type: "write", text: "x + 2 = 5", say: "We have x plus two equals five." }]);
});

test("backwards or absent anchors fail instead of guessing their timing", () => {
  expect(() => planTeachingSteps({ chapter: "t", narration: "First subtract. Then divide.", beats: [{ type: "write", text: "x = 3", say: "Then divide." }, { type: "write", text: "x - 2", say: "First subtract." }] })).toThrow("anchor");
  expect(() => planTeachingSteps({ chapter: "t", narration: "Subtract two.", beats: [{ type: "write", text: "x = 3" }] })).toThrow("anchor");
});

test("a result anchor cannot include a prediction question", () => {
  expect(() => planTeachingSteps({ chapter: "t", narration: "What is five minus two? It is three.", beats: [{ type: "write", text: "5 - 2 = 3", say: "What is five minus two? It is three." }] })).toThrow("question");
});

test("each writing operation owns its following decoration", () => {
  const steps = planTeachingSteps({ chapter: "Solve", narration: "Subtract two from both sides. This leaves x equals three.", beats: [{ type: "write", text: "5 - 2", say: "Subtract two from both sides." }, { type: "newline" }, { type: "write", text: "x = 3", say: "This leaves x equals three." }, { type: "box" }] });
  expect(steps).toHaveLength(2);
  expect(steps[1].beats.map(b => b.type)).toEqual(["write", "box"]);
});

test("asking for an arithmetic prediction after displaying that calculation's result is invalid", () => {
  expect(() => planTeachingSteps({chapter:"Subtract",narration:"Five minus two equals three. What is five minus two?",beats:[{type:"write",text:"5 - 2 = 3",say:"Five minus two equals three."}]})).toThrow("already revealed");
});
