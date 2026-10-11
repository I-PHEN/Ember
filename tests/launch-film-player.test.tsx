import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import LaunchFilm from "../src/components/landing/LaunchFilm";
import * as filmModule from "../src/components/landing/LaunchFilm";
import LearningComparison from "../src/components/landing/LearningComparison";

describe("homepage launch film", () => {
  test("motion preference starts playback muted by the markup and stops automatic playback when reduced", async () => {
    expect(typeof filmModule.bindFilmMotion).toBe("function");
    let listener: (() => void) | undefined;
    let plays = 0;
    let pauses = 0;
    const video = { autoPlay: false, play: async () => { plays++; }, pause: () => { pauses++; } };
    const preference = {
      matches: true,
      addEventListener: (_type: string, callback: () => void) => { listener = callback; },
      removeEventListener: (_type: string, callback: () => void) => { if (listener === callback) listener = undefined; },
    };
    const cleanup = filmModule.bindFilmMotion(video, preference);
    expect(video.autoPlay).toBe(false);
    expect(plays).toBe(0);
    preference.matches = false;
    listener!();
    expect(video.autoPlay).toBe(true);
    expect(plays).toBe(1);
    preference.matches = true;
    listener!();
    expect(video.autoPlay).toBe(false);
    expect(pauses).toBe(2);
    cleanup();
    expect(listener).toBeUndefined();
  });

  test("blocked autoplay leaves manual controls available without an unhandled rejection", async () => {
    expect(typeof filmModule.bindFilmMotion).toBe("function");
    let rejectedPlay = false;
    const video = { autoPlay: false, play: async () => { rejectedPlay = true; throw new Error("Autoplay blocked"); }, pause() {} };
    const cleanup = filmModule.bindFilmMotion(video, { matches: false, addEventListener() {}, removeEventListener() {} });
    await Promise.resolve();
    expect(rejectedPlay).toBe(true);
    expect(renderToStaticMarkup(<LaunchFilm />)).toContain('controls=""');
    cleanup();
  });
  test("offers muted native playback with hydration-safe initial autoplay disabled", () => {
    const html = renderToStaticMarkup(<LaunchFilm />);
    const video = html.match(/<video\b[^>]*>/)?.[0] ?? "";
    expect(video).toContain("controls=\"\"");
    expect(video).toContain("preload=\"metadata\"");
    expect(video).toContain('muted=""');
    expect(video).toContain('controlsList="nodownload"');
    expect(video).not.toContain('loop=""');
    expect(video).toContain("playsInline=\"\"");
    expect(video).toContain("poster=\"/media/ember-launch-poster.jpg\"");
    expect(video.toLowerCase()).not.toContain("autoplay");
    expect(html).toContain('src="/media/ember-launch.mp4" type="video/mp4"');
  });

  test("keeps captions and disclosure without download links", () => {
    const html = renderToStaticMarkup(<LaunchFilm />);
    expect(html).toContain('kind="captions"');
    expect(html).toContain('src="/media/ember-launch.vtt"');
    expect(html).toContain('srcLang="en"');
    expect(html).not.toMatch(/<a\b[^>]*download=/);
    expect(html).toContain("0:52");
    expect(html).toContain("Edited product demonstration");
  });
});

describe("same-problem lesson comparison", () => {
  test("compares the worked answer with exploring the same mathematical decision", () => {
    const html = renderToStaticMarkup(<LearningComparison />);
    expect(html).toContain("du = dx");
    expect(html).toContain("v = ½e");
    expect(html).toContain("− ¼e");
    expect(html).toContain("+ C");
    expect(html).toContain("Getting an answer");
    expect(html).toContain("understanding the step");
    expect(html).toContain("Worked answer");
  });

  test("offers honest prepared learning moments with the real excerpt paused", () => {
    const html = renderToStaticMarkup(<LearningComparison />);
    expect(html).toContain("Follow the reasoning");
    expect(html).toContain("Revisit the decision");
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
