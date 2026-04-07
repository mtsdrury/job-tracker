import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// GET /api/admin/users/[id] — Full user detail with their jobs, contacts, outreach
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      billingStatus: true,
      stripeCustomerId: true,
      strategyMode: true,
      stalledDays: true,
      createdAt: true,
      config: true,
      targetRoles: true,
      preferredLocations: true,
      remotePreference: true,
      jobs: {
        select: {
          id: true,
          title: true,
          company: true,
          applied: true,
          appliedAt: true,
          interviewStage: true,
          nextAction: true,
          isClosed: true,
          archived: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      contacts: {
        select: {
          id: true,
          name: true,
          company: true,
          title: true,
          connectionType: true,
        },
        take: 50,
      },
      outreachEvents: {
        select: {
          id: true,
          status: true,
          platform: true,
          lastActionAt: true,
          contact: { select: { name: true, company: true } },
        },
        orderBy: { lastActionAt: "desc" },
        take: 50,
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

// PATCH /api/admin/users/[id] — Update user fields (role, billingStatus, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();

  // Only allow updating specific fields
  const allowed: Record<string, unknown> = {};
  if (body.role !== undefined) allowed.role = body.role;
  if (body.billingStatus !== undefined) allowed.billingStatus = body.billingStatus;

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Prevent de-admining yourself
  if (allowed.role && allowed.role !== "admin" && id === session!.user.id) {
    return NextResponse.json({ error: "Cannot remove your own admin role" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: allowed,
    select: { id: true, email: true, name: true, role: true, billingStatus: true },
  });

  return NextResponse.json(updated);
}

// DELETE /api/admin/users/[id] — Delete a user and all their data
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  // Can't delete yourself
  if (id === session!.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
