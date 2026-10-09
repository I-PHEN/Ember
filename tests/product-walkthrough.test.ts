import { expect, test } from "bun:test";
import { TOUR_LESSON, cursorAt, scrollWalkthroughProgress, walkthroughState, WALKTHROUGH_PROMPT } from "../src/lib/product-walkthrough";
import { compileTimeline } from "../src/lib/video/compile";
import fs from "node:fs";

test("loop stages and typed question are deterministic at boundaries", () => {
  expect([0, 4 / 29, 8 / 29, 22 / 29, 1].map(p => walkthroughState(p).stage)).toEqual([0, 1, 2, 3, 3]);
  expect(walkthroughState(3 / 29).typed).toBe(WALKTHROUGH_PROMPT);
  expect(walkthroughState(-1).typed).toBe("");
  expect(walkthroughState(NaN).stage).toBe(0);
  expect(walkthroughState(1).boardTime).toBe(14);
});
test("the silent excerpt compiles through the real player engine", () => {
  const timeline = compileTimeline(TOUR_LESSON);
  expect(timeline.scenes[0].writeEnd).toBeGreaterThan(0);
  expect(timeline.scenes[0].writeEnd).toBeLessThanOrEqual(14);
  expect(Number.isFinite(timeline.scenes[0].dur)).toBe(true);
  expect(TOUR_LESSON.scenes[0].narration).toBe("");
});
test("four scroll segments match four product stages, including reverse travel", () => {
  const forward = [.1, .3, .6, .9].map(p => walkthroughState(scrollWalkthroughProgress(p)).stage);
  const backward = [.9, .6, .3, .1].map(p => walkthroughState(scrollWalkthroughProgress(p)).stage);
  expect(forward).toEqual([0, 1, 2, 3]);
  expect(backward).toEqual([3, 2, 1, 0]);
  for (let p = 0; p <= 1; p += .01) {
    const position = cursorAt(p);
    expect(Number.isFinite(position.x + position.y)).toBe(true);
    expect(position.contact).toBeGreaterThanOrEqual(0);
    expect(position.contact).toBeLessThanOrEqual(1);
    expect(cursorAt(p)).toEqual(position);
  }
});
test("cursor overlaps contact before travel ends and clamps overscroll", () => {
  expect(cursorAt(.145).contact).toBeGreaterThan(0);
  expect(cursorAt(1).contact).toBe(1);
  expect(cursorAt(2)).toEqual(cursorAt(1));
  expect(cursorAt(-1)).toEqual(cursorAt(0));
});
test("input keeps its outer focus indicator and scroll scene has a static alternative", () => {
  const css = fs.readFileSync("src/app/globals.css", "utf8");
  expect(css).toContain(".landing-composer textarea:focus-visible { outline: none");
  expect(css).toContain(".landing-composer:focus-within");
  const scroll = fs.readFileSync("src/components/landing/ScrollLearningFlow.tsx", "utf8");
  expect(scroll).toContain("useScroll");
  expect(scroll).toContain("useSpring");
  expect(scroll).toContain("static-learning-flow");
  expect(scroll).not.toContain("setInterval");
  expect(scroll).not.toContain("requestAnimationFrame");
});
