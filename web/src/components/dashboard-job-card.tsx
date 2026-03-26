import { memo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface OutreachEvent {
  id: string;
  contact: { id: string };
}

interface Job {
  id: string;
  title: string;
  company: string;
  applied: boolean;
  nextAction: string | null;
  outreachEvents: OutreachEvent[];
}

export const DashboardJobCard = memo(function DashboardJobCard({ job }: { job: Job }) {
  return (
    <Link href={`/jobs/${job.id}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border px-4 py-3 hover:bg-surface-hover transition-colors gap-2 sm:gap-0">
        <div>
          <p className="text-sm font-medium">{job.company}</p>
          <p className="text-xs text-muted">{job.title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {job.nextAction && (
            <Badge variant={
              job.nextAction.includes("Follow up") ? "warning" :
              job.nextAction.includes("Apply") ? "danger" :
              "info"
            } className="text-xs">{job.nextAction}</Badge>
          )}
          {job.applied ? (
            <Badge variant="success" className="text-xs">Applied</Badge>
          ) : (
            <Badge className="text-xs">Not Applied</Badge>
          )}
          {job.outreachEvents.length > 0 && (
            <Badge variant="info" className="text-xs">
              {job.outreachEvents.length} contact
              {job.outreachEvents.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
});
