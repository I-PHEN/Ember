import { NextRequest } from "next/server";
import { streamObject } from "ai";
import { google } from "@ai-sdk/google";
import { db } from "@/lib/db";
import { solveScriptSchema } from "@/lib/video/schema";

export async function POST(req: NextRequest) {
  try {
    const { projectId, prompt } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Missing prompt" }), { status: 400 });
    }

    // 1. Fetch or create project
    let project: any = null;
    if (db) {
      try {
        if (projectId === "new" || !projectId) {
          let user = await db.user.findFirst();
          if (!user) user = await db.user.create({ data: { email: "test@ember.app", name: "Test User" } });

          project = await db.project.create({
            data: {
              userId: user.id,
              title: prompt.substring(0, 30),
            },
            include: { messages: true },
          });
        } else {
          project = await db.project.findUnique({
            where: { id: projectId },
            include: { messages: { orderBy: { createdAt: "asc" } } },
          });
        }

        if (project) {
          await db.message.create({
            data: {
              projectId: project.id,
              role: "user",
              content: prompt,
            },
          });
        }
      } catch (dbErr) {
        console.warn("DB chat project creation warning:", dbErr);
      }
    }

    // 3. Build the LLM context from history
    const coreMessages = [
      { role: "system", content: "You are the Pedagogue Agent. Plan a stroke-by-stroke educational video for the user's math or science prompt. You must output the response as a structured JSON script." },
      ...project.messages.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: prompt }
    ];

    // 4. Stream the multi-agent JSON script back to the client
    const result = await streamObject({
      model: google("gemini-2.5-flash"),
      schema: solveScriptSchema,
      messages: coreMessages,
      onFinish: async ({ object }) => {
        if (!object || !db || !project) return;
        try {
          // 5. When the stream finishes, save the AI's response and the VideoVersion
          const aiMessage = await db.message.create({
            data: {
              projectId: project.id,
              role: "ai",
              content: "Generated VideoVersion",
            },
          });

          await db.videoVersion.create({
            data: {
              projectId: project.id,
              messageId: aiMessage.id,
              script: JSON.stringify(object),
            },
          });
        } catch (dbErr) {
          console.warn("DB chat onFinish persistence warning:", dbErr);
        }
      }
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Chat API Error:", error);
    return new Response(JSON.stringify({ error: "Failed to stream video script" }), { status: 500 });
  }
}
