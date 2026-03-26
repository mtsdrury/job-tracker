import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/notifications
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const unread = searchParams.get("unread");

  const where: Record<string, unknown> = { userId: session.user.id };

  if (unread === "true") {
    where.read = false;
  }

  const notifications = await prisma.notification.findMany({
    where,
    include: {
      job: {
        select: {
          id: true,
          title: true,
          company: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(notifications);
}

// POST /api/notifications
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, title, message, jobId, data } = body;

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: "type, title, and message are required" },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.create({
      data: {
        userId: session.user.id,
        type,
        title,
        message,
        jobId,
        data: data || null,
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true,
          },
        },
      },
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error("Notification creation error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
