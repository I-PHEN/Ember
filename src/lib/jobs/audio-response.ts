import { NextResponse } from "next/server";
import { jobStore } from "./store";

export async function readRecordedAudioResponse(key: string, store = jobStore): Promise<NextResponse> {
  if (!/^[a-f0-9]{64}$/.test(key)) {
    return NextResponse.json({ error: "Invalid audio reference." }, { status: 400 });
  }
  try {
    const audio = await store.readAudio(key);
    if (!audio) return NextResponse.json({ error: "Audio is not available yet." }, {
      status: 404, headers: { "Cache-Control": "no-store", "Retry-After": "3" },
    });
    return recordedAudioResponse(audio);
  } catch {
    return NextResponse.json({ error: "Audio storage is unavailable." }, { status: 503 });
  }
}

export function recordedAudioResponse(buffer: Buffer): NextResponse {
  const wav = buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "RIFF";
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": wav ? "audio/wav" : "audio/mpeg",
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
