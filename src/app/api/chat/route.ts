import { NextRequest } from "next/server";
import { streamObject } from "ai";
import { google } from "@ai-sdk/google";
import { PrismaClient } from "@prisma/client";
import { solveScriptSchema } from "@/lib/video/schema";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { projectId, prompt } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Missing prompt" }), { status: 400 });
    }

    // 1. Fetch or create project
    let project;
    if (projectId === "new" || !projectId) {
      // Find a default user or create one
      let user = await prisma.user.findFirst();
      if (!user) user = await prisma.user.create({ data: { email: "test@ember.app", name: "Test User" }});
      
      project = await prisma.project.create({
        data: {
          userId: user.id,
          title: prompt.substring(0, 30)
        },
        include: { messages: true }
      });
    } else {
      project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { messages: { orderBy: { createdAt: "asc" } } }
      });
    }

    if (!project) return new Response(JSON.stringify({ error: "Project not found" }), { status: 404 });

    // 2. Save the User's prompt to the database
    const userMessage = await prisma.message.create({
      data: {
        projectId: project.id,
        role: "user",
        content: prompt
      }
    });

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
        if (!object) return;
        // 5. When the stream finishes, save the AI's response and the VideoVersion
        const aiMessage = await prisma.message.create({
          data: {
            projectId: project.id,
            role: "ai",
            content: "Generated VideoVersion"
          }
        });

        await prisma.videoVersion.create({
          data: {
            projectId: project.id,
            messageId: aiMessage.id,
            script: JSON.stringify(object),
          }
        });
      }
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Chat API Error:", error);
    return new Response(JSON.stringify({ error: "Failed to stream video script" }), { status: 500 });
  }
}
