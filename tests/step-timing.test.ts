import { expect, test } from "bun:test";
import { stepTiming } from "../src/lib/video/step-timing";

test("measured speech replaces estimated duration without a silent tail", () => {
  expect(stepTiming(.08, 8, "explain")).toEqual({ speechRate: .9, duration: 8 / .9 + .15 });
});
test("short speech slows within a natural range instead of accelerating ink", () => {
  const t = stepTiming(10, 8, "work");
  expect(t.speechRate).toBe(.8);
  expect(t.duration).toBe(10.15);
});
test("an impossible speech/ink pairing fails rather than rushing or stretching silence", () => {
  expect(() => stepTiming(20, 3, "work")).toThrow("too short");
});
test("only an explicit prediction gets a brief thinking pause", () => {
  expect(stepTiming(.08, 9, "ask").duration).toBe(10.6);
});
