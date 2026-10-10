import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/video-jobs";

export const maxDuration = 60;

/* ------------------------------------------------------------------
   Poll a video job: live progress (director / scene writers / voice),
   ETA estimates, and — the moment the crew merges the storyboard —
   the full script, so the client can start watching while the last
   voices are still being recorded. Polling reads durable state;
   404 means missing, never a substitute lesson.
------------------------------------------------------------------- */

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  let job;
  try { job = await getJob(id); }
  catch {
    return NextResponse.json({ error: "Video storage is temporarily unavailable." }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
  if (!job) {
    return NextResponse.json(
      { error: "This video job could not be found." },
      { status: 404 }
    );
  }
  return NextResponse.json(job, {
    headers: { "Cache-Control": "no-store" },
  });
}
