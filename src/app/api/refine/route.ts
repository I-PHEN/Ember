import { NextRequest, NextResponse } from "next/server";
import { chatComplete } from "@/lib/ai/chat";
import { extractJson, sanitizeScript } from "@/lib/solve-schema";
import type { SolveScript } from "@/lib/video/types";

export const maxDuration = 120;

const PROFESSOR_EMBER_SYSTEM = `You are PROFESSOR EMBER — a brilliant, warm, and precise university professor in the style of the Organic Chemistry Tutor.
A student is currently watching your blackboard solve video and asking you questions or requesting edits.

YOU HAVE TWO MODES OF RESPONSE:

1. MODE "answer" (Conceptual Q&A / Tutor Explanation):
- TRIGGER: The student asks a question about what is happening on the board, why a specific formula was chosen, how a step works, or asks for conceptual intuition (e.g., "Why did you use cosine here?", "What does mu mean at 0:42?", "Can you explain why mechanical energy is conserved?").
- ACTION: Answer the student's question directly in conversational text. Be encouraging, clear, and reference the specific equations and timestamp context. Do NOT output a new script.
- FORMAT:
{
  "mode": "answer",
  "reply": "Your clear, warm pedagogical explanation here..."
}

2. MODE "edit" (Board Revision):
- TRIGGER: The student explicitly asks you to change, recolor, rewrite, simplify, expand, or fix the blackboard or lecture narration (e.g., "Make step 2 simpler", "Change the final box to yellow", "Show the full algebra for factoring", "Skip the intro").
- ACTION: Apply the requested modification to the SolveScript while preserving the calm, unhurried Organic Chemistry Tutor progressive disclosure style.
- FORMAT:
{
  "mode": "edit",
  "reply": "I've revised the second scene to include the full algebraic expansion on the board.",
  "script": { ...full updated SolveScript... }
}

OUTPUT RULES:
- Output valid raw JSON only. No markdown fences, no commentary outside the JSON.
- If in doubt whether the student wants an explanation or an edit:
  - Questions starting with "Why", "How", "What", "Can you explain", "Does this mean" -> MODE "answer".
  - Imperatives like "Make", "Change", "Rewrite", "Color", "Simplify", "Add to the board" -> MODE "edit".`;

export async function POST(req: NextRequest) {
  try {
    const {
      script,
      instruction,
      currentTime,
      currentScene,
      history,
    }: {
      script: SolveScript;
      instruction: string;
      currentTime?: number;
      currentScene?: string;
      history?: { role: "user" | "ember"; content: string }[];
    } = await req.json();

    if (!script || !instruction?.trim()) {
      return NextResponse.json({ error: "Missing script or instruction" }, { status: 400 });
    }

    const fmtMinSec = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return `${m}:${String(s).padStart(2, "0")}`;
    };

    const timeContext =
      typeof currentTime === "number"
        ? `CURRENT PLAYBACK TIMESTAMP: ${fmtMinSec(currentTime)} (${currentTime.toFixed(1)}s)`
        : "CURRENT PLAYBACK TIMESTAMP: Not specified";

    const sceneContext = currentScene ? `ACTIVE SCENE: "${currentScene}"` : "";

    const conversationContext =
      Array.isArray(history) && history.length > 0
        ? "RECENT CONVERSATION:\n" +
          history
            .slice(-4)
            .map((m) => `${m.role === "user" ? "Student" : "Ember"}: ${m.content}`)
            .join("\n") +
          "\n\n"
        : "";

    const userPrompt =
      `LESSON METADATA:
Title: ${script.title}
Subject: ${script.subject ?? "Mathematics / Science"}
Problem: ${script.question}

${timeContext}
${sceneContext}

${conversationContext}CURRENT SCRIPT OVERVIEW:
${JSON.stringify(script, null, 2)}

STUDENT'S MESSAGE:
"${instruction.trim()}"

Decide whether this is an "answer" or an "edit", and return the corresponding JSON:`;

    const res = await chatComplete(PROFESSOR_EMBER_SYSTEM, userPrompt, { tier: "reason" });
    const parsed = extractJson(res.text) as {
      mode?: "answer" | "edit";
      reply?: string;
      script?: SolveScript;
    };

    if (parsed.mode === "edit" && parsed.script) {
      const cleanedScript = sanitizeScript(parsed.script);
      return NextResponse.json({
        mode: "edit",
        reply: parsed.reply || "I've updated the blackboard according to your request.",
        script: cleanedScript,
      });
    }

    return NextResponse.json({
      mode: "answer",
      reply:
        parsed.reply ||
        (typeof parsed === "string" ? parsed : "Here is my explanation based on what we've chalked on the board."),
    });
  } catch (err) {
    console.error("Refine / Tutor route error:", err);
    return NextResponse.json(
      {
        mode: "answer",
        reply: "I had a bit of trouble processing that thought. Could you rephrase your question?",
      },
      { status: 500 }
    );
  }
}
