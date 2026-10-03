// Browser integration with a deterministic lesson/audio fixture; no provider calls.
// Run with a dev server: node tests/player-timing.browser.mjs http://localhost:3017
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
const base = process.argv[2] ?? "http://localhost:3017";
const audioDelay = Number(process.env.TEST_AUDIO_DELAY_MS ?? 0);
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true, args: ["--autoplay-policy=no-user-gesture-required"],
});
const lesson = {
  title: "Timing integration fixture", question: "Read a matrix element",
  scenes: [
    { chapter: "Dimensions", narration: "This matrix has two rows.", beats: [{ type: "write", text: "2 × 3", say: "two rows" }] },
    { chapter: "Read entry", narration: "Read row two and column three.", beats: [{ type: "write", text: "A₂₃ = 5", say: "row two" }] },
  ],
};
const wav = Buffer.alloc(44 + 24000 * 2 * 2);
wav.write("RIFF", 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(24000, 24); wav.writeUInt32LE(48000, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(wav.length - 44, 40);
const reports = [];
const errors = [];
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  page.on("pageerror", e => errors.push(String(e)));
  await page.setRequestInterception(true);
  page.on("request", async request => {
    const path = new URL(request.url()).pathname;
    if (path === "/api/gallery") return request.respond({ contentType: "application/json", body: '{"items":[]}' });
    if (path === "/api/video/jobs" && request.method() === "POST") {
      return request.respond({ contentType: "application/json", body: '{"jobId":"browser-fixture"}' });
    }
    if (path === "/api/video/jobs/browser-fixture" && request.method() === "GET") {
      await new Promise(resolve => setTimeout(resolve, 400));
      return request.respond({ contentType: "application/json", body: JSON.stringify({
        id: "browser-fixture", phase: "ready", question: lesson.question, title: lesson.title,
        createdAt: Date.now(), scenesTotal: 2, scenesDone: 2, voicesTotal: 2, voicesDone: 2,
        etaWatchMs: 0, etaVoiceMs: 0, progressPct: 100, error: null, script: lesson,
      }) });
    }
    if (path === "/api/narrate") {
      if (audioDelay) await new Promise(resolve => setTimeout(resolve, audioDelay));
      return request.respond({ contentType: "audio/wav", body: wav });
    }
    if (path.endsWith("/timing")) {
      reports.push({ path, body: JSON.parse(request.postData()) });
      // An expired job is expected to be harmless to playback.
      return request.respond({ status: 404, contentType: "application/json", body: '{"error":"Video job not found."}' });
    }
    return request.continue();
  });
  await page.goto(base, { waitUntil: "networkidle0", timeout: 120000 });
  await page.waitForSelector('textarea[aria-label="Your question"]');
  await page.type('textarea[aria-label="Your question"]', "Read a matrix element");
  await page.focus('textarea[aria-label="Your question"]');
  await page.keyboard.press("Enter");
  if (audioDelay >= 5000) {
    await page.waitForSelector('[role="slider"][aria-label="Seek"]');
    await new Promise(resolve => setTimeout(resolve, 4000));
    const clock = await page.$eval('[role="slider"][aria-label="Seek"]', element => element.getAttribute("aria-valuenow"));
    assert.equal(clock, "0", "slow narration must buffer beyond the former 3.5-second timeout");
  }
  const deadline = Date.now() + 20000;
  while (reports.length < 2 && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(reports.length, 2, "one timing report per loaded narration");
  assert(reports[0].body.writeEndMs < 4000, "short writing must fit the available speech window without the old eight-second lead-in");
  for (const report of reports) {
    assert.equal(report.path, "/api/video/jobs/browser-fixture/timing");
    assert.deepEqual(Object.keys(report.body).sort(), ["audioDurationMs", "sceneIndex", "writeEndMs"]);
    assert(report.body.audioDurationMs > 0);
    assert(report.body.writeEndMs >= 0);
  }
  await new Promise(resolve => setTimeout(resolve, 1500));
  assert.equal(reports.length, 2, "UI rerenders must not restart narration");
  assert(await page.$("canvas"), "player canvas remains mounted after telemetry 404");
  await page.evaluate(script => localStorage.setItem("ember.watch.active", JSON.stringify(script)), lesson);
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("canvas");
  await new Promise(resolve => setTimeout(resolve, 1000));
  assert.equal(reports.length, 2, "history playback must not report against a previous job");
  assert.deepEqual(errors, []);
  await page.screenshot({ path: ".next/player-timing-review.png", fullPage: false });
  console.log(JSON.stringify({ result: "PASS", reports, historyReports: 0, pageErrors: errors }));
} finally { await browser.close(); }

