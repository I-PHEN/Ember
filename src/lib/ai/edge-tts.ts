import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

/* ------------------------------------------------------------------
   High-Fidelity Edge TTS Engine (Zero API Key, Unlimited Quota)
   Provides reliable, human-grade neural voice synthesis modeled after
   top educational YouTube tutors (The Organic Chemistry Tutor).
------------------------------------------------------------------- */

const VOICE_MAP: Record<string, string> = {
  jam: "en-US-ChristopherNeural",
  Aoede: "en-US-ChristopherNeural",
  guy: "en-US-GuyNeural",
  christopher: "en-US-ChristopherNeural",
  andrew: "en-US-AndrewMultilingualNeural",
  eric: "en-US-EricNeural",
  jenny: "en-US-JennyNeural",
  aria: "en-US-AriaNeural",
};

export function resolveEdgeVoice(voice?: string): string {
  if (!voice) return "en-US-ChristopherNeural";
  const lower = voice.toLowerCase();
  for (const [k, v] of Object.entries(VOICE_MAP)) {
    if (lower.includes(k.toLowerCase())) return v;
  }
  return "en-US-ChristopherNeural";
}

/**
 * Synthesize speech via Edge TTS (using uv runner).
 * Generates high-quality 24kHz audio with calibrated Organic Chemistry Tutor pacing (~108-114 WPM).
 */
export async function edgeTTS(
  text: string,
  voice = "en-US-ChristopherNeural",
  rate = "-32%"
): Promise<Buffer> {
  const resolvedVoice = resolveEdgeVoice(voice);
  const tmpFile = path.join(
    os.tmpdir(),
    `ember_tts_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`
  );

  return new Promise<Buffer>((resolve, reject) => {
    const proc = spawn(
      "uv",
      [
        "run",
        "--with",
        "edge-tts",
        "edge-tts",
        "--voice",
        resolvedVoice,
        `--rate=${rate}`,
        "--text",
        text,
        "--write-media",
        tmpFile,
      ],
      { stdio: ["ignore", "pipe", "pipe"], windowsHide: true }
    );

    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      try {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      } catch {}
      reject(new Error("edge-tts timed out after 30s"));
    }, 30000);

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        try {
          if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
        } catch {}
        return reject(new Error(`edge-tts failed (code ${code}): ${stderr.trim()}`));
      }

      try {
        const buf = fs.readFileSync(tmpFile);
        fs.unlinkSync(tmpFile);
        if (!buf.length) {
          return reject(new Error("edge-tts generated empty audio file"));
        }
        resolve(buf);
      } catch (err) {
        reject(err);
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      try {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      } catch {}
      reject(err);
    });
  });
}
