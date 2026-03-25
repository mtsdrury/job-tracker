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
  Bookmark,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateNudges, deriveNextAction } from "@/lib/next-action";
import { EmptyDashboard } from "@/components/ui/empty-state";

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
    user,
    savedSearches,
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
    prisma.user.findUnique({
      where: { id: userId },
      select: { stalledDays: true, strategyMode: true, billingStatus: true },
    }),
    prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const notApplied = totalJobs - appliedJobs;

  // Compute nudges using the centralized derivation engine
  const userContext = {
    strategyMode: user?.strategyMode || "referral_first",
    stalledDays: user?.stalledDays ?? 5,
  };

  const nudges = generateNudges(activeJobs, userContext);

  // Also re-derive next actions for displayed jobs (keeps them fresh on page load)
  for (const job of activeJobs) {
    if (!job.nextActionOverride && !job.archived) {
      const derived = deriveNextAction(job, userContext);
      if (derived.action !== job.nextAction) {
        job.nextAction = derived.action;
        // Fire-and-forget DB update to keep it in sync
        prisma.job.update({
          where: { id: job.id },
          data: { nextAction: derived.action },
        }).catch(() => { /* non-critical */ });
      }
    }
  }

  const urgencyBadge = (u: string) => {
    const map: Record<string, "default" | "warning" | "danger"> = {
      normal: "default",
      warning: "warning",
      urgent: "danger",
    };
    return map[u] || "default";
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

      {totalJobs === 0 ? (
        <EmptyDashboard />
      ) : (
      <>
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
                      {job.nextAction && (
                        <Badge variant={
                          job.nextAction.includes("Follow up") ? "warning" :
                          job.nextAction.includes("Apply") ? "danger" :
                          "info"
                        }>{job.nextAction}</Badge>
                      )}
                      {job.applied ? (
                        <Badge variant="success">Applied</Badge>
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

      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bookmark className="h-5 w-5 text-accent" />
                Saved Searches
              </CardTitle>
              <Link
                href="/jobs/search"
                className="text-sm text-accent hover:underline"
              >
                Manage
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {savedSearches.map((search) => (
                <Link
                  key={search.id}
                  href={`/jobs/search?query=${encodeURIComponent(search.query)}${
                    search.location ? `&location=${encodeURIComponent(search.location)}` : ""
                  }${search.remoteOnly ? "&remote=true" : ""}`}
                >
                  <div className="rounded-lg border border-border p-3 hover:bg-surface-hover transition-colors group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{search.name}</p>
                        <p className="text-xs text-muted truncate">{search.query}</p>
                        {search.location && (
                          <p className="text-xs text-muted">{search.location}</p>
                        )}
                        {search.remoteOnly && (
                          <Badge variant="info" className="text-xs mt-1">
                            Remote only
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </>
      )}
    </div>
  );
}
