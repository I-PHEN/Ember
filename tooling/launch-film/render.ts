import { mkdir, readFile, access, copyFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { createScoreWav, scoreSample } from "./score";
import { verifyFilmExport } from "./verification";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const out = resolve(root, "public/media");
const qa = resolve(root, "tool-results/launch-film");
const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
const chromium = process.env.CHROMIUM_PATH;
if (!chromium) throw new Error("Set CHROMIUM_PATH to a Chromium executable for the controlled offscreen canvas.");
await access(chromium);
await mkdir(out, { recursive: true }); await mkdir(qa, { recursive: true });
const fontFiles = {
  Geist: "node_modules/next/dist/next-devtools/server/font/geist-latin.woff2",
  GeistMono: "node_modules/next/dist/next-devtools/server/font/geist-mono-latin.woff2",
  BoardHand: "public/fonts/board-hand.woff2",
};
const css = (await Promise.all(Object.entries(fontFiles).map(async ([name, path]) => {
  const font = await readFile(resolve(root, path));
  return `@font-face{font-family:${name};src:url(data:font/woff2;base64,${font.toString("base64")}) format('woff2');font-weight:100 900}`;
}))).join("\n");
const built = await Bun.build({ entrypoints: [resolve(root, "tooling/launch-film/client.ts")], target: "browser", format: "iife" });
if (!built.success) throw new Error(built.logs.join("\n"));
const bundle = await built.outputs[0].text();
const browser = await puppeteer.launch({ executablePath: chromium, headless: true, args: ["--disable-gpu", "--no-sandbox"], defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 } });
try {
  const page = await browser.newPage();
  // No HTTP server or filesystem router: only embedded, explicitly read font assets.
  await page.setRequestInterception(true);
  page.on("request", request => request.url().startsWith("data:") ? request.continue() : request.abort());
  await page.setContent(`<html><head><style>${css}html,body{margin:0;background:#111315}canvas{display:block}</style></head><body><canvas width="1920" height="1080"></canvas></body></html>`);
  await page.addScriptTag({ content: bundle });
  await page.evaluate(async () => {
    for (const family of ["Geist", "GeistMono", "BoardHand"]) {
      const faces = await document.fonts.load(`40px ${family}`);
      if (!faces.length || faces.some(face => face.status !== "loaded")) throw new Error(`Required font failed: ${family}`);
    }
  });
  async function frame(t: number) {
    const data = await page.evaluate((seconds) => {
      const canvas = document.querySelector("canvas")!;
      const api = (window as unknown as { EmberFilm: { renderFilmFrame(ctx: CanvasRenderingContext2D, time: number): void } }).EmberFilm;
      api.renderFilmFrame(canvas.getContext("2d")!, seconds);
      return canvas.toDataURL("image/jpeg", .96).split(",")[1];
    }, t);
    return Buffer.from(data, "base64");
  }
  const times = [1.8, 3.7, 4.5, 6.5, 7.7, 9, 11.8, 13.6, 15.8, 19.5, 23.5, 27, 28.5, 30.7, 34, 35.5, 38, 41, 43.5, 46, 48.5, 51];
  for (const t of times) await Bun.write(resolve(qa, `frame-${t.toFixed(1).padStart(4, "0")}.jpg`), await frame(t));
  await frame(27);
  const poster = await page.evaluate(() => {
    const canvas = document.querySelector("canvas")!;
    const ctx = canvas.getContext("2d")!;
    ctx.font = "600 34px Geist"; ctx.fillStyle = "#e6b784"; ctx.textAlign = "left"; ctx.fillText("Ember", 120, 92);
    return canvas.toDataURL("image/jpeg", .96).split(",")[1];
  });
  await Bun.write(resolve(out, "ember-launch-poster.jpg"), Buffer.from(poster, "base64"));
  console.log(`QA stills: ${qa} (${times.length} frames)`);
  if (!process.argv.includes("--stills")) {
    await Bun.write(resolve(qa, "score.wav"), createScoreWav());
    const output = resolve(out, "ember-launch.mp4");
    // Canvas JPEG is full-range BT.601 YCbCr. Convert samples as well as tags;
    // pix_fmt alone can retain full-range metadata from JPEG input.
    const proc = Bun.spawn([ffmpeg, "-y", "-hide_banner", "-loglevel", "warning", "-f", "image2pipe", "-framerate", "30", "-i", "pipe:0", "-i", resolve(qa, "score.wav"), "-vf", "sidedata=mode=delete:type=ICC_PROFILE,scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709:flags=accurate_rnd+full_chroma_int,format=yuv420p,setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-c:a", "aac", "-b:a", "160k", "-t", "52", "-movflags", "+faststart", output], { stdin: "pipe", stdout: "ignore", stderr: "pipe" });
    const stderr = new Response(proc.stderr).text();
    for (let i = 0; i < 1560; i++) {
      proc.stdin.write(await frame(i / 30));
      await proc.stdin.flush();
      if (i % 150 === 0) console.log(`Rendered ${i}/1560 frames`);
    }
    proc.stdin.end();
    if (await proc.exited !== 0) throw new Error(`FFmpeg export failed: ${await stderr}`);
    const verify = Bun.spawn([ffmpeg, "-hide_banner", "-i", output, "-f", "null", "-"], { stdout: "ignore", stderr: "pipe" });
    const metadata = await new Response(verify.stderr).text();
    if (await verify.exited !== 0) throw new Error(`Export decode failed: ${metadata}`);
    verifyFilmExport(metadata, await readFile(output));
    let peak = 0; for (let i = 0; i < 52 * 48000; i++) peak = Math.max(peak, Math.abs(scoreSample(i / 48000, 0)), Math.abs(scoreSample(i / 48000, 1)));
    await Bun.write(resolve(qa, "verification.txt"), `${metadata}\nOriginal PCM peak: ${peak} (${20 * Math.log10(peak)} dBFS)\n`);
    if (process.env.FILM_LOCAL_COPY) {
      const target = resolve(process.env.FILM_LOCAL_COPY);
      // COPYFILE_EXCL ensures an existing local film is never replaced.
      await copyFile(output, target, 1);
      console.log(`Local export: ${target}`);
    }
    console.log(`Verified H.264 limited-range yuv420p BT.709/AAC 1920×1080, 52 seconds: ${output}`);
  }
} finally { await browser.close(); }
