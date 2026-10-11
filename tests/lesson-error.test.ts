import { expect, test } from "bun:test";
import { lessonErrorMessage } from "../src/lib/lesson-error";

test("legacy and missing generation failures give an actionable message without blaming the question", () => {
  const expected="We couldn’t finish generating your lesson. Your question is saved—please try again. You don’t need to change it.";
  expect(lessonErrorMessage("Video generation hit a snag. Please try again.")).toBe(expected);
  expect(lessonErrorMessage(null)).toBe(expected);
});

test("specific existing errors are preserved instead of inventing a cause", () => {
  expect(lessonErrorMessage("You have reached today's lesson limit.")).toBe("You have reached today's lesson limit.");
});
