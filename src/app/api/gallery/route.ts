import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const posts = await prisma.galleryPost.findMany({
      orderBy: { createdAt: "desc" },
      take: 24,
      include: {
        videoVersion: true,
        publisher: { select: { name: true } }
      }
    });

    const items = posts.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      publisher: p.publisher?.name ?? "Anonymous",
      upvotes: p.upvotes,
      views: p.views,
      createdAt: p.createdAt.getTime(),
      script: p.videoVersion?.script ? JSON.parse(p.videoVersion.script) : null,
    })).filter(p => p.script);

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
        data: { email: "creator@ember.app", name: "Community Scholar" }
      });
    }

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        title: title.slice(0, 80)
      }
    });

    const version = await prisma.videoVersion.create({
      data: {
        projectId: project.id,
        script: typeof script === "string" ? script : JSON.stringify(script)
      }
    });

    const post = await prisma.galleryPost.create({
      data: {
        publisherId: user.id,
        videoVersionId: version.id,
        title: title.slice(0, 100),
        description: description?.slice(0, 280) ?? null
      }
    });

    return NextResponse.json({ success: true, postId: post.id });
  } catch (err) {
    console.error("Gallery publish error:", err);
    return NextResponse.json({ error: "Failed to publish to gallery" }, { status: 500 });
  }
}
