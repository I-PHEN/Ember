import { expect, test } from "bun:test";
import { recordVoiceResult, finishVoicing } from "../src/lib/video/voice-completion";

function job() {
  return { phase: "voicing" as "voicing" | "ready" | "error", error: null as string | null,
    voicesTotal: 2, voicesDone: 0, voiceFailures: [] as number[], readyAt: null as number | null };
}

test("failed audio is recorded without increasing successful audio count", () => {
  const j = job();
  recordVoiceResult(j, 0, false);
  recordVoiceResult(j, 1, true);
  finishVoicing(j, 123);
  expect(j.voicesDone).toBe(1);
  expect(j.voiceFailures).toEqual([0]);
  expect(j.phase).toBe("error");
  expect(j.error).toBeTruthy();
  expect(j.readyAt).toBeNull();
});

test("all required successful voices allow ready", () => {
  const j = job();
  recordVoiceResult(j, 0, true);
  recordVoiceResult(j, 1, true);
  finishVoicing(j, 123);
  expect(j.phase).toBe("ready");
  expect(j.readyAt).toBe(123);
  expect(j.error).toBeNull();
});

test("incomplete voices cannot become ready even without a recorded failure", () => {
  const j = job();
  finishVoicing(j, 123);
  expect(j.phase).toBe("error");
  expect(j.readyAt).toBeNull();
});

test("late voice completion cannot resurrect an already failed job", () => {
  const j = job();
  j.phase = "error";
  j.error = "generation timed out";
  j.voicesDone = 2;
  finishVoicing(j, 123);
  expect(j.phase).toBe("error");
  expect(j.error).toBe("generation timed out");
});
