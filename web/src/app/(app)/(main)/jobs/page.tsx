"use client";

import { useState, useEffect, useCallback, memo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ExternalLink, Upload } from "lucide-react";
import { JobsListSkeleton } from "@/components/ui/skeleton";
import { EmptyJobs, EmptySearchResults } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { JobSearch } from "@/components/jobs/job-search";
import { JobImport } from "@/components/jobs/job-import";

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

const TABS = [
  { id: "my-jobs", label: "My Jobs" },
  { id: "search", label: "Search" },
  { id: "import", label: "Import" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const JobCard = memo(function JobCard({ job }: { job: Job }) {
  const getStatusBadge = (job: Job) => {
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
  };

  return (
    <Link href={`/jobs/${job.id}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-surface px-4 sm:px-5 py-3 sm:py-4 hover:bg-surface-hover transition-colors cursor-pointer gap-2 sm:gap-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate text-sm sm:text-base">{job.company}</p>
            {job.url && <ExternalLink className="h-3 w-3 text-muted flex-shrink-0" />}
          </div>
          <p className="text-sm text-muted truncate">{job.title}</p>
          {job.location && <p className="text-xs text-muted">{job.location}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {job.nextAction && (
            <Badge variant={
              job.nextAction.includes("Follow up") ? "warning" :
              job.nextAction.includes("Apply") ? "danger" :
              "info"
            } className="text-xs">{job.nextAction}</Badge>
          )}
          {getStatusBadge(job)}
          {job.outreachEvents.length > 0 && (
            <span className="text-xs text-muted">{job.outreachEvents.length} contact{job.outreachEvents.length !== 1 ? "s" : ""}</span>
          )}
        </div>
      </div>
    </Link>
  );
});

function MyJobsTab() {
  const toast = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [appliedFilter, setAppliedFilter] = useState("all");
  const [referralFilter, setReferralFilter] = useState("all");
  const [error, setError] = useState("");
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const fetchJobs = useCallback(async (searchVal: string, appliedVal: string, referralVal: string) => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (searchVal) params.set("search", searchVal);
    if (appliedVal === "applied") params.set("applied", "true");
    if (appliedVal === "not_applied") params.set("applied", "false");

    try {
      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (res.ok) {
        let data = await res.json();
        if (referralVal === "has_referral") {
          data = data.filter((j: Job) => j.outreachEvents.length > 0);
        } else if (referralVal === "no_referral") {
          data = data.filter((j: Job) => j.outreachEvents.length === 0);
        }
        setJobs(data);
      } else {
        setError("Failed to load jobs");
        toast.error("Failed to load jobs");
      }
    } catch {
      setError("Network error while loading jobs");
      toast.error("Network error while loading jobs");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    const timer = setTimeout(() => {
      fetchJobs(search, appliedFilter, referralFilter);
    }, 300);
    setSearchTimeout(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [search, appliedFilter, referralFilter, fetchJobs]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
        <Link href="/jobs/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Add Job
          </Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-danger/10 border border-danger/20 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 min-w-0 sm:min-w-[200px]">
          <label htmlFor="job-search" className="sr-only">Search company or role</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" aria-hidden="true" />
            <input
              id="job-search"
              type="text"
              placeholder="Search company or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label="Search company or role"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 sm:flex-initial">
            <label htmlFor="status-filter" className="sr-only">Filter by application status</label>
            <select
              id="status-filter"
              value={appliedFilter}
              onChange={(e) => setAppliedFilter(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground w-full"
              aria-label="Filter by application status"
            >
              <option value="all">All statuses</option>
              <option value="not_applied">Not Applied</option>
              <option value="applied">Applied</option>
            </select>
          </div>
          <div className="flex-1 sm:flex-initial">
            <label htmlFor="referral-filter" className="sr-only">Filter by referral status</label>
            <select
              id="referral-filter"
              value={referralFilter}
              onChange={(e) => setReferralFilter(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground w-full"
              aria-label="Filter by referral status"
            >
              <option value="all">All referrals</option>
              <option value="has_referral">Has referral</option>
              <option value="no_referral">No referral</option>
            </select>
          </div>
        </div>
      </div>

      <div role="region" aria-live="polite" aria-label="Jobs list">
        <div className="sr-only" aria-live="assertive">
          {loading && "Loading jobs"}
          {!loading && jobs.length === 0 && "No jobs found"}
          {!loading && jobs.length > 0 && `Showing ${jobs.length} job${jobs.length !== 1 ? "s" : ""}`}
        </div>
        {loading ? (
          <JobsListSkeleton />
        ) : jobs.length === 0 ? (
          search || appliedFilter !== "all" || referralFilter !== "all" ? (
            <EmptySearchResults />
          ) : (
            <EmptyJobs />
          )
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function JobsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<TabId>(
    (tabParam === "search" || tabParam === "import") ? tabParam : "my-jobs"
  );

  function switchTab(tab: TabId) {
    setActiveTab(tab);
    const url = tab === "my-jobs" ? "/jobs" : `/jobs?tab=${tab}`;
    router.replace(url, { scroll: false });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Jobs</h1>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? "text-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "my-jobs" && <MyJobsTab />}
      {activeTab === "search" && <JobSearch />}
      {activeTab === "import" && <JobImport />}
    </div>
  );
}
