import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  SAMPLE_GAUSSIAN_INTEGRAL,
  SAMPLE_INCLINED_PLANE,
  SAMPLE_CALCULUS,
  SAMPLE_CUBIC_EXTREMA,
} from "@/lib/samples";
import type { SolveScript } from "@/lib/video/types";

export interface GalleryItemRecord {
  id: string;
  title: string;
  description?: string;
  publisher: string;
  upvotes: number;
  views: number;
  createdAt: number;
  script: SolveScript;
}

const globalGallery = globalThis as unknown as {
  __ember_memory_gallery?: GalleryItemRecord[];
};

if (!globalGallery.__ember_memory_gallery) {
  globalGallery.__ember_memory_gallery = [];
}

const CURATED_SHOWCASE_ITEMS: GalleryItemRecord[] = [
  {
    id: "gaussian-integral",
    title: "The Gaussian Integral",
    description:
      "Evaluating ∫_{-∞}^∞ e^{-x²} dx = √π using Poisson's squaring trick, polar transformation, and biological handwriting kinematics.",
    publisher: "Professor Ember",
    upvotes: 42,
    views: 318,
    createdAt: Date.now() - 3600000,
    script: SAMPLE_GAUSSIAN_INTEGRAL,
  },
  {
    id: "calculus-integration-by-parts",
    title: "Integration by Parts: ∫ x·e^(2x) dx",
    description:
      "Deriving and evaluating the indefinite integral using the tabular parts method with verification derivative check.",
    publisher: "Professor Ember",
    upvotes: 38,
    views: 284,
    createdAt: Date.now() - 7200000,
    script: SAMPLE_CALCULUS,
  },
  {
    id: "physics-inclined-plane",
    title: "Acceleration on an Inclined Plane",
    description:
      "Newtonian mechanics with friction: resolving gravitational components parallel and normal to an inclined ramp.",
    publisher: "Professor Ember",
    upvotes: 29,
    views: 215,
    createdAt: Date.now() - 10800000,
    script: SAMPLE_INCLINED_PLANE,
  },
  {
    id: "cubic-extrema",
    title: "Local Extrema of a Cubic Polynomial",
    description:
      "Finding critical points via the first and second derivative tests with step-by-step sign chart reasoning.",
    publisher: "Professor Ember",
    upvotes: 25,
    views: 192,
    createdAt: Date.now() - 14400000,
    script: SAMPLE_CUBIC_EXTREMA,
  },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const q = searchParams.get("q")?.toLowerCase();
    const subject = searchParams.get("subject");

    // Single item query (e.g. direct watch link /studio?solve=<id>)
    if (id) {
      const memoryMatch = globalGallery.__ember_memory_gallery?.find((i) => i.id === id);
      if (memoryMatch) return NextResponse.json({ item: memoryMatch });

      const curatedMatch = CURATED_SHOWCASE_ITEMS.find((i) => i.id === id);
      if (curatedMatch) return NextResponse.json({ item: curatedMatch });

      if (db) {
        try {
          const post = await db.galleryPost.findUnique({
            where: { id },
            include: {
              videoVersion: true,
              publisher: { select: { name: true } },
            },
          });
          if (post && post.videoVersion?.script) {
            let script: SolveScript | null = null;
            try {
              script =
                typeof post.videoVersion.script === "string"
                  ? JSON.parse(post.videoVersion.script)
                  : post.videoVersion.script;
            } catch {
              script = null;
            }
            if (script) {
              const item: GalleryItemRecord = {
                id: post.id,
                title: post.title,
                description: post.description || undefined,
                publisher: post.publisher?.name ?? "Community Scholar",
                upvotes: post.upvotes,
                views: post.views,
                createdAt: post.createdAt.getTime(),
                script,
              };
              return NextResponse.json({ item });
            }
          }
        } catch (dbErr) {
          console.warn("DB gallery findUnique warning:", dbErr);
        }
      }

      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // List all gallery items
    let dbItems: GalleryItemRecord[] = [];
    if (db) {
      try {
        const posts = await db.galleryPost.findMany({
          orderBy: { createdAt: "desc" },
          take: 40,
          include: {
            videoVersion: true,
            publisher: { select: { name: true } },
          },
        });

        dbItems = posts
          .map((p) => {
            let script: SolveScript | null = null;
            try {
              if (p.videoVersion?.script) {
                script =
                  typeof p.videoVersion.script === "string"
                    ? JSON.parse(p.videoVersion.script)
                    : p.videoVersion.script;
              }
            } catch {
              script = null;
            }
            if (!script) return null;
            return {
              id: p.id,
              title: p.title,
              description: p.description || undefined,
              publisher: p.publisher?.name ?? "Community Scholar",
              upvotes: p.upvotes,
              views: p.views,
              createdAt: p.createdAt.getTime(),
              script,
            };
          })
          .filter((p): p is GalleryItemRecord => p !== null);
      } catch (dbErr) {
        console.warn("Database gallery findMany warning:", dbErr);
      }
    }

    const memoryItems = globalGallery.__ember_memory_gallery || [];

    // Deduplicate across memory, database, and curated items
    const seenIds = new Set<string>();
    let items: GalleryItemRecord[] = [];

    for (const item of [...memoryItems, ...dbItems, ...CURATED_SHOWCASE_ITEMS]) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        items.push(item);
      }
    }

    if (subject && subject !== "All") {
      items = items.filter(
        (i) => i.script?.subject?.toLowerCase() === subject.toLowerCase()
      );
    }

    if (q) {
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.description && i.description.toLowerCase().includes(q)) ||
          (i.script?.question && i.script.question.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({ items });
  } catch (err) {
    console.error("Gallery fetch error:", err);
    return NextResponse.json({ items: CURATED_SHOWCASE_ITEMS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, script, publisherName, publisherEmail } = body;

    if (!title || !script) {
      return NextResponse.json({ error: "Missing title or script" }, { status: 400 });
    }

    const cleanTitle = String(title).slice(0, 100);
    const cleanDesc = description ? String(description).slice(0, 280) : "";
    const author = publisherName?.trim() || "Community Scholar";
    const email = publisherEmail?.trim().toLowerCase() || "creator@ember.app";

    let postId = "pub_" + Math.random().toString(36).slice(2, 9) + "_" + Date.now().toString(36);

    // Parse script into object for validation and memory caching
    let parsedScript: SolveScript;
    try {
      parsedScript = typeof script === "string" ? JSON.parse(script) : script;
    } catch {
      return NextResponse.json({ error: "Invalid script payload format" }, { status: 400 });
    }

    // Attempt persistent DB write if database is configured and reachable
    if (db) {
      try {
        let user = await db.user.findFirst({
          where: { email },
        });

        if (!user) {
          user = await db.user.findFirst();
        }

        if (!user) {
          user = await db.user.create({
            data: { email, name: author },
          });
        }

        if (user) {
          const project = await db.project.create({
            data: {
              userId: user.id,
              title: cleanTitle.slice(0, 80),
            },
          });

          const version = await db.videoVersion.create({
            data: {
              projectId: project.id,
              script: JSON.stringify(parsedScript),
            },
          });

          const post = await db.galleryPost.create({
            data: {
              publisherId: user.id,
              videoVersionId: version.id,
              title: cleanTitle,
              description: cleanDesc || null,
            },
          });

          postId = post.id;
        }
      } catch (dbErr) {
        console.warn("DB gallery publish fallback (memory persistence active):", dbErr);
      }
    }

    // Always record in memory cache so it is immediately served to clients
    const publishedRecord: GalleryItemRecord = {
      id: postId,
      title: cleanTitle,
      description: cleanDesc,
      publisher: author,
      upvotes: 1,
      views: 1,
      createdAt: Date.now(),
      script: parsedScript,
    };

    if (!globalGallery.__ember_memory_gallery) {
      globalGallery.__ember_memory_gallery = [];
    }
    // Prepend so latest publish appears first
    globalGallery.__ember_memory_gallery.unshift(publishedRecord);

    return NextResponse.json({
      success: true,
      postId,
      item: publishedRecord,
      message: "Lesson published to Community Gallery successfully",
    });
  } catch (err: any) {
    console.error("Gallery publish error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to publish to gallery" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing post id" }, { status: 400 });
    }

    // Remove from memory
    if (globalGallery.__ember_memory_gallery) {
      globalGallery.__ember_memory_gallery = globalGallery.__ember_memory_gallery.filter(
        (i) => i.id !== id
      );
    }

    // Remove from DB if present
    if (db) {
      try {
        await db.galleryPost.delete({
          where: { id },
        });
      } catch (dbErr) {
        console.warn("DB gallery delete warning:", dbErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Gallery unpublish error:", err);
    return NextResponse.json({ error: "Failed to unpublish post" }, { status: 500 });
  }
}
