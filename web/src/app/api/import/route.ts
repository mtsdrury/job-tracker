import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deriveNextAction } from "@/lib/next-action";

interface JobInput {
  company?: string;
  title?: string;
  location?: string;
  remoteType?: string;
  description?: string;
  url?: string;
  appliedAt?: string;
  applied?: boolean;
  notes?: string;
  resumeVersion?: string;
  coverLetterWritten?: boolean;
}

interface ErrorDetail {
  row: number;
  reason: string;
}

interface ImportResponse {
  imported: number;
  skipped: number;
  errors: number;
  errorDetails: ErrorDetail[];
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jobs = (await req.json()) as JobInput[];

    if (!Array.isArray(jobs)) {
      return NextResponse.json(
        { error: "Expected an array of jobs" },
        { status: 400 }
      );
    }

    if (jobs.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 jobs per import" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { billingStatus: true, strategyMode: true, stalledDays: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const result: ImportResponse = {
      imported: 0,
      skipped: 0,
      errors: 0,
      errorDetails: [],
    };

    if (user.billingStatus === "free") {
      const currentJobCount = await prisma.job.count({
        where: { userId: session.user.id },
      });

      if (currentJobCount + jobs.length > 25) {
        return NextResponse.json(
          {
            error: "Free tier limit exceeded. You can import at most 25 jobs total.",
            imported: 0,
            skipped: 0,
            errors: jobs.length,
            errorDetails: jobs.map((_, idx) => ({
              row: idx + 1,
              reason: "Free tier limit (25 jobs max). Upgrade to Pro for unlimited.",
            })),
          },
          { status: 403 }
        );
      }
    }

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      const rowNum = i + 1;

      if (!job.company?.trim()) {
        result.errors++;
        result.errorDetails.push({ row: rowNum, reason: "Company is required" });
        continue;
      }

      if (!job.title?.trim()) {
        result.errors++;
        result.errorDetails.push({ row: rowNum, reason: "Role/Title is required" });
        continue;
      }

      try {
        const appliedAt = job.appliedAt ? new Date(job.appliedAt) : null;
        const applied = appliedAt ? true : false;

        const resumeVersionId = job.resumeVersion
          ? await findOrCreateResumeVersion(
              session.user.id,
              job.resumeVersion
            )
          : null;

        const newJobInput = {
          id: "",
          company: job.company,
          title: job.title,
          applied,
          appliedAt,
          datePosted: null,
          interviewStage: null,
          url: job.url || null,
          coverLetter: null,
          coverLetterFileUrl: null,
          resumeVersionId,
          nextActionOverride: false,
          strategyOverride: null,
          archived: false,
          createdAt: new Date(),
          outreachEvents: [],
        };

        const derived = deriveNextAction(newJobInput, {
          strategyMode: user.strategyMode || "referral_first",
          stalledDays: user.stalledDays ?? 5,
        });

        await prisma.job.create({
          data: {
            userId: session.user.id,
            company: job.company.trim(),
            title: job.title.trim(),
            location: job.location?.trim() || null,
            remoteType: job.remoteType?.trim() || null,
            description: job.description?.trim() || null,
            url: job.url?.trim() || null,
            appliedAt: applied ? appliedAt : null,
            applied,
            resumeVersionId,
            notes: job.notes?.trim() || null,
            source: "import",
            nextAction: derived.action,
          },
        });

        result.imported++;
      } catch (err) {
        result.errors++;
        const errorMsg =
          err instanceof Error ? err.message : "Unknown error";
        result.errorDetails.push({
          row: rowNum,
          reason: errorMsg.substring(0, 100),
        });
      }
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json(
      { error: "Failed to process import request" },
      { status: 500 }
    );
  }
}

async function findOrCreateResumeVersion(
  userId: string,
  versionName: string
): Promise<string | null> {
  const name = versionName.trim();
  if (!name) return null;

  let resumeVersion = await prisma.resumeVersion.findUnique({
    where: { userId_name: { userId, name } },
  });

  if (!resumeVersion) {
    resumeVersion = await prisma.resumeVersion.create({
      data: { userId, name },
    });
  }

  return resumeVersion.id;
}
