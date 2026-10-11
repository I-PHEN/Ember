import { expect, test } from "bun:test";
import { getFilmState, showcase, showcaseTimeline } from "../tooling/launch-film/story";
import { scoreSample } from "../tooling/launch-film/score";
import { verifyFilmExport } from "../tooling/launch-film/verification";

test("film verification rejects wrong container, range, frame rate, and duration", () => {
  const atom = (name: string, payload = "") => {
    const bytes = Buffer.alloc(8 + payload.length);
    bytes.writeUInt32BE(bytes.length); bytes.write(name, 4); bytes.write(payload, 8);
    return bytes;
  };
  const mp4 = Buffer.concat([atom("ftyp", "isom0000mp41"), atom("moov"), atom("mdat")]);
  const valid = "Duration: 00:00:52.00\nVideo: h264 (High), yuv420p(tv, bt709, progressive), 1920x1080, 30 fps\nAudio: aac (LC)";
  expect(() => verifyFilmExport(valid, mp4)).not.toThrow();
  expect(() => verifyFilmExport(valid, Buffer.from("not an MP4"))).toThrow();
  expect(() => verifyFilmExport(valid, Buffer.concat([atom("ftyp", "qt  0000qt  "), atom("moov"), atom("mdat")]))).toThrow();
  for (const metadata of [valid.replace("yuv420p(tv", "yuvj420p(pc"), valid.replace("30 fps", "24 fps"), valid.replace("52.00", "52.50"), valid.replace("Video: h264", "Video: hevc"), valid.replace("Audio: aac", "Audio: mp3")]) {
    expect(() => verifyFilmExport(metadata, mp4)).toThrow();
  }
});

test.skipIf(!process.env.FFMPEG_PATH)("exported film decodes as limited-range yuv420p for browser compatibility", async () => {
  const proc = Bun.spawn([process.env.FFMPEG_PATH!, "-hide_banner", "-i", "public/media/ember-launch.mp4", "-frames:v", "1", "-an", "-f", "null", "-"], { stdout: "ignore", stderr: "pipe" });
  const metadata = await new Response(proc.stderr).text();
  expect(await proc.exited).toBe(0);
  expect(metadata).toMatch(/Video: h264[^\n]*yuv420p\(tv, bt709/);
  expect(metadata).not.toMatch(/Video: h264[^\n]*yuvj420p/);
});

test("film clock clamps invalid time and selects new scenes at boundaries", () => {
  for (const t of [-1, NaN, Infinity, -Infinity]) {
    expect(getFilmState(t)).toMatchObject({ scene: "question", local: 0 });
  }
  expect(getFilmState(14)).toMatchObject({ scene: "lesson", local: 0 });
  expect(getFilmState(28)).toMatchObject({ scene: "revisit", local: 0 });
  expect(getFilmState(100)).toMatchObject({ scene: "close", local: 4 });
  for (let t = 0; t < 60; t += .13) {
    const state = getFilmState(t);
    expect(state.local).toBeGreaterThanOrEqual(0);
    expect(state.local).toBeLessThanOrEqual(state.duration);
  }
});

test("showcase teaches both sides of one equation without a title beat", () => {
  const beats = showcase.scenes.flatMap(scene => scene.beats);
  expect(beats.some(beat => beat.type === "title")).toBe(false);
  expect(beats.filter(beat => beat.type === "write").map(beat => beat.text)).toEqual([
    "x + 2 = 5", "x + 2 - 2 = 5 - 2", "x = 3",
  ]);
  const strokes = showcaseTimeline.scenes.flatMap(scene => scene.strokes);
  expect(strokes.length).toBeGreaterThan(20);
  for (const stroke of strokes) {
    expect(Number.isFinite(stroke.t0)).toBe(true);
    expect(Number.isFinite(stroke.dur)).toBe(true);
    expect(stroke.dur).toBeGreaterThanOrEqual(0);
  }
});

test("original score is finite, bounded, and fades at both ends", () => {
  expect(scoreSample(0, 0)).toBe(0);
  expect(scoreSample(52, 1)).toBe(0);
  let energy = 0;
  for (let i = 0; i < 52000; i++) {
    const sample = scoreSample(i / 1000, i % 2);
    expect(Number.isFinite(sample)).toBe(true);
    expect(Math.abs(sample)).toBeLessThanOrEqual(.8);
    energy += sample * sample;
  }
  expect(energy).toBeGreaterThan(10);
});
