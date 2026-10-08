import { expect, test } from "bun:test";
import { SceneAudio } from "../src/lib/video/audio";

test("paused seeking updates speech position and muting preserves continuous playback", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "Audio");
  class FakeAudio {
    currentTime = 0; duration = 20; paused = true; muted = false; playbackRate = 1;
    src = ""; preload = ""; dataset: Record<string, string> = {};
    pauses = 0; plays = 0;
    pause() { this.pauses++; this.paused = true; }
    play() { this.plays++; this.paused = false; return Promise.resolve(); }
  }
  Object.defineProperty(globalThis, "Audio", { configurable: true, value: FakeAudio });
  try {
    const manager = new SceneAudio();
    const a = manager.attach(0, "fixture.wav", 20) as unknown as FakeAudio;
    manager.tick(0, 5, false, 1, false);
    expect(a.currentTime).toBe(5);
    expect(a.paused).toBe(true);
    manager.tick(0, 5, true, 1, false);
    expect(a.paused).toBe(false);
    a.currentTime = 5.1;
    manager.tick(0, 5.1, true, 1.5, true);
    expect(a.paused).toBe(false);
    expect(a.muted).toBe(true);
    expect(a.playbackRate).toBe(1.5);
    expect(a.pauses).toBe(0);
    manager.tick(0, 5.1, true, 1.5, false);
    expect(a.plays).toBe(1);
    expect(a.muted).toBe(false);
  } finally {
    if (original) Object.defineProperty(globalThis, "Audio", original);
    else Reflect.deleteProperty(globalThis, "Audio");
  }
});
