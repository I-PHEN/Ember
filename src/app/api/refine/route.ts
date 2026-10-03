import { NextRequest, NextResponse } from "next/server";
import { chatComplete } from "@/lib/ai/chat";
import { extractJson, sanitizeScript } from "@/lib/solve-schema";
import type { SolveScript } from "@/lib/video/types";

export const maxDuration = 120;

const REFINE_SYSTEM = `You are PROFESSOR EMBER, refining an existing university whiteboard lecture video based on student feedback.
Your goal is to apply the student's requested modifications while preserving the calm, methodical Organic Chemistry Tutor style:
- Narration explains before the pen writes.
- Minimalist board: equations, short labels, clean layout.
- Only modify what the student requested; keep the rest of the lecture consistent.
- Return the full updated SolveScript in raw JSON format (no markdown fences).

SCHEMA:
{
  "title": string,
  "subject": string,
  "question": string,
  "scenes": [
    {
      "chapter": string,
      "narration": string,
      "beats": [
        { "type": "write" | "title" | "fraction" | "box" | "underline" | "circle" | "erase" | "pause", "text"?: string, "color"?: string, "say"?: string }
      ]
    }
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const { script, instruction }: { script: SolveScript; instruction: string } = await req.json();

    if (!script || !instruction?.trim()) {
      return NextResponse.json({ error: "Missing script or instruction" }, { status: 400 });
    }

    const userPrompt =
      "ORIGINAL LESSON:\n" +
      JSON.stringify(script, null, 2) +
      "\n\nSTUDENT REQUEST:\n" +
      instruction +
      "\n\nReturn the updated SolveScript JSON:";

    const res = await chatComplete(REFINE_SYSTEM, userPrompt, { tier: "reason" });
    const parsed = extractJson(res.text);
    const cleaned = sanitizeScript(parsed);

    return NextResponse.json({ script: cleaned });
  } catch (err) {
    console.error("Refine error:", err);
    return NextResponse.json({ error: "Failed to refine lesson" }, { status: 500 });
  }
}
