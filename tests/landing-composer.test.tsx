import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import LandingComposer, { shouldSubmitComposerOnEnter } from "../src/components/landing/LandingComposer";

const noop = () => {};

function renderComposer(question: string, busy = false) {
  return renderToStaticMarkup(
    <LandingComposer question={question} busy={busy} onChange={noop} onSubmit={noop} onAttach={noop} />,
  );
}

test("matches studio composer controls and reports the prompt length", () => {
  const html = renderComposer("Explain a derivative");

  expect(html).toContain('aria-label="Your question"');
  expect(html).toContain("Paste any math, physics, chemistry, or engineering problem…");
  expect(html).toContain("20/600");
  expect(html).toContain("Start lesson");
  expect(html).toContain("Attach an image in the studio");
  expect(html).toContain("min-h-[64px] sm:min-h-[72px]");
  expect(html).toContain("h-8 rounded-xl");
});

test("disables lesson submission for empty, oversized, and busy prompts", () => {
  const submitIsDisabled = (html: string) => /<button[^>]* type="submit"[^>]* disabled/.test(html);
  expect(submitIsDisabled(renderComposer(""))).toBe(true);
  expect(submitIsDisabled(renderComposer("x".repeat(601)))).toBe(true);
  expect(submitIsDisabled(renderComposer("x", true))).toBe(true);
  expect(submitIsDisabled(renderComposer("x".repeat(600)))).toBe(false);
});

test("uses studio Enter shortcuts without swallowing multiline input or IME composition", () => {
  const keyEvent = (overrides: Partial<KeyboardEvent>) => ({
    key: "Enter",
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    isComposing: false,
    ...overrides,
  }) as KeyboardEvent;

  expect(shouldSubmitComposerOnEnter(keyEvent({}))).toBe(true);
  expect(shouldSubmitComposerOnEnter(keyEvent({ shiftKey: true }))).toBe(false);
  expect(shouldSubmitComposerOnEnter(keyEvent({ shiftKey: true, ctrlKey: true }))).toBe(true);
  expect(shouldSubmitComposerOnEnter(keyEvent({ metaKey: true, isComposing: true }))).toBe(false);
  expect(shouldSubmitComposerOnEnter(keyEvent({ key: "a", ctrlKey: true }))).toBe(false);
});
