import { clsx } from "clsx";
import Link from "next/link";
import { Button } from "./button";
import {
  Briefcase,
  Users,
  MessageSquare,
  Search,
  Target,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Base empty state
// ---------------------------------------------------------------------------

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  steps?: string[];
  actionLabel?: string;
  actionHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  steps,
  actionLabel,
  actionHref,
  secondaryLabel,
  secondaryHref,
  className,
}: EmptyStateProps) {
  return (
    <div className={clsx("text-center py-12 px-6 max-w-md mx-auto", className)}>
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
        <Icon className="h-7 w-7 text-accent" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted mb-6 leading-relaxed">{description}</p>

      {steps && steps.length > 0 && (
        <div className="mb-6 text-left space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-medium text-accent">
                {i + 1}
              </span>
              <p className="text-sm text-muted pt-0.5">{step}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {actionLabel && actionHref && (
          <Link href={actionHref}>
            <Button size="sm">
              {actionLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
        {secondaryLabel && secondaryHref && (
          <Link href={secondaryHref}>
            <Button variant="secondary" size="sm">
              {secondaryLabel}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pre-composed empty states (onboarding-driven)
// ---------------------------------------------------------------------------

export function EmptyJobs() {
  return (
    <EmptyState
      icon={Briefcase}
      title="Your job pipeline starts here"
      description="Add jobs you're interested in, and KnowSomeone will guide you through the referral-first process for each one."
      steps={[
        "Search the job board or add a job manually",
        "Find connections at the company through your networks",
        "Draft a personalized outreach message",
        "Track your referral progress and apply when ready",
      ]}
      actionLabel="Search jobs"
      actionHref="/jobs/search"
      secondaryLabel="Add manually"
      secondaryHref="/jobs/new"
    />
  );
}

export function EmptyContacts() {
  return (
    <EmptyState
      icon={Users}
      title="Your network is your advantage"
      description="Contacts are people you're reaching out to for referrals. They get linked to specific jobs so you always know who's helping where."
      steps={[
        "Start by adding a job to your pipeline",
        "Search for alumni or connections at that company",
        "Add them as a contact and link them to the job",
        "Draft and send your outreach message",
      ]}
      actionLabel="Add your first job"
      actionHref="/jobs/new"
    />
  );
}

export function EmptyDashboard() {
  return (
    <EmptyState
      icon={Target}
      title="Welcome to KnowSomeone"
      description="This is your command center. Once you add jobs and start networking, you'll see your pipeline summary, action items, and progress here."
      steps={[
        "Add a few jobs you're interested in",
        "Find and reach out to connections at each company",
        "Come back here to see what needs your attention",
      ]}
      actionLabel="Get started"
      actionHref="/jobs/search"
      secondaryLabel="Add a job"
      secondaryHref="/jobs/new"
    />
  );
}

export function EmptyOutreach() {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No outreach yet for this job"
      description="Find someone at this company and add them as a contact. KnowSomeone will help you draft a personalized message and track the conversation."
      steps={[
        "Use the LinkedIn search links below to find alumni or connections",
        "Add them as a contact for this job",
        "Draft a message using your templates",
      ]}
      actionLabel="Add a contact"
      actionHref="#add-contact"
    />
  );
}

export function EmptySearchResults() {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description="Try adjusting your search terms or filters. You can also add a job manually if you have a specific listing in mind."
      actionLabel="Add manually"
      actionHref="/jobs/new"
    />
  );
}
