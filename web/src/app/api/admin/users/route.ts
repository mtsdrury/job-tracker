import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 25;

  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" as const } },
          { name: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        billingStatus: true,
        createdAt: true,
        config: true,
        _count: {
          select: {
            jobs: true,
            contacts: true,
            outreachEvents: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  const mapped = users.map((u) => ({
    ...u,
    isDemo: (u.config as Record<string, unknown> | null)?.is_demo === true,
    config: undefined, // don't leak full config
  }));

  return NextResponse.json({
    users: mapped,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
