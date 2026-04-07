import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// POST /api/admin/impersonate — Start impersonating a user
// Returns the user's data so the admin dashboard can show their view
export async function POST(req: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      billingStatus: true,
      strategyMode: true,
      config: true,
    },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Return a token/cookie approach would be more robust, but for now
  // we'll return user info and let the admin dashboard display their data
  return NextResponse.json({
    impersonating: {
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      billingStatus: targetUser.billingStatus,
    },
    adminId: session!.user.id,
  });
}
