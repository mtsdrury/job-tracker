import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/community/insiders?company=Google&page=1
 * Browse insider profiles. Authenticated users only.
 * Returns public profile info (no emails, no private data).
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const company = searchParams.get("company") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = 20;
  const skip = (page - 1) * limit;

  const where = {
    active: true,
    ...(company
      ? { company: { contains: company, mode: "insensitive" as const } }
      : {}),
  };

  const [insiders, total] = await Promise.all([
    prisma.insiderProfile.findMany({
      where,
      select: {
        id: true,
        company: true,
        role: true,
        department: true,
        bio: true,
        linkedinUrl: true,
        maxRequests: true,
        createdAt: true,
        user: {
          select: { name: true, image: true },
        },
        _count: {
          select: {
            referralRequests: {
              where: { status: { in: ["pending", "accepted"] } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.insiderProfile.count({ where }),
  ]);

  // Map to safe public shape
  const results = insiders.map((p) => ({
    id: p.id,
    name: p.user.name || "Anonymous",
    avatar: p.user.image,
    company: p.company,
    role: p.role,
    department: p.department,
    bio: p.bio,
    linkedinUrl: p.linkedinUrl,
    activeRequests: p._count.referralRequests,
    maxRequests: p.maxRequests,
    available: p._count.referralRequests < p.maxRequests,
    joinedAt: p.createdAt,
  }));

  return NextResponse.json({
    insiders: results,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
