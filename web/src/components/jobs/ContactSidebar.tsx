"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Check, Loader2, Linkedin, X, Users } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface AddedContact {
  id: string;
  name: string;
  title: string;
  linkedinUrl: string;
}

interface ContactSidebarProps {
  jobId: string;
  company: string;
  jobTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onContactAdded?: () => void;
}

export function ContactSidebar({
  jobId,
  company,
  jobTitle,
  isOpen,
  onClose,
  onContactAdded,
}: ContactSidebarProps) {
  const toast = useToast();
  const urlInputRef = useRef<HTMLInputElement>(null);

  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [addedContacts, setAddedContacts] = useState<AddedContact[]>([]);
  const [error, setError] = useState("");

  // Focus URL input when sidebar opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => urlInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  function extractNameFromUrl(url: string): string {
    const match = url.match(/linkedin\.com\/in\/([^/?]+)/);
    if (match) {
      const slug = match[1];
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
      const contactRes = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactName.trim(),
          title: contactTitle.trim() || undefined,
          company: company || "",
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

      setLinkedinUrl("");
      setContactName("");
      setContactTitle("");
      toast.success(`Added ${contact.name}`);

      onContactAdded?.();

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

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay for mobile/small screens */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed lg:absolute right-0 top-0 lg:top-0 bottom-0 w-full sm:w-96 z-50 bg-background border-l border-border flex flex-col shadow-lg lg:shadow-none rounded-l-lg lg:rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            <h2 className="font-bold text-base">Add Contacts</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors p-1"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Job info */}
          <div className="mb-4">
            <p className="text-xs text-muted uppercase tracking-wide font-medium mb-1">
              For position
            </p>
            <p className="text-sm font-medium text-foreground">
              {company} -- {jobTitle}
            </p>
          </div>

          {/* Instructions */}
          <div className="rounded-lg bg-accent/5 border border-accent/20 p-3 mb-4">
            <p className="text-xs text-muted">
              Paste LinkedIn profile URLs. Name auto-fills from URL. Press Enter or click Add.
            </p>
          </div>

          {/* Add form */}
          <div className="space-y-3 mb-4">
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

            {error && <p className="text-xs text-danger">{error}</p>}

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
            <div>
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
                      {c.title && (
                        <p className="text-xs text-muted truncate">{c.title}</p>
                      )}
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
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex-shrink-0">
          <Button
            variant="secondary"
            onClick={onClose}
            className="w-full"
          >
            Done
          </Button>
        </div>
      </div>
    </>
  );
}
