/* ------------------------------------------------------------------
   Ember Launch Film: Local Interactive Preview Server
   Run: bun run launch/serve.ts
   Opens http://localhost:3344 where you can watch, scrub chapters,
   listen to the 120 BPM score + Professor Ember voice, and click
   "Download MP4 (48s)" anytime.
------------------------------------------------------------------- */

import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const LAUNCH_DIR = path.resolve(ROOT_DIR, "launch");
const PUBLIC_DIR = path.resolve(ROOT_DIR, "public");
const PORT = Number(process.env.PORT) || 3344;

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

Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    let filePath: string;

    if (url.pathname.startsWith("/public/")) {
      const rel = url.pathname.replace(/^\/public\//, "");
      filePath = path.join(PUBLIC_DIR, rel);
    } else {
      const rel = url.pathname === "/" ? "preview.html" : url.pathname.replace(/^\//, "");
      filePath = path.join(LAUNCH_DIR, rel);
    }

    if (!fs.existsSync(filePath)) {
      return new Response("Not Found", { status: 404 });
    }

    const ext = path.extname(filePath);
    return new Response(fs.readFileSync(filePath), {
      headers: {
        "Content-Type": mimeForExt(ext),
        "Cache-Control": "no-store",
      },
    });
  },
});

console.log(`🎬 Ember Launch Studio running at http://localhost:${PORT}`);
