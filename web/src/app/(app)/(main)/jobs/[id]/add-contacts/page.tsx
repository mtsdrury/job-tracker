"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Plus, Check, Loader2, Linkedin, X, Users } from "lucide-react";

interface AddedContact {
  id: string;
  name: string;
  title: string;
  linkedinUrl: string;
}

interface JobInfo {
  id: string;
  company: string;
  title: string;
}

export default function AddContactsPopup({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session } = useSession();
  const toast = useToast();
  const urlInputRef = useRef<HTMLInputElement>(null);

  const [jobId, setJobId] = useState<string>("");
  const [job, setJob] = useState<JobInfo | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [addedContacts, setAddedContacts] = useState<AddedContact[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then(({ id }) => {
      setJobId(id);
      // Fetch job info
      fetch(`/api/jobs/${id}`)
        .then((res) => res.json())
        .then((data) => setJob({ id: data.id, company: data.company, title: data.title }))
        .catch(() => setError("Could not load job info"));
    });
  }, [params]);

  function extractNameFromUrl(url: string): string {
    // Try to extract name from LinkedIn URL like linkedin.com/in/john-doe-123abc
    const match = url.match(/linkedin\.com\/in\/([^/?]+)/);
    if (match) {
      const slug = match[1];
      // Remove trailing hash/numbers and convert dashes to spaces
      const cleaned = slug.replace(/-[a-f0-9]{6,}$/, "").replace(/-\d+$/, "");
      return cleaned
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
    return "";
  }

  function handleUrlPaste(value: string) {
    setLinkedinUrl(value);
    setError("");

    // Auto-extract name if field is empty
    if (!contactName && value.includes("linkedin.com")) {
      const extracted = extractNameFromUrl(value);
      if (extracted) {
        setContactName(extracted);
      }
    }
  }

  async function handleAdd() {
    if (!contactName.trim()) {
      setError("Name is required");
      return;
    }

    setAdding(true);
    setError("");

    try {
      // Create contact
      const contactRes = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactName.trim(),
          title: contactTitle.trim() || undefined,
          company: job?.company || "",
          linkedinUrl: linkedinUrl.trim() || undefined,
          connectionType: "alumni",
        }),
      });

      if (!contactRes.ok) {
        const data = await contactRes.json();
        setError(data.error || "Failed to add contact");
        setAdding(false);
        return;
      }

      const contact = await contactRes.json();

      // Link contact to job via outreach event
      await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: jobId,
          contactId: contact.id,
          status: "identified",
        }),
      });

      setAddedContacts((prev) => [
        ...prev,
        {
          id: contact.id,
          name: contact.name,
          title: contactTitle.trim(),
          linkedinUrl: linkedinUrl.trim(),
        },
      ]);

      // Reset form
      setLinkedinUrl("");
      setContactName("");
      setContactTitle("");
      toast.success(`Added ${contact.name}`);

      // Notify parent window to refresh contacts
      if (window.opener) {
        window.opener.postMessage({ type: "contacts-updated", jobId }, "*");
      }

      // Focus back on URL input for quick next entry
      setTimeout(() => urlInputRef.current?.focus(), 100);
    } catch {
      setError("Something went wrong");
    } finally {
      setAdding(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && contactName.trim()) {
      e.preventDefault();
      handleAdd();
    }
  }

  function handleDone() {
    window.close();
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <p className="text-muted">Please sign in to continue.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-lg mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-5 w-5 text-accent" />
            <h1 className="text-lg font-bold">Add Contacts</h1>
          </div>
          {job && (
            <p className="text-sm text-muted">
              for <span className="text-foreground font-medium">{job.company}</span> - {job.title}
            </p>
          )}
        </div>

        {/* Instructions */}
        <div className="rounded-lg bg-accent/5 border border-accent/20 p-3 mb-6">
          <p className="text-xs text-muted">
            Paste LinkedIn profile URLs from your search results. The name will auto-fill from the URL. Hit Enter or click Add to save each contact.
          </p>
        </div>

        {/* Add form */}
        <div className="space-y-3 mb-6">
          <Input
            id="linkedin-url"
            label="LinkedIn Profile URL"
            ref={urlInputRef}
            value={linkedinUrl}
            onChange={(e) => handleUrlPaste(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://linkedin.com/in/jane-doe"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="contact-name"
              label="Name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Jane Doe"
              required
            />
            <Input
              id="contact-title"
              label="Title (optional)"
              value={contactTitle}
              onChange={(e) => setContactTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Software Engineer"
            />
          </div>

          {error && (
            <p className="text-xs text-danger">{error}</p>
          )}

          <Button
            onClick={handleAdd}
            disabled={adding || !contactName.trim()}
            className="w-full"
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Add Contact
              </>
            )}
          </Button>
        </div>

        {/* Added contacts list */}
        {addedContacts.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
              Added ({addedContacts.length})
            </h3>
            <div className="space-y-2">
              {addedContacts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2"
                >
                  <Check className="h-4 w-4 text-success flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    {c.title && <p className="text-xs text-muted truncate">{c.title}</p>}
                  </div>
                  {c.linkedinUrl && (
                    <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="h-3.5 w-3.5 text-muted hover:text-accent" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Done button */}
        <Button variant="secondary" onClick={handleDone} className="w-full">
          Done - Close Window
        </Button>
      </div>
    </div>
  );
}
