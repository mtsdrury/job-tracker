import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/saved-searches - List user's saved searches
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const savedSearches = await prisma.savedSearch.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(savedSearches);
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// POST /api/saved-searches - Create a new saved search
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, query, location, remoteOnly } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Check tier limit (free tier: 5, pro: unlimited)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { billingStatus: true },
    });

    if (user?.billingStatus === "free") {
      const count = await prisma.savedSearch.count({
        where: { userId: session.user.id },
      });

      if (count >= 5) {
        return NextResponse.json(
          {
            error:
              "Free tier limited to 5 saved searches. Upgrade to Pro for unlimited searches.",
          },
          { status: 403 }
        );
      }
    }

    const savedSearch = await prisma.savedSearch.create({
      data: {
        userId: session.user.id,
        name,
        query,
        location: location || null,
        remoteOnly: remoteOnly || false,
      },
    });

    return NextResponse.json(savedSearch, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
