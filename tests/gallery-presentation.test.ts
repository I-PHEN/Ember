import { describe, it, expect } from "bun:test";
import fs from "node:fs";
import { galleryPublisher, galleryScene } from "../src/lib/gallery-presentation";
describe("community presentation", () => {
  it("preserves real names and replaces legacy generic identities", () => {
    expect(galleryPublisher("  Michael ")).toBe("Michael");
    expect(galleryPublisher("Community Scholar")).toBe("Ember Community");
    expect(galleryPublisher(null)).toBe("Ember Community");
  });
  it("uses one reversible finite scroll clock", () => {
    for (const p of [0, .2, .5, .9, 1, -1, 4, NaN]) {
      const state = galleryScene(p);
      expect(Number.isFinite(state.x + state.y)).toBe(true);
      expect(state.contact).toBeGreaterThanOrEqual(0);
      expect(state.contact).toBeLessThanOrEqual(1);
      expect(galleryScene(p)).toEqual(state);
    }
    expect(galleryScene(1).contact).toBe(1);
  });
  it("renders math, scrolls explicitly and avoids a duplicated explanation link", () => {
    const page = fs.readFileSync("src/app/page.tsx", "utf8");
    expect(page).toContain("scrollIntoView");
    expect(page).not.toContain("How Ember builds a lesson");
    expect(page).toContain("<CommunityJourney");
    expect(fs.readFileSync("src/components/MathCopy.tsx", "utf8")).toContain("rehypeKatex");
    const journey = fs.readFileSync("src/components/landing/CommunityJourney.tsx", "utf8");
    expect(journey).toContain("useReducedMotion");
    expect(journey).not.toContain("setInterval");
  });
});
