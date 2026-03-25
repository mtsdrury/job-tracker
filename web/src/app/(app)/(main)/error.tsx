"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MainError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px] px-6">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10">
          <AlertCircle className="h-6 w-6 text-danger" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-muted mb-6">
          An unexpected error occurred. Try again or go back to the dashboard.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" size="sm" onClick={reset}>
            Try again
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (window.location.href = "/dashboard")}
          >
            Go to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
