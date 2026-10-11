import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import LandingPage from "../src/app/page";
import { AuthProvider } from "../src/lib/firebase/auth-context";

type Section = { tag: string; start: number; end: number };

// Track nested rendered sections so moving the film outside the hero is caught,
// even when the film's own section still immediately follows the question.
function inspectSections(html: string) {
  const sections: Section[] = [];
  const stack: Section[] = [];
  const videos: { start: number; ancestors: Section[] }[] = [];
  for (const match of html.matchAll(/<section\b[^>]*>|<\/section>|<video\b[^>]*>/g)) {
    if (match[0] === "</section>") {
      const section = stack.pop();
      if (!section) throw new Error("Unexpected closing section");
      section.end = match.index + match[0].length;
    } else if (match[0].startsWith("<video")) {
      videos.push({ start: match.index, ancestors: [...stack] });
    } else {
      const section = { tag: match[0], start: match.index, end: -1 };
      sections.push(section);
      stack.push(section);
    }
  }
  if (stack.length) throw new Error("Unclosed rendered section");
  return { sections, videos };
}

test("keeps the film in the question hero before comparison and community", () => {
  const html = renderToStaticMarkup(<AuthProvider><LandingPage /></AuthProvider>);
  const { sections, videos } = inspectSections(html);
  const hero = sections.find(section => /class="[^"]*\blanding-hero\b/.test(section.tag));
  const comparison = sections.find(section => section.tag.includes('id="comparison"'));
  const community = sections.find(section => /class="[^"]*\bcommunity-journey\b/.test(section.tag));
  expect(hero).toBeDefined();
  expect(videos).toHaveLength(1);
  expect(videos[0].ancestors).toContain(hero!);

  const question = html.match(/<textarea\b[^>]*id="lesson-question"[^>]*>/);
  expect(question).not.toBeNull();
  expect(question![0]).toContain('rows="4"');
  expect(question!.index!).toBeGreaterThan(hero!.start);
  expect(question!.index!).toBeLessThan(videos[0].start);
  expect(comparison).toBeDefined();
  expect(community).toBeDefined();
  expect(comparison!.start).toBeGreaterThanOrEqual(hero!.end);
  expect(community!.start).toBeGreaterThanOrEqual(comparison!.end);
  expect(html).not.toContain("hero-gallery-invitation");
  expect(html.slice(community!.start, community!.end)).toContain('href="/gallery"');
  expect(html).toContain('src="/media/ember-launch.mp4"');
  expect(html).toContain('src="/media/ember-launch.vtt"');
  expect(html).toContain('href="/media/ember-launch.mp4" download="ember-launch.mp4"');
  expect(html).toContain('href="/media/ember-launch-transcript.txt" download="ember-launch-transcript.txt"');
});
