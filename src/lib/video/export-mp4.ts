import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { renderFrame } from "./render";
import {
  totalDuration,
  sceneStart,
  type Timeline,
  type BoardTheme,
} from "./types";

export interface ExportOptions {
  fps?: number;
  width?: number;
  height?: number;
  bitrate?: number;
  audioUrls?: string[];
  onProgress?: (progress: number) => void;
}

/**
 * Checks whether client-side WebCodecs MP4 export is supported in the current environment.
 */
export function isExportSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof VideoEncoder !== "undefined" &&
    typeof VideoFrame !== "undefined"
  );
}

/**
 * Trigger browser file download from a Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Export an Ember SolveTimeline to an MP4 video file in the browser using WebCodecs.
 */
export async function exportTimelineToMp4(
  tl: Timeline,
  theme: BoardTheme,
  options: ExportOptions = {}
): Promise<Blob> {
  if (!isExportSupported()) {
    throw new Error(
      "WebCodecs VideoEncoder is not supported in this browser. Please use Chrome, Edge, or a modern Chromium browser."
    );
  }

  const fps = options.fps ?? 30;
  const width = options.width ?? 1280;
  const height = options.height ?? 720;
  const bitrate = options.bitrate ?? 3_500_000;
  const totalDur = totalDuration(tl);
  const totalFrames = Math.max(1, Math.ceil(totalDur * fps));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not create 2D canvas context for video export");

  // Mix audio if available
  let audioBuffer: AudioBuffer | null = null;
  const hasAudioEncoder = typeof AudioEncoder !== "undefined";

  if (options.audioUrls && options.audioUrls.length && typeof OfflineAudioContext !== "undefined") {
    try {
      const actx = new AudioContext({ sampleRate: 24000 });
      const decodedBuffers: Array<{ idx: number; buf: AudioBuffer }> = [];

      await Promise.all(
        options.audioUrls.map(async (url, idx) => {
          if (!url) return;
          try {
            const resp = await fetch(url);
            if (!resp.ok) return;
            const ab = await resp.arrayBuffer();
            const decoded = await actx.decodeAudioData(ab);
            decodedBuffers.push({ idx, buf: decoded });
          } catch {}
        })
      );

      if (decodedBuffers.length > 0) {
        const offline = new OfflineAudioContext(
          1,
          Math.max(1, Math.ceil(totalDur * 24000)),
          24000
        );
        for (const { idx, buf } of decodedBuffers) {
          const startSec = sceneStart(tl, idx);
          const src = offline.createBufferSource();
          src.buffer = buf;
          src.connect(offline.destination);
          src.start(startSec);
        }
        audioBuffer = await offline.startRendering();
      }
      await actx.close();
    } catch (e) {
      console.warn("Audio mixing fallback:", e);
    }
  }

  const target = new ArrayBufferTarget();
  const includeAudio = !!audioBuffer && hasAudioEncoder;

  const muxer = new Muxer({
    target,
    video: {
      codec: "avc",
      width,
      height,
    },
    audio: includeAudio
      ? {
          codec: "aac",
          numberOfChannels: 1,
          sampleRate: 24000,
        }
      : undefined,
    fastStart: "in-memory",
  });

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error("VideoEncoder error:", e),
  });

  videoEncoder.configure({
    codec: "avc1.42001f",
    width,
    height,
    bitrate,
    framerate: fps,
  });

  // Render and encode video frames
  for (let f = 0; f < totalFrames; f++) {
    const t = f / fps;
    renderFrame(ctx, tl, t, theme, { pen: false });

    const timestampMicros = Math.round(t * 1_000_000);
    const frame = new VideoFrame(canvas, { timestamp: timestampMicros });
    videoEncoder.encode(frame, { keyFrame: f % (fps * 2) === 0 });
    frame.close();

    if (f % 5 === 0) {
      options.onProgress?.(Math.min(0.9, (f / totalFrames) * 0.9));
      // Give the event loop room to breathe
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  await videoEncoder.flush();
  videoEncoder.close();

  // Encode audio if present
  if (includeAudio && audioBuffer) {
    const audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: (e) => console.error("AudioEncoder error:", e),
    });

    audioEncoder.configure({
      codec: "mp4a.40.2",
      sampleRate: 24000,
      numberOfChannels: 1,
      bitrate: 64000,
    });

    const channelData = audioBuffer.getChannelData(0);
    const chunkSize = 2400; // 100ms chunks at 24kHz
    for (let offset = 0; offset < channelData.length; offset += chunkSize) {
      const slice = channelData.slice(offset, offset + chunkSize);
      const audioData = new AudioData({
        format: "f32",
        sampleRate: 24000,
        numberOfFrames: slice.length,
        numberOfChannels: 1,
        timestamp: Math.round((offset / 24000) * 1_000_000),
        data: slice,
      });
      audioEncoder.encode(audioData);
      audioData.close();
    }

    await audioEncoder.flush();
    audioEncoder.close();
  }

  options.onProgress?.(1.0);
  muxer.finalize();

  return new Blob([target.buffer], { type: "video/mp4" });
}
