import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/community/requests
 * Get all referral requests made BY the current user.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requests = await prisma.referralRequest.findMany({
    where: { requesterId: session.user.id },
    select: {
      id: true,
      targetRole: true,
      message: true,
      status: true,
      insiderNote: true,
      createdAt: true,
      updatedAt: true,
      insiderProfile: {
        select: {
          company: true,
          role: true,
          user: { select: { name: true, image: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests });
}

/**
 * POST /api/community/requests
 * Create a referral request to an insider.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { insiderProfileId, targetRole, message, resumeUrl } = body;

  if (!insiderProfileId || !targetRole || !message) {
    return NextResponse.json(
      { error: "insiderProfileId, targetRole, and message are required" },
      { status: 400 }
    );
  }

  // Verify the insider exists and is active
  const insider = await prisma.insiderProfile.findUnique({
    where: { id: insiderProfileId },
    select: {
      id: true,
      userId: true,
      active: true,
      maxRequests: true,
      _count: {
        select: {
          referralRequests: {
            where: { status: { in: ["pending", "accepted"] } },
          },
        },
      },
    },
  });

  if (!insider || !insider.active) {
    return NextResponse.json(
      { error: "Insider profile not found or inactive" },
      { status: 404 }
    );
  }

  // Can't request a referral from yourself
  if (insider.userId === session.user.id) {
    return NextResponse.json(
      { error: "You can't request a referral from yourself" },
      { status: 400 }
    );
  }

  // Check capacity
  if (insider._count.referralRequests >= insider.maxRequests) {
    return NextResponse.json(
      { error: "This insider has reached their maximum active requests" },
      { status: 400 }
    );
  }

  // Check for duplicate pending request
  const existing = await prisma.referralRequest.findFirst({
    where: {
      requesterId: session.user.id,
      insiderProfileId,
      status: "pending",
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "You already have a pending request with this insider" },
      { status: 400 }
    );
  }

  const request = await prisma.referralRequest.create({
    data: {
      requesterId: session.user.id,
      insiderProfileId,
      insiderId: insider.userId,
      targetRole,
      message,
      resumeUrl: resumeUrl || null,
    },
  });

  return NextResponse.json({ request }, { status: 201 });
}
