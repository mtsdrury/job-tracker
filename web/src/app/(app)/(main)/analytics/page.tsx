"use client";

import { useEffect, useState, memo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

interface AnalyticsData {
  summary: {
    totalJobs: number;
    totalApplications: number;
    totalInterviews: number;
    responseRate: number;
    interviewRate: number;
    averageTimeToApply: number;
  };
  pipelineBreakdown: Record<string, number>;
  funnel: Record<string, any>;
  outreachStats: {
    totalOutreach: number;
    responded: number;
    responseRate: number;
    averageResponseTime: number;
  };
  resumePerformance: Array<{
    id: string;
    name: string;
    applicationsCount: number;
    interviewsCount: number;
    interviewRate: number;
  }>;
  templateEffectiveness: Array<{
    id: string;
    name: string;
    category: string;
    usageCount: number;
    responseRate: number;
  }>;
  timelineData: Array<{
    week: string;
    jobsAdded: number;
    applicationsSubmitted: number;
  }>;
  interviewPerformance: Array<{
    stage: string;
    total: number;
    passed: number;
    passRate: number;
  }>;
  timeMetrics: {
    avgDaysToApply: number;
    avgDaysToInterview: number;
    avgDaysToOffer: number;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch("/api/analytics");
        if (!response.ok) throw new Error("Failed to fetch analytics");
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="text-center py-12">
          <p className="text-muted">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <Card className="border-danger/20 bg-danger/5">
          <CardContent className="pt-6">
            <p className="text-danger">Error: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted">No data available. Start by adding jobs to your pipeline.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Analytics</h1>

      {/* Row 1: Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Applications"
          value={data.summary.totalApplications}
          trend={null}
        />
        <MetricCard
          label="Response Rate"
          value={`${data.summary.responseRate.toFixed(1)}%`}
          trend={null}
        />
        <MetricCard
          label="Interview Rate"
          value={`${data.summary.interviewRate.toFixed(1)}%`}
          trend={null}
        />
        <MetricCard
          label="Avg Days to Apply"
          value={data.summary.averageTimeToApply}
          unit="days"
          trend={null}
        />
      </div>

      {/* Row 2: Pipeline Funnel */}
      {data.summary.totalJobs > 0 ? (
        <PipelineFunnel funnel={data.funnel} />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted">
              Not enough data. Add jobs to see your pipeline funnel.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Row 3: Two charts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityTimeline timelineData={data.timelineData} />
        <OutreachPerformance stats={data.outreachStats} />
      </div>

      {/* Row 4: Two tables side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ResumePerformanceTable resumes={data.resumePerformance} />
        <TopCompaniesTable pipelineBreakdown={data.pipelineBreakdown} />
      </div>

      {/* Row 5: Interview Performance */}
      {data.interviewPerformance.length > 0 ? (
        <InterviewPerformance interviews={data.interviewPerformance} />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted">
              No interview data yet. You'll see interview statistics here once you
              have interviews.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Additional insights */}
      {data.templateEffectiveness.length > 0 && (
        <TemplateEffectivenessTable
          templates={data.templateEffectiveness}
        />
      )}
    </div>
  );
}

// ============================================================================
// Metric Card Component
// ============================================================================

const MetricCard = memo(function MetricCard({
  label,
  value,
  unit,
  trend,
}: {
  label: string;
  value: string | number;
  unit?: string;
  trend?: { direction: "up" | "down"; percentage: number } | null;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted uppercase tracking-wide">
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {unit && <span className="text-sm text-muted">{unit}</span>}
          </div>
          {trend && (
            <div className="flex items-center gap-1 pt-2">
              {trend.direction === "up" ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-danger" />
              )}
              <span
                className={
                  trend.direction === "up"
                    ? "text-xs text-success"
                    : "text-xs text-danger"
                }
              >
                {trend.percentage}% {trend.direction === "up" ? "increase" : "decrease"}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// Pipeline Funnel Component
// ============================================================================

const PipelineFunnel = memo(function PipelineFunnel({ funnel }: { funnel: Record<string, any> }) {
  const stages = [
    { key: "saved", label: "Saved", color: "bg-accent" },
    { key: "networking", label: "Networking", color: "bg-accent" },
    { key: "applied", label: "Applied", color: "bg-violet-600" },
    { key: "interview", label: "Interview", color: "bg-warning" },
    { key: "offer", label: "Offer", color: "bg-success" },
  ];

  const maxCount = Math.max(
    ...stages.map((s) => funnel[s.key]?.count || 0)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {stages.map((stage, index) => {
            const stageData = funnel[stage.key];
            const count = stageData?.count || 0;
            const percentage = stageData?.percentage || 0;
            const conversionRate = stageData?.conversionRate || 0;
            const width = maxCount > 0 ? (count / maxCount) * 100 : 0;

            return (
              <div key={stage.key} className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{stage.label}</span>
                    <Badge variant="default" className="text-xs">
                      {count}
                    </Badge>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 text-xs text-muted">
                    <span>{percentage.toFixed(1)}% of all</span>
                    {index > 0 && (
                      <span className="text-success">
                        {conversionRate.toFixed(1)}% conversion
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
                  <div
                    className={`h-full ${stage.color} transition-all duration-300`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// Activity Timeline Component
// ============================================================================

const ActivityTimeline = memo(function ActivityTimeline({
  timelineData,
}: {
  timelineData: Array<{ week: string; jobsAdded: number; applicationsSubmitted: number }>;
}) {
  const maxValue = Math.max(
    ...timelineData.map((w) => Math.max(w.jobsAdded, w.applicationsSubmitted))
  );

  const recent = timelineData.slice(-8); // Show last 8 weeks

  if (recent.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted">No activity data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Timeline (Last 8 Weeks)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-8 h-48">
            {recent.map((week, index) => {
              const jobsHeight =
                maxValue > 0 ? (week.jobsAdded / maxValue) * 100 : 0;
              const appsHeight =
                maxValue > 0 ? (week.applicationsSubmitted / maxValue) * 100 : 0;

              return (
                <div key={week.week} className="flex-1 flex flex-col items-center justify-end gap-1">
                  <div className="w-full flex gap-1 h-40 items-end">
                    <div
                      className="flex-1 bg-accent/70 rounded-t transition-all duration-300"
                      style={{ height: `${jobsHeight}%` }}
                      title={`Jobs added: ${week.jobsAdded}`}
                    />
                    <div
                      className="flex-1 bg-success/70 rounded-t transition-all duration-300"
                      style={{ height: `${appsHeight}%` }}
                      title={`Applications: ${week.applicationsSubmitted}`}
                    />
                  </div>
                  <span className="text-xs text-muted">
                    {new Date(week.week).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 justify-center pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-accent/70" />
              <span className="text-xs text-muted">Jobs Added</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-success/70" />
              <span className="text-xs text-muted">Applications</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// Outreach Performance Component
// ============================================================================

const OutreachPerformance = memo(function OutreachPerformance({
  stats,
}: {
  stats: {
    totalOutreach: number;
    responded: number;
    responseRate: number;
    averageResponseTime: number;
  };
}) {
  const respondedWidth = stats.totalOutreach > 0
    ? (stats.responded / stats.totalOutreach) * 100
    : 0;
  const nonRespondedWidth = 100 - respondedWidth;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outreach Performance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
            <span className="text-sm font-medium">Response Rate</span>
            <span className="text-2xl font-bold text-success">
              {stats.responseRate.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 w-full bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-success transition-all duration-300"
              style={{ width: `${respondedWidth}%` }}
            />
          </div>
          <p className="text-xs text-muted mt-1">
            {stats.responded} of {stats.totalOutreach} outreach events
          </p>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg bg-success/10 p-4">
            <p className="text-xs text-muted mb-1">Responded</p>
            <p className="text-2xl font-bold text-success">{stats.responded}</p>
          </div>
          <div className="rounded-lg bg-muted/10 p-4">
            <p className="text-xs text-muted mb-1">No Response</p>
            <p className="text-2xl font-bold text-muted">
              {stats.totalOutreach - stats.responded}
            </p>
          </div>
        </div>

        {stats.averageResponseTime > 0 && (
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted">Avg Response Time</p>
            <p className="text-lg font-semibold mt-1">
              {stats.averageResponseTime} days
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// ============================================================================
// Resume Performance Table Component
// ============================================================================

const ResumePerformanceTable = memo(function ResumePerformanceTable({
  resumes,
}: {
  resumes: Array<{
    id: string;
    name: string;
    applicationsCount: number;
    interviewsCount: number;
    interviewRate: number;
  }>;
}) {
  if (resumes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resume Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted">
            No resume data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resume Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-3 font-semibold text-muted">
                  Version
                </th>
                <th className="text-right py-3 px-3 font-semibold text-muted">
                  Apps
                </th>
                <th className="text-right py-3 px-3 font-semibold text-muted">
                  Interviews
                </th>
                <th className="text-right py-3 px-3 font-semibold text-muted">
                  Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {resumes.map((resume, idx) => (
                <tr
                  key={resume.id}
                  className={`border-b border-border ${
                    idx % 2 === 0 ? "bg-surface/30" : ""
                  }`}
                >
                  <td className="py-3 px-3">{resume.name}</td>
                  <td className="text-right py-3 px-3">
                    {resume.applicationsCount}
                  </td>
                  <td className="text-right py-3 px-3">
                    {resume.interviewsCount}
                  </td>
                  <td className="text-right py-3 px-3">
                    <span className="text-success font-semibold">
                      {resume.interviewRate.toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// Top Companies Placeholder Table Component
// ============================================================================

const TopCompaniesTable = memo(function TopCompaniesTable({
  pipelineBreakdown,
}: {
  pipelineBreakdown: Record<string, number>;
}) {
  const total = Object.values(pipelineBreakdown).reduce((a, b) => a + b, 0);

  const breakdown = [
    { label: "Networking", count: pipelineBreakdown.networking, color: "text-accent" },
    { label: "Applied", count: pipelineBreakdown.applied, color: "text-violet-600" },
    { label: "Interviewing", count: pipelineBreakdown.interviewing, color: "text-warning" },
    { label: "Offer", count: pipelineBreakdown.offer, color: "text-success" },
    { label: "Rejected", count: pipelineBreakdown.rejected, color: "text-danger" },
  ].filter((b) => b.count > 0);

  if (breakdown.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted">No job data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {breakdown.map((item) => {
            const percentage = total > 0 ? (item.count / total) * 100 : 0;
            return (
              <div key={item.label}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className={`text-sm font-semibold ${item.color}`}>
                    {item.count}
                  </span>
                </div>
                <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color.replace("text-", "bg-")}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// Interview Performance Component
// ============================================================================

const InterviewPerformance = memo(function InterviewPerformance({
  interviews,
}: {
  interviews: Array<{
    stage: string;
    total: number;
    passed: number;
    passRate: number;
  }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Interview Performance by Stage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {interviews.map((interview) => {
            const passWidth = interview.total > 0
              ? (interview.passed / interview.total) * 100
              : 0;

            return (
              <div key={interview.stage}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {interview.stage.replace("_", " ")}
                    </p>
                    <p className="text-xs text-muted">
                      {interview.passed} of {interview.total} passed
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-success">
                    {interview.passRate.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success transition-all duration-300"
                    style={{ width: `${passWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// Template Effectiveness Table Component
// ============================================================================

const TemplateEffectivenessTable = memo(function TemplateEffectivenessTable({
  templates,
}: {
  templates: Array<{
    id: string;
    name: string;
    category: string;
    usageCount: number;
    responseRate: number;
  }>;
}) {
  const sorted = [...templates].sort((a, b) => b.usageCount - a.usageCount);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Template Effectiveness</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-3 font-semibold text-muted">
                  Template
                </th>
                <th className="text-left py-3 px-3 font-semibold text-muted">
                  Category
                </th>
                <th className="text-right py-3 px-3 font-semibold text-muted">
                  Uses
                </th>
                <th className="text-right py-3 px-3 font-semibold text-muted">
                  Response Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((template, idx) => (
                <tr
                  key={template.id}
                  className={`border-b border-border ${
                    idx % 2 === 0 ? "bg-surface/30" : ""
                  }`}
                >
                  <td className="py-3 px-3 font-medium">{template.name}</td>
                  <td className="py-3 px-3">
                    <Badge variant="info" className="text-xs capitalize">
                      {template.category.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="text-right py-3 px-3">{template.usageCount}</td>
                  <td className="text-right py-3 px-3">
                    <span className="text-success font-semibold">
                      {template.responseRate.toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
});
