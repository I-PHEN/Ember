import { expect, test } from "bun:test";
import { PlaybackFrameClock } from "../src/lib/video/playback-clock";

test("a stalled frame retains time while narration is already playing", () => {
  const clock = new PlaybackFrameClock();
  expect(clock.elapsed(1000, 0, true)).toBe(0);
  expect(clock.elapsed(1650, 0, true)).toBeCloseTo(.65);
});
test("loading time cannot skip a scene when audio becomes ready between frames", () => {
  const clock = new PlaybackFrameClock();
  clock.elapsed(1000, 0, false);
  expect(clock.elapsed(31000, 0, true)).toBe(0);
  expect(clock.elapsed(31016, 0, true)).toBeCloseTo(.016);
  expect(clock.elapsed(41000, 1, true)).toBe(0);
});
test("pausing and explicit seeks discard old frame intervals", () => {
  const clock = new PlaybackFrameClock();
  clock.elapsed(1000, 0, true);
  clock.elapsed(1100, 0, false);
  expect(clock.elapsed(11000, 0, true)).toBe(0);
  clock.reset();
  expect(clock.elapsed(12000, 0, true)).toBe(0);
});
test("scene handoff starts audio only after its clock starts, preserving the following stalled frame", () => {
  const clock = new PlaybackFrameClock();
  clock.elapsed(1000, 0, true);
  // Frame reached the next scene: its audio must remain paused this frame.
  expect(clock.isRunningScene(1)).toBe(false);
  expect(clock.elapsed(1650, 1, true)).toBe(0);
  expect(clock.isRunningScene(1)).toBe(true);
  // Its audio starts now; a subsequent slow frame retains all elapsed time.
  expect(clock.elapsed(2300, 1, true)).toBeCloseTo(.65);
  clock.elapsed(2400, 1, false);
  expect(clock.isRunningScene(1)).toBe(false);
});
