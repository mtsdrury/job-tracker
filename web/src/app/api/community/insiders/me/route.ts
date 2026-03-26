import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/community/insiders/me
 * Get the current user's insider profile (if they have one).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.insiderProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      referralRequests: {
        where: { status: { in: ["pending", "accepted"] } },
        select: {
          id: true,
          targetRole: true,
          message: true,
          status: true,
          createdAt: true,
          requester: {
            select: { name: true, image: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return NextResponse.json({ profile });
}

/**
 * POST /api/community/insiders/me
 * Create or update the current user's insider profile.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { company, role, department, linkedinUrl, bio, maxRequests, active } = body;

  if (!company || !role) {
    return NextResponse.json(
      { error: "Company and role are required" },
      { status: 400 }
    );
  }

  // Validate maxRequests: must be a number between 1 and 50
  const sanitizedMaxRequests =
    typeof maxRequests === "number" && maxRequests >= 1 && maxRequests <= 50
      ? Math.floor(maxRequests)
      : 5;

  const profile = await prisma.insiderProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      company,
      role,
      department: department || null,
      linkedinUrl: linkedinUrl || null,
      bio: bio || null,
      maxRequests: sanitizedMaxRequests,
      active: active !== false,
    },
    update: {
      company,
      role,
      department: department || null,
      linkedinUrl: linkedinUrl || null,
      bio: bio || null,
      maxRequests: sanitizedMaxRequests,
      active: active !== false,
    },
  });

  return NextResponse.json({ profile });
}

/**
 * DELETE /api/community/insiders/me
 * Deactivate (soft delete) the insider profile.
 */
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.insiderProfile.updateMany({
    where: { userId: session.user.id },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
