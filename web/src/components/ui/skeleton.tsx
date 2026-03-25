import { clsx } from "clsx";

interface SkeletonProps {
  className?: string;
}

/** Base skeleton element with shimmer animation */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx("animate-shimmer rounded-lg", className)}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// Pre-composed skeleton layouts
// ---------------------------------------------------------------------------

/** Dashboard page skeleton */
export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Nudges card */}
      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-4 w-4" />
          </div>
        ))}
      </div>

      {/* Recent jobs */}
      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-16" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
          >
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Jobs list page skeleton */
export function JobsListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 flex-1 min-w-[200px] rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      {/* Job rows */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl border border-border bg-surface px-5 py-4"
          >
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-3" />
              </div>
              <Skeleton className="h-3 w-44" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Job detail page skeleton */
export function JobDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Back button */}
      <Skeleton className="h-9 w-28 rounded-lg" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title card */}
          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-9 w-28 rounded-lg" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </div>

          {/* Outreach section */}
          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-8 w-28 rounded-lg" />
            </div>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="rounded-xl border border-border bg-surface p-6 space-y-3">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <Skeleton className="h-5 w-20" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Contacts page skeleton */
export function ContactsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
