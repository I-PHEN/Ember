import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, password, name } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const fallbackName =
      name?.trim() ||
      normalizedEmail.split("@")[0].charAt(0).toUpperCase() +
        normalizedEmail.split("@")[0].slice(1);

    if (action === "signup") {
      // Create or find user in Prisma SQLite database
      const existing = await db.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existing) {
        // If already exists, return the existing user account
        return NextResponse.json({
          user: {
            uid: existing.id,
            email: existing.email,
            displayName: existing.name || fallbackName,
            createdAt: existing.createdAt.getTime(),
          },
        });
      }

      const created = await db.user.create({
        data: {
          email: normalizedEmail,
          name: fallbackName,
        },
      });

      return NextResponse.json({
        user: {
          uid: created.id,
          email: created.email,
          displayName: created.name,
          createdAt: created.createdAt.getTime(),
        },
      });
    }

    if (action === "signin") {
      let user = await db.user.findUnique({
        where: { email: normalizedEmail },
      });

      // If user does not exist in local db yet, create account automatically
      if (!user) {
        user = await db.user.create({
          data: {
            email: normalizedEmail,
            name: fallbackName,
          },
        });
      }

      return NextResponse.json({
        user: {
          uid: user.id,
          email: user.email,
          displayName: user.name || fallbackName,
          createdAt: user.createdAt.getTime(),
        },
      });
    }

    if (action === "google") {
      let user = await db.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        user = await db.user.create({
          data: {
            email: normalizedEmail,
            name: fallbackName,
          },
        });
      }

      return NextResponse.json({
        user: {
          uid: user.id,
          email: user.email,
          displayName: user.name || fallbackName,
          createdAt: user.createdAt.getTime(),
        },
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("Auth API error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
