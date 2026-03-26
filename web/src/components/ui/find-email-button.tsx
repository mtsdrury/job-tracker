"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";

interface FindEmailButtonProps {
  contactId: string;
  contactName: string;
  contactEmail: string | null;
  companyDomain?: string;
  onEmailFound?: (email: string) => void;
}

export function FindEmailButton({
  contactId,
  contactName,
  contactEmail,
  companyDomain,
  onEmailFound,
}: FindEmailButtonProps) {
  const [searching, setSearching] = useState(false);
  const toast = useToast();

  // If contact already has an email, don't show the button
  if (contactEmail) return null;

  async function handleFindEmail() {
    setSearching(true);
    try {
      const res = await fetch("/api/contacts/find-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          domain: companyDomain || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Could not find email");
        return;
      }

      const data = await res.json();

      if (data.email) {
        toast.success(
          `Found ${contactName}'s email (${data.confidence}% confidence)`
        );
        onEmailFound?.(data.email);
      } else {
        toast.error(`No email found for ${contactName}`);
      }
    } catch {
      toast.error("Failed to search for email");
    } finally {
      setSearching(false);
    }
  }

  return (
    <button
      onClick={handleFindEmail}
      disabled={searching}
      className="text-accent hover:underline text-xs disabled:opacity-50 whitespace-nowrap"
    >
      {searching ? "Searching..." : "Find Email"}
    </button>
  );
}
