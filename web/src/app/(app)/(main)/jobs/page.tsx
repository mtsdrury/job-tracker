"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Briefcase, ExternalLink } from "lucide-react";

interface OutreachEvent {
  id: string;
  status: string;
  contact: { id: string; name: string; company: string | null };
}

interface Job {
  id: string;
  title: string;
  company: string;
  location: string | null;
  url: string | null;
  applied: boolean;
  appliedAt: string | null;
  interviewStage: string | null;
  nextAction: string | null;
  archived: boolean;
  createdAt: string;
  outreachEvents: OutreachEvent[];
  resumeVersion: { id: string; name: string } | null;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [appliedFilter, setAppliedFilter] = useState("all");
  const [referralFilter, setReferralFilter] = useState("all");

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (appliedFilter === "applied") params.set("applied", "true");
    if (appliedFilter === "not_applied") params.set("applied", "false");

    const res = await fetch(`/api/jobs?${params.toString()}`);
    if (res.ok) {
      let data = await res.json();
      // Client-side referral filter
      if (referralFilter === "has_referral") {
        data = data.filter((j: Job) => j.outreachEvents.length > 0);
      } else if (referralFilter === "no_referral") {
        data = data.filter((j: Job) => j.outreachEvents.length === 0);
      }
      setJobs(data);
    }
    setLoading(false);
  }, [search, appliedFilter, referralFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(fetchJobs, 300);
    return () => clearTimeout(timer);
  }, [search, fetchJobs]);

  function getStatusBadge(job: Job) {
    if (job.interviewStage) {
      const variants: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
        interviewing: "info",
        offer: "success",
        accepted: "success",
        rejected: "danger",
        withdrawn: "default",
      };
      return <Badge variant={variants[job.interviewStage] || "default"}>{job.interviewStage}</Badge>;
    }
    if (job.applied) return <Badge variant="success">Applied</Badge>;
    return <Badge>Not Applied</Badge>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Jobs</h1>
        <Link href="/jobs/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Add Job
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search company or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <select
          value={appliedFilter}
          onChange={(e) => setAppliedFilter(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
        >
          <option value="all">All statuses</option>
          <option value="not_applied">Not Applied</option>
          <option value="applied">Applied</option>
        </select>
        <select
          value={referralFilter}
          onChange={(e) => setReferralFilter(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
        >
          <option value="all">All referrals</option>
          <option value="has_referral">Has referral</option>
          <option value="no_referral">No referral</option>
        </select>
      </div>

      {/* Job List */}
      {loading ? (
        <div className="text-center py-12 text-muted">Loading...</div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Briefcase className="h-12 w-12 text-muted mx-auto mb-4" />
            <p className="text-muted">No jobs found.</p>
            <Link href="/jobs/new" className="mt-4 inline-block">
              <Button variant="secondary" size="sm">Add your first job</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`}>
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-5 py-4 hover:bg-surface-hover transition-colors cursor-pointer">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{job.company}</p>
                    {job.url && <ExternalLink className="h-3 w-3 text-muted flex-shrink-0" />}
                  </div>
                  <p className="text-sm text-muted truncate">{job.title}</p>
                  {job.location && <p className="text-xs text-muted">{job.location}</p>}
                </div>
                <div className="flex items-center gap-3 ml-4">
                  {job.nextAction && !job.applied && (
                    <Badge variant="info">{job.nextAction}</Badge>
                  )}
                  {getStatusBadge(job)}
                  {job.outreachEvents.length > 0 && (
                    <span className="text-xs text-muted">{job.outreachEvents.length} contacts</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
