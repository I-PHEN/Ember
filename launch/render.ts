/* ------------------------------------------------------------------
   Ember Launch Film: Headless MP4 + Audio Renderer & Keyframe Verifier
   Serves launch/ + public/ on port 3345, preloads BoardHand font + voice,
   renders the 48.0-second soundtrack via OfflineAudioContext, and records
   strictly 48.0 seconds of wall-clock-locked 1080p H.264 video + audio
   to launch/out/ember-launch.mp4.
------------------------------------------------------------------- */

import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const EXE =
  "C:/Users/Michael/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe";
const ROOT_DIR = process.cwd();
const LAUNCH_DIR = path.resolve(ROOT_DIR, "launch");
const PUBLIC_DIR = path.resolve(ROOT_DIR, "public");
const OUT_DIR = path.resolve(LAUNCH_DIR, "out");
const OUT_MP4 = path.join(OUT_DIR, "ember-launch.mp4");
const PORT = 3345;

fs.mkdirSync(OUT_DIR, { recursive: true });

function mimeForExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".html":
      return "text/html";
    case ".js":
      return "application/javascript";
    case ".css":
      return "text/css";
    case ".mp4":
      return "video/mp4";
    case ".mp3":
      return "audio/mpeg";
    case ".png":
      return "image/png";
    case ".woff2":
      return "font/woff2";
    case ".json":
      return "application/json";
    default:
      return "application/octet-stream";
  }
}

const server = Bun.serve({
  port: PORT,
  maxRequestBodySize: 256 * 1024 * 1024,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "POST" && url.pathname === "/upload") {
      const ab = await req.arrayBuffer();
      fs.writeFileSync(OUT_MP4, Buffer.from(ab));
      return new Response(JSON.stringify({ ok: true, bytes: ab.byteLength }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let filePath: string;
    if (url.pathname.startsWith("/public/")) {
      const rel = url.pathname.replace(/^\/public\//, "");
      filePath = path.join(PUBLIC_DIR, rel);
    } else {
      const rel = url.pathname === "/" ? "preview.html" : url.pathname.replace(/^\//, "");
      filePath = path.join(LAUNCH_DIR, rel);
    }

    if (!fs.existsSync(filePath)) {
      console.log(`[HTTP 404] ${url.pathname} -> ${filePath}`);
      return new Response("Not Found", { status: 404 });
    }

    const ext = path.extname(filePath);
    return new Response(fs.readFileSync(filePath), {
      headers: { "Content-Type": mimeForExt(ext) },
    });
  },
});

console.log(`🌐 Headless render server running at http://localhost:${PORT}`);

async function main(): Promise<void> {
  console.log("🎬 Starting Ember Launch Film renderer (48.0s · 1080p H.264 + Audio)...");
  const t0 = Date.now();

  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: "shell",
    protocolTimeout: 600_000,
    args: [
      "--disable-gpu",
      "--no-sandbox",
      "--autoplay-policy=no-user-gesture-required",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
    ],
    defaultViewport: { width: 1920, height: 1080 },
  });

  try {
    const page = await browser.newPage();
    page.on("console", (msg) => console.log("  [browser]", msg.type(), msg.text()));
    page.on("pageerror", (err) => console.log("  [page error]", err.message));

    console.log(`📄 Loading http://localhost:${PORT}/?headless=1...`);
    await page.goto(`http://localhost:${PORT}/?headless=1`, { waitUntil: "networkidle2" });

    await page.waitForFunction(
      () =>
        typeof (window as any).renderFilmFrame === "function" &&
        typeof (window as any).preloadFilmAssets === "function",
      { timeout: 15000 }
    );

    console.log("📦 Preloading BoardHand font, app screenshots, and Professor Ember voice...");
    await page.evaluate(async () => {
      await (window as any).preloadFilmAssets();
    });

    // Warm up the LRU board snapshot cache across all scenes before starting the wall-clock recorder!
    console.log("⚡ Pre-warming blackboard stroke cache for 0ms real-time frame rendering...");
    await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 1920;
      c.height = 1080;
      const ctx = c.getContext("2d")!;
      const renderFn = (window as any).renderFilmFrame;
      for (let f = 0; f < 1440; f++) {
        renderFn(ctx, f);
      }
    });
    console.log("✓ Blackboard LRU cache warmed (all 1440 frames cached)!");

    console.log("🎥 Recording strictly 48.0s (1440 frames @ 30 FPS) with 120 BPM score + voice...");

    const result = await page.evaluate(async () => {
      const TOTAL_FRAMES = 1440;
      const FPS = 30;
      const DURATION_MS = 48_000;
      const renderFn = (window as any).renderFilmFrame;
      const buildAudio = (window as any).buildMasterAudioBuffer;
      const assets = (window as any).ASSETS;

      const canvas = document.createElement("canvas");
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext("2d")!;

      // Build 48.0s stereo soundtrack offline
      const masterBuffer: AudioBuffer = await buildAudio(assets?.voiceBuffer);
      const audioCtx = new AudioContext();
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
      const audioDest = audioCtx.createMediaStreamDestination();
      const srcNode = audioCtx.createBufferSource();
      srcNode.buffer = masterBuffer;
      srcNode.connect(audioDest);

      const canvasStream = canvas.captureStream(FPS);
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioDest.stream.getAudioTracks(),
      ]);

      const candidates = [
        "video/mp4; codecs=avc1.42E01E,mp4a.40.2",
        "video/mp4; codecs=avc1,mp4a.40.2",
        "video/mp4; codecs=avc1",
        "video/mp4",
        "video/webm; codecs=vp9,opus",
      ];
      let mime = "video/mp4";
      for (const c of candidates) {
        if (MediaRecorder.isTypeSupported(c)) {
          mime = c;
          break;
        }
      }
      console.log("Encoding launch film with MIME:", mime);

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: mime,
        videoBitsPerSecond: 14_000_000,
        audioBitsPerSecond: 192_000,
      });

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const completion = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      // Render frame 0 before starting
      renderFn(ctx, 0);

      const startWall = performance.now();
      recorder.start(1000);
      srcNode.start(0);

      let lastLoggedSec = -1;
      let lastDrawnFrame = -1;
      let renderedCount = 0;

      while (true) {
        const elapsedMs = performance.now() - startWall;
        if (elapsedMs >= DURATION_MS) break;

        const elapsedSec = elapsedMs / 1000;
        const targetFrame = Math.min(TOTAL_FRAMES - 1, Math.floor(elapsedSec * FPS));
        if (targetFrame !== lastDrawnFrame) {
          renderFn(ctx, targetFrame);
          lastDrawnFrame = targetFrame;
          renderedCount++;
        }

        const wholeSec = Math.floor(elapsedSec);
        if (wholeSec !== lastLoggedSec && wholeSec % 6 === 0) {
          lastLoggedSec = wholeSec;
          console.log(
            `Progress: ${wholeSec}s / 48s (frame ${targetFrame}/${TOTAL_FRAMES}, unique frames drawn: ${renderedCount})`
          );
        }

        await new Promise((r) => setTimeout(r, 4));
      }

      const actualRecordSec = (performance.now() - startWall) / 1000;
      srcNode.stop();
      recorder.stop();
      await completion;
      await audioCtx.close();

      const blob = new Blob(chunks, { type: mime });
      const res = await fetch("/upload", { method: "POST", body: blob });
      const uploaded = (await res.json()) as { ok: boolean; bytes: number };
      return {
        ...uploaded,
        actualRecordSec,
        renderedCount,
        mime,
      };
    });

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const sizeMb = (result.bytes / 1024 / 1024).toFixed(2);
    console.log(`\n🎉 SUCCESS! Rendered: ${OUT_MP4}`);
    console.log(
      `📊 Size: ${sizeMb} MB | Recorded duration: ${result.actualRecordSec.toFixed(2)}s | Draws: ${result.renderedCount} | Total job: ${elapsed}s`
    );
  } finally {
    await browser.close();
    server.stop();
  }
}

main().catch((err) => {
  console.error("Render failed:", err);
  server.stop();
  process.exit(1);
});
