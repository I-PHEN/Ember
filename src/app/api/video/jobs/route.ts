import { NextRequest, NextResponse } from "next/server";
import { createJob } from "@/lib/video-jobs";
import { jobStore } from "@/lib/jobs/store";
import { dispatchJob } from "@/lib/jobs/dispatch";
import { DailyLimitError } from "@/lib/jobs/repository";

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
    const hosted = process.env.VERCEL === "1";
    const useInngest = hosted || process.env.GENERATION_RUNNER === "inngest";
    if (hosted && (!process.env.INNGEST_EVENT_KEY || !process.env.INNGEST_SIGNING_KEY)) {
      return NextResponse.json({ error: "The hosted generation worker is not configured yet." }, { status: 503 });
    }
    const jobId = await createJob(question, jobStore, hosted ? 20 : undefined);
    if (useInngest) {
      try {
        const { inngest } = await import("@/lib/inngest/client");
        await dispatchJob(jobId, jobStore, event => inngest.send(event));
      } catch {
        return NextResponse.json({ jobId,
          error: "Your lesson was saved, but the worker could not be reached. Dispatch recovery will retry it." },
        { status: 503 });
      }
    }
    return NextResponse.json({ jobId });
  } catch (err) {
    if (err instanceof DailyLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("create video job failed:", err);
    return NextResponse.json(
      { error: "Could not start the video studio. Please try again." },
      { status: 500 }
    );
  }
}
