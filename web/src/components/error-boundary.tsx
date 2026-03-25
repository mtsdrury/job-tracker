"use client";

import { Component, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

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
              An unexpected error occurred. Try refreshing the page.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Refresh page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
