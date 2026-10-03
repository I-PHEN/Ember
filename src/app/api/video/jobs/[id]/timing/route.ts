import { NextRequest, NextResponse } from "next/server";
import { recordSceneTiming } from "@/lib/video-jobs";

export const maxDuration = 60;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const result = recordSceneTiming(id, body);
  if (result === "recorded") return new NextResponse(null, { status: 204 });
  if (result === "missing") {
    return NextResponse.json({ error: "Video job not found." }, { status: 404 });
  }
  return NextResponse.json({ error: "Invalid timing report." }, { status: 400 });
}
