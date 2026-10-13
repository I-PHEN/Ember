/* ------------------------------------------------------------------
   Ember Launch Film: Interactive Web Player & In-Browser MP4 Downloader
   Allows previewing the 48.0s film with synchronized 120 BPM studio
   soundtrack + Aoede voiceover, scrubbing chapters, and downloading
   the pre-rendered 1080p MP4 directly to disk!
------------------------------------------------------------------- */

import { W, H, FPS } from "./theme";
import { renderFilmFrame, TOTAL_FRAMES, CHAPTERS } from "./film";
import { preloadFilmAssets, ASSETS } from "./fx";
import { buildMasterAudioBuffer } from "./soundtrack";

export async function initPlayer(): Promise<void> {
  const canvas = document.getElementById("film-canvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  canvas.width = W;
  canvas.height = H;

  // Preload BoardHand font, app screenshots, and Professor Ember voice snippet
  await preloadFilmAssets();

  let currentFrame = 0;
  let isPlaying = true;
  let lastTime = performance.now();

  // Optional Web Audio playback for the browser preview
  let audioCtx: AudioContext | null = null;
  let masterBuffer: AudioBuffer | null = null;
  let activeSource: AudioBufferSourceNode | null = null;
  let isSoundOn = false;
  let audioStartTime = 0;
  let audioStartOffset = 0;

  const playBtn = document.getElementById("btn-play") as HTMLButtonElement;
  const soundBtn = document.getElementById("btn-sound") as HTMLButtonElement | null;
  const scrubSlider = document.getElementById("scrub-slider") as HTMLInputElement;
  const timeDisplay = document.getElementById("time-display") as HTMLElement;
  const chaptersContainer = document.getElementById("chapters-bar") as HTMLElement;
  const downloadBtn = document.getElementById("btn-download") as HTMLButtonElement;
  const downloadStatus = document.getElementById("download-status") as HTMLElement;

  scrubSlider.max = String(TOTAL_FRAMES - 1);

  async function ensureAudioReady(): Promise<void> {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }
    if (!masterBuffer) {
      masterBuffer = await buildMasterAudioBuffer(ASSETS.voiceBuffer);
    }
  }

  function stopAudioSource(): void {
    if (activeSource) {
      try {
        activeSource.stop();
        activeSource.disconnect();
      } catch {
        // ignore
      }
      activeSource = null;
    }
  }

  async function syncAudioToCurrentFrame(): Promise<void> {
    stopAudioSource();
    if (!isSoundOn || !isPlaying) return;
    await ensureAudioReady();
    if (!audioCtx || !masterBuffer) return;

    const offsetSec = Math.max(0, Math.min(47.9, currentFrame / FPS));
    const src = audioCtx.createBufferSource();
    src.buffer = masterBuffer;
    src.connect(audioCtx.destination);
    src.start(0, offsetSec);
    audioStartTime = audioCtx.currentTime;
    audioStartOffset = offsetSec;
    activeSource = src;
  }

  // Render initial frame
  renderFilmFrame(ctx, currentFrame);

  // Build chapter pill buttons
  CHAPTERS.forEach((ch) => {
    const btn = document.createElement("button");
    btn.className = "chapter-pill";
    btn.textContent = ch.name;
    btn.onclick = () => {
      seekTo(ch.frame);
      if (isSoundOn && isPlaying) syncAudioToCurrentFrame();
    };
    chaptersContainer.appendChild(btn);
  });

  function updateUi(): void {
    scrubSlider.value = String(currentFrame);
    const curSec = Math.floor(currentFrame / FPS);
    const totalSec = Math.floor(TOTAL_FRAMES / FPS);
    const pad = (n: number) => String(n).padStart(2, "0");
    timeDisplay.textContent = `${pad(Math.floor(curSec / 60))}:${pad(curSec % 60)} / ${pad(Math.floor(totalSec / 60))}:${pad(totalSec % 60)}`;
    playBtn.textContent = isPlaying ? "⏸ Pause" : "▶ Play";
    if (soundBtn) {
      soundBtn.textContent = isSoundOn ? "🔊 Sound On" : "🔇 Enable Sound";
      soundBtn.style.borderColor = isSoundOn ? "rgba(230, 183, 132, 0.55)" : "rgba(255, 255, 255, 0.1)";
      soundBtn.style.color = isSoundOn ? "#e6b784" : "#f1eee7";
    }

    const pills = document.querySelectorAll(".chapter-pill");
    let activeIdx = 0;
    for (let i = CHAPTERS.length - 1; i >= 0; i--) {
      if (currentFrame >= CHAPTERS[i].frame) {
        activeIdx = i;
        break;
      }
    }
    pills.forEach((p, i) => {
      if (i === activeIdx) p.classList.add("active");
      else p.classList.remove("active");
    });
  }

  function loop(now: number): void {
    if (isPlaying) {
      if (isSoundOn && audioCtx && activeSource) {
        const elapsed = audioCtx.currentTime - audioStartTime + audioStartOffset;
        if (elapsed >= TOTAL_FRAMES / FPS) {
          currentFrame = 0;
          syncAudioToCurrentFrame();
        } else {
          currentFrame = Math.min(TOTAL_FRAMES - 1, Math.floor(elapsed * FPS));
        }
        renderFilmFrame(ctx, currentFrame);
        updateUi();
        lastTime = now;
      } else {
        const delta = (now - lastTime) / 1000;
        if (delta >= 1 / FPS) {
          const advance = Math.max(1, Math.round(delta * FPS));
          currentFrame = (currentFrame + advance) % TOTAL_FRAMES;
          renderFilmFrame(ctx, currentFrame);
          updateUi();
          lastTime = now;
        }
      }
    }
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  function seekTo(f: number): void {
    currentFrame = Math.max(0, Math.min(TOTAL_FRAMES - 1, f));
    renderFilmFrame(ctx, currentFrame);
    updateUi();
  }

  playBtn.onclick = async () => {
    isPlaying = !isPlaying;
    lastTime = performance.now();
    updateUi();
    if (isPlaying && isSoundOn) {
      await syncAudioToCurrentFrame();
    } else {
      stopAudioSource();
    }
  };

  if (soundBtn) {
    soundBtn.onclick = async () => {
      isSoundOn = !isSoundOn;
      updateUi();
      if (isSoundOn) {
        if (!isPlaying) {
          isPlaying = true;
          lastTime = performance.now();
        }
        await syncAudioToCurrentFrame();
      } else {
        stopAudioSource();
      }
    };
  }

  scrubSlider.oninput = () => {
    isPlaying = false;
    stopAudioSource();
    seekTo(Number(scrubSlider.value));
  };

  window.addEventListener("keydown", async (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      isPlaying = !isPlaying;
      lastTime = performance.now();
      updateUi();
      if (isPlaying && isSoundOn) await syncAudioToCurrentFrame();
      else stopAudioSource();
    } else if (e.code === "ArrowRight") {
      seekTo(currentFrame + FPS);
      if (isSoundOn && isPlaying) await syncAudioToCurrentFrame();
    } else if (e.code === "ArrowLeft") {
      seekTo(currentFrame - FPS);
      if (isSoundOn && isPlaying) await syncAudioToCurrentFrame();
    }
  });

  // ------------------------------------------------------------------
  // Instant Pre-Rendered MP4 Download + Wall-Clock Locked Fallback
  // ------------------------------------------------------------------
  downloadBtn.onclick = async () => {
    if (downloadBtn.disabled) return;

    try {
      const head = await fetch("./out/ember-launch.mp4", { method: "HEAD" });
      if (head.ok) {
        const a = document.createElement("a");
        a.href = "./out/ember-launch.mp4";
        a.download = "ember-launch.mp4";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        downloadStatus.style.display = "block";
        downloadStatus.textContent = "✓ Downloaded ember-launch.mp4 (48.0s · 1080p H.264 + Audio)";
        return;
      }
    } catch {
      // Fallback below
    }

    downloadBtn.disabled = true;
    isPlaying = false;
    stopAudioSource();
    updateUi();

    downloadStatus.textContent = "Preparing 48.0s MP4 + Soundtrack...";
    downloadStatus.style.display = "block";

    await ensureAudioReady();
    const recCanvas = document.createElement("canvas");
    recCanvas.width = W;
    recCanvas.height = H;
    const recCtx = recCanvas.getContext("2d")!;

    const canvasStream = recCanvas.captureStream(FPS);
    const audioDest = audioCtx!.createMediaStreamDestination();
    const srcNode = audioCtx!.createBufferSource();
    srcNode.buffer = masterBuffer!;
    srcNode.connect(audioDest);

    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioDest.stream.getAudioTracks(),
    ]);

    const mime = MediaRecorder.isTypeSupported("video/mp4; codecs=avc1,mp4a.40.2")
      ? "video/mp4; codecs=avc1,mp4a.40.2"
      : MediaRecorder.isTypeSupported("video/mp4")
      ? "video/mp4"
      : "video/webm; codecs=vp9,opus";

    const recorder = new MediaRecorder(combinedStream, {
      mimeType: mime,
      videoBitsPerSecond: 12_000_000,
      audioBitsPerSecond: 192_000,
    });

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const completion = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    recorder.start(1000);
    srcNode.start(0);
    const startWall = performance.now();
    const durationMs = 48_000;

    while (performance.now() - startWall < durationMs) {
      const elapsedSec = (performance.now() - startWall) / 1000;
      const f = Math.min(TOTAL_FRAMES - 1, Math.floor(elapsedSec * FPS));
      renderFilmFrame(recCtx, f);
      ctx.drawImage(recCanvas, 0, 0);
      currentFrame = f;
      updateUi();
      const pct = Math.min(99, Math.floor((elapsedSec / 48) * 100));
      downloadStatus.textContent = `Recording 48.0s launch film: ${pct}% (${elapsedSec.toFixed(1)}s / 48.0s)...`;
      await new Promise((r) => setTimeout(r, 16));
    }

    srcNode.stop();
    recorder.stop();
    downloadStatus.textContent = "Finalizing 48.0s MP4 file...";
    await completion;

    const isMp4 = mime.includes("mp4");
    const blob = new Blob(chunks, { type: isMp4 ? "video/mp4" : "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = isMp4 ? "ember-launch.mp4" : "ember-launch.webm";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    downloadStatus.textContent = `✓ Saved ${a.download} (48.0s · ${(blob.size / 1024 / 1024).toFixed(1)} MB)`;
    downloadBtn.disabled = false;
  };
}
