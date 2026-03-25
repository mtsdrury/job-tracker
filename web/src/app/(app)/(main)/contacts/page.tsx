"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink } from "lucide-react";
import { ContactsSkeleton } from "@/components/ui/skeleton";
import { EmptyContacts, EmptySearchResults } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";

interface OutreachEvent {
  id: string;
  status: string;
  job: { id: string; title: string; company: string };
}

interface Contact {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  linkedinUrl: string | null;
  email: string | null;
  connectionType: string;
  school: string | null;
  outreachEvents: OutreachEvent[];
}

export default function ContactsPage() {
  const toast = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    try {
      const res = await fetch(`/api/contacts?${params.toString()}`);
      if (res.ok) {
        setContacts(await res.json());
      } else {
        setError("Failed to load contacts");
        toast.error("Failed to load contacts");
      }
    } catch {
      setError("Network error while loading contacts");
      toast.error("Network error while loading contacts");
    }
    setLoading(false);
  }, [search, toast]);

  useEffect(() => {
    const timer = setTimeout(fetchContacts, 300);
    return () => clearTimeout(timer);
  }, [fetchContacts]);

  const connectionBadge = (type: string) => {
    const map: Record<string, "success" | "info" | "warning" | "default"> = {
      alumni: "success",
      linkedin_1st: "info",
      recruiter: "warning",
      cold: "default",
      other: "default",
    };
    return map[type] || "default";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contacts</h1>
      </div>

      {error && (
        <div className="rounded-lg bg-danger/10 border border-danger/20 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          type="text"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {loading ? (
        <ContactsSkeleton />
      ) : contacts.length === 0 ? (
        search ? <EmptySearchResults /> : <EmptyContacts />
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div key={contact.id} className="rounded-xl border border-border bg-surface px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{contact.name}</p>
                    <Badge variant={connectionBadge(contact.connectionType)}>
                      {contact.connectionType.replace(/_/g, " ")}
                    </Badge>
                    {contact.school && (
                      <span className="text-xs text-muted">{contact.school}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted">
                    {contact.title}{contact.company ? ` at ${contact.company}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {contact.linkedinUrl && (
                    <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer"
                      className="text-muted hover:text-accent">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
              {contact.outreachEvents.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {contact.outreachEvents.map((event) => (
                    <a key={event.id} href={`/jobs/${event.job.id}`}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs hover:bg-surface-hover transition-colors">
                      <span className="text-muted">{event.job.company}</span>
                      <Badge variant={event.status === "referral_submitted" ? "success" : "default"}>
                        {event.status.replace(/_/g, " ")}
                      </Badge>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
