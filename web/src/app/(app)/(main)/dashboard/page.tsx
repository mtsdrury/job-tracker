import { requireOnboarding } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Briefcase,
  Users,
  MessageSquare,
  AlertCircle,
  ArrowRight,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await requireOnboarding();
  const userId = session.user.id;

  const [
    totalJobs,
    appliedJobs,
    interviewingJobs,
    totalContacts,
    recentOutreach,
    activeJobs,
  ] = await Promise.all([
    prisma.job.count({ where: { userId, archived: false } }),
    prisma.job.count({ where: { userId, applied: true, archived: false } }),
    prisma.job.count({
      where: {
        userId,
        interviewStage: "interviewing",
        archived: false,
      },
    }),
    prisma.contact.count({ where: { userId } }),
    prisma.outreachEvent.count({
      where: {
        userId,
        lastActionAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.job.findMany({
      where: { userId, archived: false },
      include: {
        outreachEvents: {
          include: { contact: true },
          orderBy: { lastActionAt: "desc" },
        },
        resumeVersion: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  const notApplied = totalJobs - appliedJobs;

  // Compute nudges
  const nudges: Array<{
    message: string;
    urgency: "normal" | "warning" | "urgent";
    jobId?: string;
  }> = [];

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stalledDays: true, strategyMode: true },
  });
  const stalledDays = user?.stalledDays ?? 5;

  for (const job of activeJobs) {
    // No referral found
    if (!job.applied && job.outreachEvents.length === 0) {
      nudges.push({
        message: `No connections found for ${job.company} - ${job.title}`,
        urgency: "normal",
        jobId: job.id,
      });
    }

    // Referral identified but not messaged
    const identifiedOnly = job.outreachEvents.filter(
      (e) => e.status === "identified"
    );
    if (
      identifiedOnly.length > 0 &&
      identifiedOnly.length === job.outreachEvents.length
    ) {
      nudges.push({
        message: `You have contacts at ${job.company} but haven't reached out yet`,
        urgency: "warning",
        jobId: job.id,
      });
    }

    // Stale outreach
    for (const event of job.outreachEvents) {
      if (event.status === "message_sent") {
        const daysSince = Math.floor(
          (Date.now() - new Date(event.lastActionAt).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (daysSince >= stalledDays + 4) {
          nudges.push({
            message: `No response from ${event.contact.name} at ${job.company} for ${daysSince} days`,
            urgency: "urgent",
            jobId: job.id,
          });
        } else if (daysSince >= stalledDays) {
          nudges.push({
            message: `${event.contact.name} at ${job.company} hasn't responded in ${daysSince} days. Follow up?`,
            urgency: "warning",
            jobId: job.id,
          });
        }
      }
    }

    // Posting getting old
    if (job.datePosted) {
      const daysSincePosted = Math.floor(
        (Date.now() - new Date(job.datePosted).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (daysSincePosted > 21) {
        nudges.push({
          message: `${job.company} - ${job.title} was posted ${daysSincePosted} days ago`,
          urgency: "urgent",
          jobId: job.id,
        });
      } else if (daysSincePosted > 5) {
        nudges.push({
          message: `${job.company} - ${job.title} was posted ${daysSincePosted} days ago`,
          urgency: "warning",
          jobId: job.id,
        });
      }
    }

    // Days since applied with no update
    if (job.applied && job.appliedAt) {
      const daysSinceApplied = Math.floor(
        (Date.now() - new Date(job.appliedAt).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (daysSinceApplied > 28 && job.interviewStage === null) {
        nudges.push({
          message: `Applied to ${job.company} ${daysSinceApplied} days ago with no update`,
          urgency: "urgent",
          jobId: job.id,
        });
      } else if (daysSinceApplied > 14 && job.interviewStage === null) {
        nudges.push({
          message: `Applied to ${job.company} ${daysSinceApplied} days ago. Follow up?`,
          urgency: "warning",
          jobId: job.id,
        });
      }
    }

    // Missing URL
    if (!job.url && !job.applied) {
      nudges.push({
        message: `${job.company} - ${job.title} has no URL`,
        urgency: "normal",
        jobId: job.id,
      });
    }
  }

  // Sort: urgent first, then warning, then normal
  const urgencyOrder = { urgent: 0, warning: 1, normal: 2 };
  nudges.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  const urgencyBadge = (u: "normal" | "warning" | "urgent") => {
    const map = {
      normal: "default",
      warning: "warning",
      urgent: "danger",
    } as const;
    return map[u];
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href="/jobs/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Add Job
          </Button>
        </Link>
      </div>

      {/* Pipeline Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-accent/10 p-2">
                <Briefcase className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalJobs}</p>
                <p className="text-xs text-muted">Total Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-warning/10 p-2">
                <MessageSquare className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{notApplied}</p>
                <p className="text-xs text-muted">Networking</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-success/10 p-2">
                <Briefcase className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{appliedJobs}</p>
                <p className="text-xs text-muted">Applied</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-accent/10 p-2">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalContacts}</p>
                <p className="text-xs text-muted">Contacts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Nudges / Action Items */}
      {nudges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Action Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {nudges.slice(0, 8).map((nudge, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={urgencyBadge(nudge.urgency)}>
                      {nudge.urgency}
                    </Badge>
                    <span className="text-sm">{nudge.message}</span>
                  </div>
                  {nudge.jobId && (
                    <Link href={`/jobs/${nudge.jobId}`}>
                      <ArrowRight className="h-4 w-4 text-muted hover:text-foreground" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Jobs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Jobs</CardTitle>
            <Link href="/jobs" className="text-sm text-accent hover:underline">
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {activeJobs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted">
                No jobs yet. Start by searching or adding a job.
              </p>
              <Link href="/jobs/new" className="mt-2 inline-block">
                <Button variant="secondary" size="sm">
                  Add your first job
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {activeJobs.slice(0, 5).map((job) => (
                <Link key={job.id} href={`/jobs/${job.id}`}>
                  <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-surface-hover transition-colors">
                    <div>
                      <p className="text-sm font-medium">{job.company}</p>
                      <p className="text-xs text-muted">{job.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {job.applied ? (
                        <Badge variant="success">Applied</Badge>
                      ) : job.nextAction ? (
                        <Badge variant="info">{job.nextAction}</Badge>
                      ) : (
                        <Badge>Not Applied</Badge>
                      )}
                      {job.outreachEvents.length > 0 && (
                        <Badge variant="info">
                          {job.outreachEvents.length} contact
                          {job.outreachEvents.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
