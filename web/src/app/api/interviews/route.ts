import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/interviews?jobId=xxx
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const interviews = await prisma.interview.findMany({
    where: { jobId, userId: session.user.id },
    orderBy: { scheduledAt: "asc" },
  });

  return NextResponse.json(interviews);
}

// POST /api/interviews
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      jobId,
      stage,
      scheduledAt,
      interviewerName,
      interviewerTitle,
      notes,
      prepNotes,
    } = body;

    if (!jobId || !stage) {
      return NextResponse.json(
        { error: "jobId and stage are required" },
        { status: 400 }
      );
    }

    // Verify the job belongs to the user
    const job = await prisma.job.findFirst({
      where: { id: jobId, userId: session.user.id },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    const interview = await prisma.interview.create({
      data: {
        jobId,
        userId: session.user.id,
        stage,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        interviewerName,
        interviewerTitle,
        notes,
        prepNotes,
      },
    });

    return NextResponse.json(interview, { status: 201 });
  } catch (error) {
    console.error("Error creating interview:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
