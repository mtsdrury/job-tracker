import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/community/requests/[id]
 * Update a referral request (insider accepts/declines, or either party adds notes).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status, insiderNote } = body;

  // Find the request
  const request = await prisma.referralRequest.findUnique({
    where: { id },
    select: {
      id: true,
      requesterId: true,
      insiderId: true,
      status: true,
    },
  });

  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  // Only the insider can accept/decline. Only the requester can withdraw.
  const isInsider = request.insiderId === session.user.id;
  const isRequester = request.requesterId === session.user.id;

  if (!isInsider && !isRequester) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const updateData: Record<string, unknown> = {};

  if (status) {
    // Insiders can: accept, decline, complete
    if (isInsider && ["accepted", "declined", "completed"].includes(status)) {
      updateData.status = status;
    }
    // Requesters can: withdraw (cancel)
    else if (isRequester && status === "withdrawn") {
      updateData.status = status;
    } else {
      return NextResponse.json(
        { error: "Invalid status transition" },
        { status: 400 }
      );
    }
  }

  if (insiderNote !== undefined && isInsider) {
    updateData.insiderNote = insiderNote;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.referralRequest.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ request: updated });
}
