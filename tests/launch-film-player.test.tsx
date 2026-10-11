import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import LaunchFilm from "../src/components/landing/LaunchFilm";
import LearningComparison from "../src/components/landing/LearningComparison";

describe("homepage launch film", () => {
  test("offers a poster and native playback without loading or playing on mount", () => {
    const html = renderToStaticMarkup(<LaunchFilm />);
    const video = html.match(/<video\b[^>]*>/)?.[0] ?? "";
    expect(video).toContain("controls=\"\"");
    expect(video).toContain("preload=\"none\"");
    expect(video).toContain("playsInline=\"\"");
    expect(video).toContain("poster=\"/media/ember-launch-poster.jpg\"");
    expect(video.toLowerCase()).not.toContain("autoplay");
    expect(html).toContain('src="/media/ember-launch.mp4" type="video/mp4"');
  });

  test("makes captions and independent downloadable media available", () => {
    const html = renderToStaticMarkup(<LaunchFilm />);
    expect(html).toContain('kind="captions"');
    expect(html).toContain('src="/media/ember-launch.vtt"');
    expect(html).toContain('srcLang="en"');
    expect(html).toMatch(/<a[^>]*href="\/media\/ember-launch.mp4"[^>]*download=/);
    expect(html).toMatch(/<a[^>]*href="\/media\/ember-launch-transcript.txt"[^>]*download=/);
    expect(html).toContain("0:52");
    expect(html).toContain("Edited product demonstration");
  });
});

describe("same-problem lesson comparison", () => {
  test("renders a complete worked integral and differentiation check", () => {
    const html = renderToStaticMarkup(<LearningComparison />);
    expect(html).toContain("du = dx");
    expect(html).toContain("v = ½e");
    expect(html).toContain("− ¼e");
    expect(html).toContain("+ C");
    expect(html).toContain("Check by differentiating");
    expect(html).toContain("½e");
    expect(html).toContain("− ½e");
  });

  test("offers honest prepared learning moments with the real excerpt paused", () => {
    const html = renderToStaticMarkup(<LearningComparison />);
    expect(html).toContain("Follow the derivation");
    expect(html).toContain("Revisit u / dv");
    expect(html).toContain("Ask why");
    expect(html).toContain("Prepared");
    expect(html).toContain("silent excerpt");
    expect(html).toContain('aria-label="Play"');
    expect(html).not.toContain('aria-label="Pause"');
    expect(html).toContain("Chat models can teach steps too");
  });
});

describe("community section hydration", () => {
  test("renders the same initial community markup when the browser allows motion", async () => {
    // Framer reads matchMedia at module initialization. Separate real render
    // processes preserve the server's null and the browser's false hook values.
    const render = async (browser: boolean) => {
      const source = `${browser ? 'globalThis.window = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) };' : ""}
        const { createElement } = await import("react");
        const { renderToStaticMarkup } = await import("react-dom/server");
        const { default: CommunityJourney } = await import("./src/components/landing/CommunityJourney.tsx");
        process.stdout.write(renderToStaticMarkup(createElement(CommunityJourney)));
        process.exit(0);
      `;
      const child = Bun.spawn([process.execPath, "-e", source], {
        cwd: fileURLToPath(new URL("../", import.meta.url)),
        stdout: "pipe",
        stderr: "pipe",
      });
      const [html, errors, exitCode] = await Promise.all([
        new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
      ]);
      expect(errors).toBe("");
      expect(exitCode).toBe(0);
      return html;
    };
    const server = await render(false);
    const initialBrowser = await render(true);
    expect(initialBrowser).toBe(server);
    expect(initialBrowser).toContain("Find a question like yours.");
    expect(initialBrowser).toContain('href="/gallery"');
  }, 30000);
});
