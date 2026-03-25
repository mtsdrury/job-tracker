import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deriveNextAction } from "@/lib/next-action";

// GET /api/jobs/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const job = await prisma.job.findFirst({
    where: { id, userId: session.user.id },
    include: {
      resumeVersion: true,
      outreachEvents: {
        include: { contact: true },
        orderBy: { lastActionAt: "desc" },
      },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}

// PATCH /api/jobs/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const existing = await prisma.job.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();

    // Handle apply action
    if (body.applied === true && !existing.applied) {
      body.appliedAt = new Date();
    }

    const job = await prisma.job.update({
      where: { id },
      data: body,
      include: {
        outreachEvents: {
          include: { contact: { select: { id: true, name: true, company: true } } },
        },
      },
    });

    // Re-derive next action (unless user has manually overridden)
    if (!job.nextActionOverride) {
      const userCtx = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { strategyMode: true, stalledDays: true },
      });
      const derived = deriveNextAction(job, {
        strategyMode: userCtx?.strategyMode || "referral_first",
        stalledDays: userCtx?.stalledDays ?? 5,
      });

      if (derived.action !== job.nextAction) {
        await prisma.job.update({
          where: { id },
          data: { nextAction: derived.action },
        });
        job.nextAction = derived.action;
      }
    }

    return NextResponse.json(job);
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// DELETE /api/jobs/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.job.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.job.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
