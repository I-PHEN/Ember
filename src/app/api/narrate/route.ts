import { NextRequest, NextResponse } from "next/server";
import { peekCache, speak } from "@/lib/tts-queue";
import { narrationResponse } from "@/lib/ai/narration-response";

export const maxDuration = 120;

/* ------------------------------------------------------------------
   TTS endpoint — a thin wrapper over the global tts-queue, which is
   shared with the video-job voice pre-warm (single lock + cache).
------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const voice = typeof body?.voice === "string" ? body.voice : "jam";
    const speed = body?.speed === undefined ? 1 : Number(body.speed);
    const json = body?.format === "json";

    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    if (text.length > 1020) {
      return NextResponse.json(
        { error: "text too long (max 1020 chars)" },
        { status: 400 }
      );
    }
    if (speed !== 1) {
      return NextResponse.json({ error: "Use player playback speed; synthesis supports speed 1 only." }, { status: 400 });
    }

    const cached = peekCache(text, voice, speed);
    if (cached) return narrationResponse(cached, json);

    const artifact = await speak(text, voice, speed);
    return narrationResponse(artifact, json);
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
