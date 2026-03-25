import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deriveNextAction } from "@/lib/next-action";

const STATUS_RANKS: Record<string, number> = {
  identified: 0,
  message_drafted: 1,
  message_sent: 2,
  responded: 3,
  sharing_internally: 4,
  referral_requested: 5,
  referral_secured: 6,
  referral_submitted: 7,
  no_response: -1,
  declined: -2,
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.outreachEvent.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();

    // Auto-update statusRank when status changes
    if (body.status) {
      body.statusRank = STATUS_RANKS[body.status] ?? 0;
      body.lastActionAt = new Date();
    }

    const event = await prisma.outreachEvent.update({
      where: { id },
      data: body,
      include: { contact: true, job: true },
    });

    // Re-derive the parent job's next action
    const fullJob = await prisma.job.findUnique({
      where: { id: existing.jobId },
      include: {
        outreachEvents: {
          include: { contact: { select: { id: true, name: true, company: true } } },
        },
      },
    });

    if (fullJob && !fullJob.nextActionOverride) {
      const userCtx = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { strategyMode: true, stalledDays: true },
      });
      const derived = deriveNextAction(fullJob, {
        strategyMode: userCtx?.strategyMode || "referral_first",
        stalledDays: userCtx?.stalledDays ?? 5,
      });
      if (derived.action !== fullJob.nextAction) {
        await prisma.job.update({
          where: { id: existing.jobId },
          data: { nextAction: derived.action },
        });
      }
    }

    return NextResponse.json(event);
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.outreachEvent.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.outreachEvent.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
