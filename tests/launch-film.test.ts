import { expect, test } from "bun:test";
import { getFilmState, showcase, showcaseTimeline } from "../tooling/launch-film/story";
import { scoreSample } from "../tooling/launch-film/score";

test("film clock clamps invalid time and selects new scenes at boundaries", () => {
  for (const t of [-1, NaN, Infinity, -Infinity]) {
    expect(getFilmState(t)).toMatchObject({ scene: "question", local: 0 });
  }
  expect(getFilmState(14)).toMatchObject({ scene: "lesson", local: 0 });
  expect(getFilmState(28)).toMatchObject({ scene: "revisit", local: 0 });
  expect(getFilmState(100)).toMatchObject({ scene: "close", local: 4 });
  for (let t = 0; t < 60; t += .13) {
    const state = getFilmState(t);
    expect(state.local).toBeGreaterThanOrEqual(0);
    expect(state.local).toBeLessThanOrEqual(state.duration);
  }
});

test("showcase teaches both sides of one equation without a title beat", () => {
  const beats = showcase.scenes.flatMap(scene => scene.beats);
  expect(beats.some(beat => beat.type === "title")).toBe(false);
  expect(beats.filter(beat => beat.type === "write").map(beat => beat.text)).toEqual([
    "x + 2 = 5", "x + 2 - 2 = 5 - 2", "x = 3",
  ]);
  const strokes = showcaseTimeline.scenes.flatMap(scene => scene.strokes);
  expect(strokes.length).toBeGreaterThan(20);
  for (const stroke of strokes) {
    expect(Number.isFinite(stroke.t0)).toBe(true);
    expect(Number.isFinite(stroke.dur)).toBe(true);
    expect(stroke.dur).toBeGreaterThanOrEqual(0);
  }
});

test("original score is finite, bounded, and fades at both ends", () => {
  expect(scoreSample(0, 0)).toBe(0);
  expect(scoreSample(52, 1)).toBe(0);
  let energy = 0;
  for (let i = 0; i < 52000; i++) {
    const sample = scoreSample(i / 1000, i % 2);
    expect(Number.isFinite(sample)).toBe(true);
    expect(Math.abs(sample)).toBeLessThanOrEqual(.8);
    energy += sample * sample;
  }
  expect(energy).toBeGreaterThan(10);
});
