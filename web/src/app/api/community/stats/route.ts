import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/community/stats
 * Anonymous aggregated community statistics.
 * No personal data exposed -- just numbers.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Run all queries in parallel
    const [
      totalUsers,
      totalJobs,
      totalOutreach,
      totalInsiders,
      totalRequests,
      completedRequests,
      appliedJobs,
      interviewedJobs,
      offeredJobs,
      jobsWithReferrals,
      jobsWithReferralsThatGotInterviews,
      jobsWithoutReferrals,
      jobsWithoutReferralsThatGotInterviews,
      topCompanies,
      avgDaysToApply,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.job.count(),
      prisma.outreachEvent.count(),
      prisma.insiderProfile.count({ where: { active: true } }),
      prisma.referralRequest.count(),
      prisma.referralRequest.count({ where: { status: "completed" } }),
      prisma.job.count({ where: { applied: true } }),
      prisma.job.count({ where: { interviewStage: "interviewing" } }),
      prisma.job.count({ where: { interviewStage: { in: ["offer", "accepted"] } } }),
      // Jobs that have at least one outreach event with status >= responded
      prisma.job.count({
        where: {
          outreachEvents: {
            some: { statusRank: { gte: 3 } },
          },
        },
      }),
      prisma.job.count({
        where: {
          outreachEvents: {
            some: { statusRank: { gte: 3 } },
          },
          interviewStage: { not: null },
        },
      }),
      prisma.job.count({
        where: {
          outreachEvents: { none: {} },
          applied: true,
        },
      }),
      prisma.job.count({
        where: {
          outreachEvents: { none: {} },
          applied: true,
          interviewStage: { not: null },
        },
      }),
      // Top companies insiders work at
      prisma.insiderProfile.groupBy({
        by: ["company"],
        where: { active: true },
        _count: { company: true },
        orderBy: { _count: { company: "desc" } },
        take: 10,
      }),
      // Average days from job creation to applied
      prisma.$queryRaw`
        SELECT AVG(EXTRACT(EPOCH FROM ("appliedAt" - "createdAt")) / 86400)::float as avg_days
        FROM "Job"
        WHERE "applied" = true AND "appliedAt" IS NOT NULL
      ` as Promise<Array<{ avg_days: number | null }>>,
    ]);

    // Calculate referral impact
    const referralInterviewRate =
      jobsWithReferrals > 0
        ? Math.round((jobsWithReferralsThatGotInterviews / jobsWithReferrals) * 100)
        : 0;
    const noReferralInterviewRate =
      jobsWithoutReferrals > 0
        ? Math.round((jobsWithoutReferralsThatGotInterviews / jobsWithoutReferrals) * 100)
        : 0;
    const referralMultiplier =
      noReferralInterviewRate > 0
        ? Math.round((referralInterviewRate / noReferralInterviewRate) * 10) / 10
        : 0;

    return NextResponse.json({
      overview: {
        totalUsers,
        totalJobs,
        totalOutreach,
        totalInsiders,
        totalReferralRequests: totalRequests,
        completedReferrals: completedRequests,
      },
      pipeline: {
        applied: appliedJobs,
        interviewing: interviewedJobs,
        offers: offeredJobs,
      },
      referralImpact: {
        withReferral: {
          total: jobsWithReferrals,
          interviews: jobsWithReferralsThatGotInterviews,
          interviewRate: referralInterviewRate,
        },
        withoutReferral: {
          total: jobsWithoutReferrals,
          interviews: jobsWithoutReferralsThatGotInterviews,
          interviewRate: noReferralInterviewRate,
        },
        multiplier: referralMultiplier,
      },
      topCompanies: topCompanies.map((c) => ({
        company: c.company,
        insiders: c._count.company,
      })),
      avgDaysToApply: avgDaysToApply[0]?.avg_days
        ? Math.round(avgDaysToApply[0].avg_days)
        : null,
    });
  } catch (error) {
    console.error("Community stats error:", error);
    return NextResponse.json(
      { error: "Failed to load community stats" },
      { status: 500 }
    );
  }
}
