"use client";

import { useState } from "react";
import { Zap, Loader2 } from "lucide-react";
import { Button } from "./button";
import { useToast } from "./toast";

interface EnrichButtonProps {
  contactId: string;
  contactName: string;
  enrichedAt?: Date | null;
  onEnrichSuccess?: (data: {
    email: string | null;
    title: string | null;
    linkedinUrl: string | null;
    headline: string | null;
    photoUrl: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
  }) => void;
}

export function EnrichButton({
  contactId,
  contactName,
  enrichedAt,
  onEnrichSuccess,
}: EnrichButtonProps) {
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  // Check if contact was enriched recently (within 7 days)
  const isRecentlyEnriched = enrichedAt
    ? new Date().getTime() - new Date(enrichedAt).getTime() < 7 * 24 * 60 * 60 * 1000
    : false;

  async function handleEnrich() {
    setLoading(true);

    try {
      const res = await fetch(`/api/contacts/${contactId}/enrich`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        success(
          `Contact enriched! Found email: ${data.email || "not available"}`
        );

        if (onEnrichSuccess) {
          onEnrichSuccess({
            email: data.email,
            title: data.title,
            linkedinUrl: data.linkedinUrl,
            headline: data.headline,
            photoUrl: data.photoUrl,
            city: data.city,
            state: data.state,
            country: data.country,
          });
        }
      } else if (res.status === 404) {
        const errorData = await res.json();
        error(errorData.error || "Contact not found in Apollo database");
      } else if (res.status === 400) {
        const errorData = await res.json();
        error(
          errorData.error ||
            "Please configure Apollo API key in settings first"
        );
      } else if (res.status === 403) {
        const errorData = await res.json();
        error(
          errorData.error || "Pro subscription required for this feature"
        );
      } else if (res.status === 429) {
        const errorData = await res.json();
        error(
          errorData.error || "API rate limit exceeded. Please try again later."
        );
      } else {
        error("Failed to enrich contact");
      }
    } catch (err) {
      console.error("Enrichment error:", err);
      error("Network error while enriching contact");
    } finally {
      setLoading(false);
    }
  }

  if (isRecentlyEnriched && enrichedAt) {
    const daysAgo = Math.floor(
      (new Date().getTime() - new Date(enrichedAt).getTime()) /
        (24 * 60 * 60 * 1000)
    );
    return (
      <div className="inline-flex items-center gap-2 text-xs text-muted">
        <Zap className="h-3 w-3" />
        {daysAgo === 0 ? "Enriched today" : `Enriched ${daysAgo}d ago`}
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={handleEnrich}
      disabled={loading}
      className="gap-2"
      title={`Enrich ${contactName} with Apollo.io`}
    >
      {loading ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Enriching...
        </>
      ) : (
        <>
          <Zap className="h-3 w-3" />
          Enrich
        </>
      )}
    </Button>
  );
}
