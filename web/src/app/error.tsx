"use client";

import { AlertCircle } from "lucide-react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen px-6 bg-background text-foreground">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10">
          <AlertCircle className="h-6 w-6 text-danger" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
        <p className="text-sm text-muted mb-6">
          An unexpected error occurred. Please try refreshing the page.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center rounded-lg bg-surface border border-border px-4 py-2 text-sm font-medium hover:bg-surface-hover transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
