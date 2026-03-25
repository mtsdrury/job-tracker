"use client";

import { useToast } from "@/components/ui/toast";
import { useCallback, useState } from "react";

interface MutationOptions {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (data: unknown) => void;
  onError?: (error: string) => void;
}

/**
 * Hook for API mutations with automatic toast feedback.
 *
 * Usage:
 *   const { mutate, loading } = useMutation();
 *   await mutate("/api/jobs/123", { method: "PATCH", body: JSON.stringify(data) }, {
 *     successMessage: "Job updated",
 *   });
 */
export function useMutation() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const mutate = useCallback(
    async (
      url: string,
      init: RequestInit,
      options: MutationOptions = {}
    ): Promise<unknown | null> => {
      setLoading(true);
      try {
        const res = await fetch(url, {
          headers: { "Content-Type": "application/json", ...init.headers },
          ...init,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const msg =
            options.errorMessage ||
            body.error ||
            `Request failed (${res.status})`;
          toast.error(msg);
          options.onError?.(msg);
          return null;
        }

        const data = await res.json().catch(() => ({}));
        if (options.successMessage) {
          toast.success(options.successMessage);
        }
        options.onSuccess?.(data);
        return data;
      } catch {
        const msg = options.errorMessage || "Network error. Please try again.";
        toast.error(msg);
        options.onError?.(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  return { mutate, loading };
}
