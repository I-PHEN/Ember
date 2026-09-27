import { NextRequest, NextResponse } from "next/server";
import { peekCache, speak } from "@/lib/tts-queue";

export const maxDuration = 120;

/* ------------------------------------------------------------------
   TTS endpoint — a thin wrapper over the global tts-queue, which is
   shared with the video-job voice pre-warm (single lock + cache).
------------------------------------------------------------------- */

const wav = (buffer: Buffer) =>
  new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "audio/wav",
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-cache",
    },
  });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const voice = typeof body?.voice === "string" ? body.voice : "jam";
    const speed = Number(body?.speed) || 1;

    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    if (text.length > 1020) {
      return NextResponse.json(
        { error: "text too long (max 1020 chars)" },
        { status: 400 }
      );
    }
    if (speed < 0.5 || speed > 2) {
      return NextResponse.json({ error: "speed out of range" }, { status: 400 });
    }

    const cached = peekCache(text, voice, speed);
    if (cached) return wav(cached);

    const { buffer } = await speak(text, voice, speed);
    return wav(buffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Voice generation failed.";
    const tooMany = /429|Too many/i.test(msg);
    console.error("narrate error:", msg);
    if (tooMany) {
      /* tell the client how long to wait — the narration store honors
         this instead of hammering a hot limiter */
      return NextResponse.json(
        { error: "voice is rate-limited, retrying soon" },
        { status: 429, headers: { "Retry-After": "8" } }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
