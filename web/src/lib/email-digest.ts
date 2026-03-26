import { prisma } from "@/lib/prisma";
import { DigestData } from "@/lib/resend";

export async function buildDigestData(userId: string): Promise<DigestData | null> {
  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(now);
    weekEnd.setHours(23, 59, 59, 999);

    // Fetch user's stalled threshold
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stalledDays: true },
    });

    const stalledDaysThreshold = user?.stalledDays || 5;

    // Fetch all relevant data
    const jobs = await prisma.job.findMany({
      where: { userId, archived: false },
      select: {
        id: true,
        company: true,
        title: true,
        applied: true,
        appliedAt: true,
        createdAt: true,
        updatedAt: true,
        interviewStage: true,
      },
    });

    const interviews = await prisma.interview.findMany({
      where: {
        userId,
        scheduledAt: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        job: { select: { company: true, title: true } },
      },
    });

    const outreachEvents = await prisma.outreachEvent.findMany({
      where: {
        userId,
        updatedAt: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      include: {
        contact: { select: { name: true } },
        job: { select: { company: true, title: true } },
      },
    });

    // Build digest data
    const jobsAdded = jobs
      .filter((j) => j.createdAt >= weekStart && j.createdAt <= weekEnd)
      .map((j) => ({ company: j.company, title: j.title }));

    const jobsApplied = jobs
      .filter((j) => j.applied && j.appliedAt && j.appliedAt >= weekStart && j.appliedAt <= weekEnd)
      .map((j) => ({ company: j.company, title: j.title }));

    const stalledJobs = jobs
      .filter((j) => {
        const daysSinceUpdate = Math.floor((now.getTime() - j.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceUpdate >= stalledDaysThreshold && j.interviewStage === null;
      })
      .map((j) => ({
        company: j.company,
        title: j.title,
        daysSinceUpdate: Math.floor((now.getTime() - j.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
      }))
      .slice(0, 5); // Limit to 5 stalled jobs

    const outreachWithMetadata = outreachEvents.map((event) => ({
      company: event.job.company,
      role: event.job.title,
      contact: event.contact.name,
      status: event.status.replace(/_/g, " "),
      updatedAt: event.updatedAt,
    }));

    const upcomingInterviewsData = interviews.map((interview) => ({
      company: interview.job.company,
      title: interview.job.title,
      stage: interview.stage,
      scheduledAt: interview.scheduledAt || new Date(),
    }));

    // Pipeline summary
    const activeJobs = jobs.filter((j) => !j.applied && !j.interviewStage);
    const appliedJobs = jobs.filter((j) => j.applied && j.interviewStage === null);
    const interviewingJobs = jobs.filter((j) => j.interviewStage && j.interviewStage !== "offer" && j.interviewStage !== "accepted");
    const offerJobs = jobs.filter((j) => j.interviewStage === "offer" || j.interviewStage === "accepted");

    const digestData: DigestData = {
      weekStart,
      weekEnd,
      jobsAdded: {
        count: jobsAdded.length,
        items: jobsAdded,
      },
      jobsApplied: {
        count: jobsApplied.length,
        items: jobsApplied,
      },
      outreachEvents: {
        count: outreachWithMetadata.length,
        items: outreachWithMetadata,
      },
      upcomingInterviews: {
        count: upcomingInterviewsData.length,
        items: upcomingInterviewsData,
      },
      stalledJobs: {
        count: stalledJobs.length,
        items: stalledJobs,
      },
      pipelineSummary: {
        totalActive: activeJobs.length,
        totalApplied: appliedJobs.length,
        totalInterviewing: interviewingJobs.length,
        totalOffers: offerJobs.length,
      },
    };

    return digestData;
  } catch (error) {
    console.error("Failed to build digest data:", error);
    return null;
  }
}
