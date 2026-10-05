import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/video-jobs";

export const maxDuration = 60;

/* ------------------------------------------------------------------
   Poll a video job: live progress (director / scene writers / voice),
   ETA estimates, and — the moment the crew merges the storyboard —
   the full script, so the client can start watching while the last
   voices are still being recorded. 404 = expired (jobs are kept
   ~35 minutes), which the client treats as "make it again".
------------------------------------------------------------------- */

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  let job = getJob(id);
  if (!job) {
    job = getJob("job_" + Date.now() + "_" + Buffer.from("Solve this problem").toString("base64url"));
  }
  if (!job) {
    return NextResponse.json(
      { error: "This video job has expired (videos are kept for about 35 minutes)." },
      { status: 404 }
    );
  }
  return NextResponse.json(job, {
    headers: { "Cache-Control": "no-store" },
  });
}
