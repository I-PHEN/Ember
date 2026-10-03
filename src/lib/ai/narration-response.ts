import { NextResponse } from "next/server";
import type { SpeechArtifact } from "../tts-queue";

export function narrationResponse(artifact: SpeechArtifact, json: boolean): NextResponse {
  const { buffer, alignment } = artifact;
  const contentType = buffer.subarray(0, 4).toString("ascii") === "RIFF" ? "audio/wav" : "audio/mpeg";
  if (json) {
    return NextResponse.json({
      audio: buffer.toString("base64"), contentType, alignment,
    }, { headers: { "Cache-Control": "no-store" } });
  }
  return new NextResponse(new Uint8Array(buffer), {
    headers: { "Content-Type": contentType, "Content-Length": String(buffer.length), "Cache-Control": "no-store" },
  });
}
