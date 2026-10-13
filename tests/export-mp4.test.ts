import { describe, expect, test } from "bun:test";
import {
  isExportSupported,
  downloadBlob,
  exportTimelineToMp4,
} from "../src/lib/video/export-mp4";
import { THEMES, type Timeline } from "../src/lib/video/types";

describe("Client-side MP4 Export", () => {
  test("isExportSupported reports false in non-browser Node/Bun environment", () => {
    expect(isExportSupported()).toBe(false);
  });

  test("downloadBlob is a safe no-op when window is undefined", () => {
    const dummyBlob = new Blob(["test"], { type: "video/mp4" });
    expect(() => downloadBlob(dummyBlob, "test.mp4")).not.toThrow();
  });

  test("exportTimelineToMp4 throws informative error when WebCodecs is unavailable", async () => {
    const dummyTimeline: Timeline = {
      title: "Test",
      question: "Test question",
      scenes: [],
    };

    expect(
      exportTimelineToMp4(dummyTimeline, THEMES.default)
    ).rejects.toThrow("WebCodecs VideoEncoder is not supported");
  });
});
