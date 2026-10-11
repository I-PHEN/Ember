import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.toLowerCase();
    const subject = searchParams.get("subject");

    const posts = await prisma.galleryPost.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        videoVersion: true,
        publisher: { select: { name: true } },
      },
    });

    let items = posts
      .map((p) => {
        let script: Record<string, unknown> | null = null;
        try {
          if (p.videoVersion?.script) {
            const parsed: unknown = JSON.parse(p.videoVersion.script);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) script = parsed as Record<string, unknown>;
          }
        } catch {
          script = null;
        }
        return {
          id: p.id,
          title: p.title,
          description: p.description,
          publisher: p.publisher?.name ?? "Anonymous Scholar",
          upvotes: p.upvotes,
          views: p.views,
          createdAt: p.createdAt.getTime(),
          script,
        };
      })
      .filter((p) => p.script);

    if (subject && subject !== "All") {
      items = items.filter(
        (i) => typeof i.script?.subject === "string" && i.script.subject.toLowerCase() === subject.toLowerCase()
      );
    }

    if (q) {
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.description && i.description.toLowerCase().includes(q)) ||
          (typeof i.script?.question === "string" && i.script.question.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({ items });
  } catch (err) {
    console.error("Gallery fetch error:", err);
    return NextResponse.json({ items: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, description, script } = await req.json();

    if (!title || !script) {
      return NextResponse.json({ error: "Missing title or script" }, { status: 400 });
    }

    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: { email: "creator@ember.app", name: "Community Scholar" },
      });
    }

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        title: title.slice(0, 80),
      },
    });

    const version = await prisma.videoVersion.create({
      data: {
        projectId: project.id,
        script: typeof script === "string" ? script : JSON.stringify(script),
      },
    });

    const post = await prisma.galleryPost.create({
      data: {
        publisherId: user.id,
        videoVersionId: version.id,
        title: title.slice(0, 100),
        description: description?.slice(0, 280) ?? null,
      },
    });

    return NextResponse.json({ success: true, postId: post.id });
  } catch (err) {
    console.error("Gallery publish error:", err);
    return NextResponse.json({ error: "Failed to publish to gallery" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing post id" }, { status: 400 });
    }

    await prisma.galleryPost.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Gallery unpublish error:", err);
    return NextResponse.json({ error: "Failed to unpublish post" }, { status: 500 });
  }
}
