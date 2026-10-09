import { describe, it, expect } from "bun:test";
import fs from "node:fs";
import { LANDING_LESSON } from "../src/lib/landing-lesson";
import { compileTimeline, setSceneAudio } from "../src/lib/video/compile";
import { recognizedPhrasesForScene, validateRecognizedTiming } from "../src/lib/video/speech-alignment";

describe("lesson-first landing", () => {
  const page = fs.readFileSync("src/app/page.tsx", "utf8");
  const preview = fs.readFileSync("src/components/landing/ProductWalkthrough.tsx", "utf8");
  const player = fs.readFileSync("src/components/player/SolvePlayer.tsx", "utf8");
  const tracks = JSON.parse(fs.readFileSync("public/lessons/matrix-preview/tracks.json", "utf8"));
  it("uses production components for the prepared walkthrough", () => {
    expect(page).not.toContain("RemotionHeroPlayer");
    expect(page).not.toContain("ToggleDemo");
    expect(preview).toContain("<SolvePlayer");
    expect(preview).toContain("<GenerateOverlay");
    expect(preview).toContain("<StudioConsoleTabs");
    expect(preview).toContain("presentationTime=");
    expect(player).toContain("if (mini || presenting) return;");
  });
  it("labels comparison and roadmap honestly", () => {
    const comparison = fs.readFileSync("src/components/landing/LearningComparison.tsx", "utf8");
    expect(comparison).toContain("Illustrative example");
    expect(comparison).toContain("Chat models can teach steps too.");
    expect(comparison).toContain("<SolvePlayer");
    expect(page).not.toContain("learning-roadmap");
    expect(page).not.toContain("Where we’re going");
    expect(page).not.toContain("any STEM problem");
  });
  it("has one product journey and an interactive, board-first comparison", () => {
    const comparison = fs.readFileSync("src/components/landing/LearningComparison.tsx", "utf8");
    expect(page).not.toContain("ProductWalkthrough");
    expect(page).toContain("<ScrollLearningFlow");
    expect(comparison).toContain("Watch the step");
    expect(comparison).toContain("See it complete");
    expect(comparison).toContain("Why this choice?");
    expect(comparison).toContain("Prepared follow-up example");
    expect(comparison).toContain("seekRequest=");
    expect(comparison).toContain("showChapterLabel={false}");
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
