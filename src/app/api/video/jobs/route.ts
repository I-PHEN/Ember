import { NextRequest, NextResponse } from "next/server";
import { createJob } from "@/lib/video-jobs";

export const maxDuration = 300;

/* ------------------------------------------------------------------
   Start a multi-agent video generation job. Returns immediately with
   a job id — the crew (director → scene writers → voice) works in
   the background and the client polls GET /api/video/jobs/[id].
------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const question =
      typeof body?.question === "string" ? body.question.trim() : "";
    if (question.length < 2 || question.length > 600) {
      return NextResponse.json(
        { error: "Give me a question between 2 and 600 characters." },
        { status: 400 }
      );
    }
    const jobId = await createJob(question);
    return NextResponse.json({ jobId });
  } catch (err) {
    console.error("create video job failed:", err);
    return NextResponse.json(
      { error: "Could not start the video studio. Please try again." },
      { status: 500 }
    );
  }
}
