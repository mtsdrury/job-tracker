import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deriveNextAction } from "@/lib/next-action";

// GET /api/jobs - List user's jobs
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const archived = searchParams.get("archived") === "true";
  const applied = searchParams.get("applied");
  const search = searchParams.get("search");
  const includeClosed = searchParams.get("includeClosed") === "true";

  const where: Record<string, unknown> = {
    userId: session.user.id,
    archived,
  };

  if (!includeClosed) {
    where.isClosed = false;
  }

  if (applied !== null) {
    where.applied = applied === "true";
  }

  if (search) {
    where.OR = [
      { company: { contains: search, mode: "insensitive" } },
      { title: { contains: search, mode: "insensitive" } },
    ];
  }

  const jobs = await prisma.job.findMany({
    where,
    include: {
      resumeVersion: { select: { id: true, name: true } },
      outreachEvents: {
        include: { contact: { select: { id: true, name: true, company: true } } },
        orderBy: { lastActionAt: "desc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(jobs);
}

// POST /api/jobs - Create a new job
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check free tier limit
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { billingStatus: true },
  });

  if (user?.billingStatus === "free") {
    const jobCount = await prisma.job.count({
      where: { userId: session.user.id },
    });
    if (jobCount >= 25) {
      return NextResponse.json(
        { error: "Free tier limit reached (25 jobs). Upgrade to Pro for unlimited jobs." },
        { status: 403 }
      );
    }
  }

  try {
    const body = await req.json();
    const { title, company, location, remoteType, salaryMin, salaryMax, description, url, applyOptions, source, externalId, datePosted } = body;

    if (!title || !company) {
      return NextResponse.json({ error: "Title and company are required" }, { status: 400 });
    }

    // Derive initial next action based on user strategy
    const userCtx = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { strategyMode: true, stalledDays: true },
    });

    const newJobInput = {
      id: "",
      company,
      title,
      applied: false,
      appliedAt: null,
      datePosted: datePosted ? new Date(datePosted) : null,
      interviewStage: null,
      url: url || null,
      coverLetter: null,
      coverLetterFileUrl: null,
      resumeVersionId: null,
      nextActionOverride: false,
      strategyOverride: null,
      archived: false,
      createdAt: new Date(),
      outreachEvents: [],
    };

    const derived = deriveNextAction(newJobInput, {
      strategyMode: userCtx?.strategyMode || "referral_first",
      stalledDays: userCtx?.stalledDays ?? 5,
    });

    const job = await prisma.job.create({
      data: {
        userId: session.user.id,
        title,
        company,
        location,
        remoteType,
        salaryMin: salaryMin ? parseInt(salaryMin) : null,
        salaryMax: salaryMax ? parseInt(salaryMax) : null,
        description,
        url,
        applyOptions: applyOptions || undefined,
        source: source || "manual",
        externalId,
        datePosted: datePosted ? new Date(datePosted) : null,
        nextAction: derived.action,
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
