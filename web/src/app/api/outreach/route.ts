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

// POST /api/outreach - Create an outreach event
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { jobId, contactId, status, messageDraft, platform, notes } = body;

    if (!jobId || !contactId) {
      return NextResponse.json({ error: "jobId and contactId are required" }, { status: 400 });
    }

    // Verify ownership of both job and contact
    const [job, contact] = await Promise.all([
      prisma.job.findFirst({ where: { id: jobId, userId: session.user.id } }),
      prisma.contact.findFirst({ where: { id: contactId, userId: session.user.id } }),
    ]);

    if (!job || !contact) {
      return NextResponse.json({ error: "Job or contact not found" }, { status: 404 });
    }

    const outreachStatus = status || "identified";
    const statusRank = STATUS_RANKS[outreachStatus] ?? 0;

    const event = await prisma.outreachEvent.create({
      data: {
        userId: session.user.id,
        jobId,
        contactId,
        status: outreachStatus,
        statusRank,
        messageDraft,
        platform,
        notes,
      },
      include: { contact: true, job: true },
    });

    // Re-derive the parent job's next action
    const fullJob = await prisma.job.findUnique({
      where: { id: jobId },
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
          where: { id: jobId },
          data: { nextAction: derived.action },
        });
      }
    }

    return NextResponse.json(event, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
