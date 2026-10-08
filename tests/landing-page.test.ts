import { describe, it, expect } from "bun:test";
import fs from "node:fs";
import { LANDING_LESSON } from "../src/lib/landing-lesson";
import { compileTimeline, setSceneAudio } from "../src/lib/video/compile";
import { recognizedPhrasesForScene, validateRecognizedTiming } from "../src/lib/video/speech-alignment";

describe("lesson-first landing", () => {
  const page = fs.readFileSync("src/app/page.tsx", "utf8");
  const preview = fs.readFileSync("src/components/landing/LessonPreview.tsx", "utf8");
  const player = fs.readFileSync("src/components/player/SolvePlayer.tsx", "utf8");
  const tracks = JSON.parse(fs.readFileSync("public/lessons/matrix-preview/tracks.json", "utf8"));
  it("uses the production player and saved speech rather than a simulated tour", () => {
    expect(page).not.toContain("RemotionHeroPlayer");
    expect(page).not.toContain("ToggleDemo");
    expect(preview).toContain("<SolvePlayer");
    expect(preview).toContain("narrationTracks={tracks}");
    expect(player).toContain("Missing saved narration track");
  });
  it("labels comparison and roadmap honestly", () => {
    expect(page).toContain("Illustrative response");
    expect(page).toContain("Chat models can explain steps, too.");
    expect(page.match(/>Planned</g)?.length).toBe(2);
    expect(page).toContain("Current focus");
    expect(page).toContain("not a claim of measured learning gains");
    expect(page).not.toContain("any STEM problem");
  });
  it("packages valid recordings for every narrated scene with feasible measured timing", () => {
    expect(tracks.length).toBe(LANDING_LESSON.scenes.length);
    const tl = compileTimeline(LANDING_LESSON);
    tracks.forEach((track: typeof tracks[number], index: number) => {
      const scene = LANDING_LESSON.scenes[index];
      expect(track.text).toBe(scene.narration);
      expect(fs.statSync(`public${track.url}`).size).toBeGreaterThan(1000);
      expect(validateRecognizedTiming(track.text, track.alignment.words, track.alignment.duration)).not.toBeNull();
      const phrases = recognizedPhrasesForScene(scene, index, track.alignment.words, track.alignment.duration, 1);
      expect(phrases).not.toBeNull();
      expect(setSceneAudio(tl, index, track.alignment.duration, phrases!)).toBe(true);
      expect(tl.scenes[index].timing?.feasibility).toBe("fits");
    });
  });
  it("links to a real explanation instead of an unfinished page", () => {
    const how = fs.readFileSync("src/app/how-it-works/page.tsx", "utf8");
    expect(how).not.toContain("Coming soon");
    expect(how).toContain("AI-generated lessons can still contain mistakes");
  });
});
