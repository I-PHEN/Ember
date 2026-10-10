import { NextRequest } from "next/server";
import { readRecordedAudioResponse } from "@/lib/jobs/audio-response";

// Read-only: an unavailable recording never starts speech generation.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  return readRecordedAudioResponse(key);
}
