import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    // Fetch all necessary data in parallel
    const [
      allJobs,
      allOutreachEvents,
      allInterviews,
      resumeVersions,
      messageTemplates,
    ] = await Promise.all([
      prisma.job.findMany({
        where: { userId, archived: false },
        include: {
          outreachEvents: {
            include: { contact: true },
          },
          resumeVersion: true,
          interviews: true,
        },
      }),
      prisma.outreachEvent.findMany({
        where: { userId },
        include: {
          job: true,
          contact: true,
        },
      }),
      prisma.interview.findMany({
        where: { userId },
        include: { job: true },
      }),
      prisma.resumeVersion.findMany({
        where: { userId },
      }),
      prisma.messageTemplate.findMany({
        where: { userId },
      }),
    ]);

    // ============================================================================
    // 1. Pipeline Breakdown: count of jobs by status
    // ============================================================================
    const pipelineBreakdown = {
      saved: 0,
      networking: 0,
      applied: 0,
      interviewing: 0,
      offer: 0,
      rejected: 0,
      withdrawn: 0,
    };

    allJobs.forEach((job) => {
      if (job.interviewStage === "offer") {
        pipelineBreakdown.offer++;
      } else if (job.interviewStage === "rejected") {
        pipelineBreakdown.rejected++;
      } else if (job.interviewStage === "withdrawn") {
        pipelineBreakdown.withdrawn++;
      } else if (job.interviewStage === "interviewing") {
        pipelineBreakdown.interviewing++;
      } else if (job.applied) {
        pipelineBreakdown.applied++;
      } else {
        pipelineBreakdown.networking++;
      }
    });

    // Add saved (jobs with no outreach)
    pipelineBreakdown.saved = allJobs.filter(
      (j) => j.outreachEvents.length === 0 && !j.applied
    ).length;

    // ============================================================================
    // 2. Application Funnel: conversion rates at each stage
    // ============================================================================
    const totalJobs = allJobs.length;
    const jobsWithNetworking = allJobs.filter(
      (j) => j.outreachEvents.length > 0
    ).length;
    const jobsApplied = allJobs.filter((j) => j.applied).length;
    const jobsInterviewing = allJobs.filter(
      (j) => j.interviewStage === "interviewing"
    ).length;
    const jobsWithOffers = allJobs.filter(
      (j) => j.interviewStage === "offer"
    ).length;

    const funnel = {
      saved: { count: totalJobs, percentage: 100 },
      networking: {
        count: jobsWithNetworking,
        percentage: totalJobs > 0 ? (jobsWithNetworking / totalJobs) * 100 : 0,
        conversionRate:
          totalJobs > 0 ? (jobsWithNetworking / totalJobs) * 100 : 0,
      },
      applied: {
        count: jobsApplied,
        percentage: totalJobs > 0 ? (jobsApplied / totalJobs) * 100 : 0,
        conversionRate:
          jobsWithNetworking > 0
            ? (jobsApplied / jobsWithNetworking) * 100
            : 0,
      },
      interview: {
        count: jobsInterviewing,
        percentage: totalJobs > 0 ? (jobsInterviewing / totalJobs) * 100 : 0,
        conversionRate:
          jobsApplied > 0 ? (jobsInterviewing / jobsApplied) * 100 : 0,
      },
      offer: {
        count: jobsWithOffers,
        percentage: totalJobs > 0 ? (jobsWithOffers / totalJobs) * 100 : 0,
        conversionRate:
          jobsInterviewing > 0
            ? (jobsWithOffers / jobsInterviewing) * 100
            : 0,
      },
    };

    // ============================================================================
    // 3. Outreach stats: response rate, average response time
    // ============================================================================
    const respondedOutreach = allOutreachEvents.filter((e) =>
      ["responded", "sharing_internally", "referral_requested", "referral_secured", "referral_submitted"].includes(
        e.status
      )
    );

    const outreachStats = {
      totalOutreach: allOutreachEvents.length,
      responded: respondedOutreach.length,
      responseRate:
        allOutreachEvents.length > 0
          ? (respondedOutreach.length / allOutreachEvents.length) * 100
          : 0,
      averageResponseTime: calculateAverageResponseTime(
        respondedOutreach
      ),
    };

    // ============================================================================
    // 4. Resume performance: for each resume, how many apps and interview rate
    // ============================================================================
    const resumePerformance = resumeVersions.map((resume) => {
      const jobsUsingResume = allJobs.filter(
        (j) => j.resumeVersionId === resume.id
      );
      const jobsUsingResumeWithInterview = jobsUsingResume.filter(
        (j) => j.interviewStage === "interviewing" || j.interviewStage === "offer"
      );

      return {
        id: resume.id,
        name: resume.name,
        applicationsCount: jobsUsingResume.length,
        interviewsCount: jobsUsingResumeWithInterview.length,
        interviewRate:
          jobsUsingResume.length > 0
            ? (jobsUsingResumeWithInterview.length / jobsUsingResume.length) * 100
            : 0,
      };
    });

    // ============================================================================
    // 5. Template effectiveness: message templates used and response rates
    // ============================================================================
    const templateEffectiveness = messageTemplates.map((template) => {
      // Rough estimate: templates are referenced by name, we'll count by job notes
      // In a real system, you'd track template usage in OutreachEvent
      const relatedOutreach = allOutreachEvents.filter(
        (e) =>
          e.messageFinal?.includes(template.body.substring(0, 30)) ||
          e.messageDraft?.includes(template.body.substring(0, 30))
      );

      const respondedCount = relatedOutreach.filter((e) =>
        ["responded", "sharing_internally", "referral_requested", "referral_secured", "referral_submitted"].includes(
          e.status
        )
      ).length;

      return {
        id: template.id,
        name: template.name,
        category: template.category,
        usageCount: relatedOutreach.length,
        responseRate:
          relatedOutreach.length > 0
            ? (respondedCount / relatedOutreach.length) * 100
            : 0,
      };
    });

    // ============================================================================
    // 6. Timeline data: jobs added and applications per week (last 12 weeks)
    // ============================================================================
    const now = new Date();
    const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);

    const timelineData = generateWeeklyTimeline(
      allJobs,
      twelveWeeksAgo,
      now
    );

    // ============================================================================
    // 7. Interview stats: pass rate by stage
    // ============================================================================
    const interviewsByStage: Record<string, { total: number; passed: number }> = {};

    allInterviews.forEach((interview) => {
      const stage = interview.stage || "unknown";
      if (!interviewsByStage[stage]) {
        interviewsByStage[stage] = { total: 0, passed: 0 };
      }
      interviewsByStage[stage].total++;
      if (interview.outcome === "passed") {
        interviewsByStage[stage].passed++;
      }
    });

    const interviewPerformance = Object.entries(interviewsByStage).map(
      ([stage, data]) => ({
        stage,
        total: data.total,
        passed: data.passed,
        passRate:
          data.total > 0 ? (data.passed / data.total) * 100 : 0,
      })
    );

    // ============================================================================
    // 8. Time metrics: days from saved to applied, applied to interview
    // ============================================================================
    const timeMetrics = {
      avgDaysToApply: calculateAvgDaysToApply(allJobs),
      avgDaysToInterview: calculateAvgDaysToInterview(allJobs),
      avgDaysToOffer: calculateAvgDaysToOffer(allJobs),
    };

    // ============================================================================
    // 9. Key metrics
    // ============================================================================
    const totalApplications = jobsApplied;
    const interviewRate =
      totalApplications > 0 ? (jobsInterviewing / totalApplications) * 100 : 0;

    return NextResponse.json({
      summary: {
        totalJobs,
        totalApplications,
        totalInterviews: jobsInterviewing,
        responseRate: outreachStats.responseRate,
        interviewRate,
        averageTimeToApply: timeMetrics.avgDaysToApply,
      },
      pipelineBreakdown,
      funnel,
      outreachStats,
      resumePerformance,
      templateEffectiveness: templateEffectiveness.filter(
        (t) => t.usageCount > 0
      ),
      timelineData,
      interviewPerformance,
      timeMetrics,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateAverageResponseTime(
  respondedOutreach: any[]
): number {
  if (respondedOutreach.length === 0) return 0;

  const totalMs = respondedOutreach.reduce((sum, e) => {
    const created = new Date(e.createdAt).getTime();
    const lastAction = new Date(e.lastActionAt).getTime();
    return sum + (lastAction - created);
  }, 0);

  const avgMs = totalMs / respondedOutreach.length;
  return Math.round(avgMs / (1000 * 60 * 60 * 24)); // Convert to days
}

function generateWeeklyTimeline(
  jobs: any[],
  startDate: Date,
  endDate: Date
): Array<{
  week: string;
  jobsAdded: number;
  applicationsSubmitted: number;
}> {
  const weeks: Record<string, { jobsAdded: number; applicationsSubmitted: number }> = {};

  let currentWeek = new Date(startDate);
  while (currentWeek <= endDate) {
    const weekEnd = new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
    const weekKey = currentWeek.toISOString().split("T")[0];
    weeks[weekKey] = { jobsAdded: 0, applicationsSubmitted: 0 };
    currentWeek = weekEnd;
  }

  jobs.forEach((job) => {
    const createdDate = new Date(job.createdAt);
    if (createdDate >= startDate && createdDate <= endDate) {
      const weekKey = getWeekStart(createdDate).toISOString().split("T")[0];
      if (weeks[weekKey]) weeks[weekKey].jobsAdded++;
    }

    if (job.applied && job.appliedAt) {
      const appliedDate = new Date(job.appliedAt);
      if (appliedDate >= startDate && appliedDate <= endDate) {
        const weekKey = getWeekStart(appliedDate).toISOString().split("T")[0];
        if (weeks[weekKey]) weeks[weekKey].applicationsSubmitted++;
      }
    }
  });

  return Object.entries(weeks).map(([week, data]) => ({
    week,
    jobsAdded: data.jobsAdded,
    applicationsSubmitted: data.applicationsSubmitted,
  }));
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

function calculateAvgDaysToApply(jobs: any[]): number {
  const jobsWithAppliedDate = jobs.filter(
    (j) => j.applied && j.appliedAt && j.createdAt
  );

  if (jobsWithAppliedDate.length === 0) return 0;

  const totalDays = jobsWithAppliedDate.reduce((sum, j) => {
    const created = new Date(j.createdAt).getTime();
    const applied = new Date(j.appliedAt).getTime();
    const days = (applied - created) / (1000 * 60 * 60 * 24);
    return sum + days;
  }, 0);

  return Math.round(totalDays / jobsWithAppliedDate.length);
}

function calculateAvgDaysToInterview(jobs: any[]): number {
  const jobsWithInterview = jobs.filter(
    (j) =>
      (j.interviewStage === "interviewing" ||
        j.interviewStage === "offer") &&
      j.appliedAt &&
      j.interviews?.length > 0
  );

  if (jobsWithInterview.length === 0) return 0;

  const totalDays = jobsWithInterview.reduce((sum, j) => {
    const applied = new Date(j.appliedAt).getTime();
    const firstInterview = j.interviews
      .map((i: any) => new Date(i.scheduledAt).getTime())
      .sort((a: number, b: number) => a - b)[0];
    const days = (firstInterview - applied) / (1000 * 60 * 60 * 24);
    return sum + Math.max(0, days);
  }, 0);

  return Math.round(totalDays / jobsWithInterview.length);
}

function calculateAvgDaysToOffer(jobs: any[]): number {
  const jobsWithOffer = jobs.filter(
    (j) => j.interviewStage === "offer" && j.appliedAt
  );

  if (jobsWithOffer.length === 0) return 0;

  const totalDays = jobsWithOffer.reduce((sum, j) => {
    const applied = new Date(j.appliedAt).getTime();
    const lastUpdate = new Date(j.updatedAt).getTime();
    const days = (lastUpdate - applied) / (1000 * 60 * 60 * 24);
    return sum + Math.max(0, days);
  }, 0);

  return Math.round(totalDays / jobsWithOffer.length);
}
