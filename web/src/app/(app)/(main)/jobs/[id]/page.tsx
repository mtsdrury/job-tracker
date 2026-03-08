"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ArrowLeft, ExternalLink, Users, Plus, Search,
  Check, Trash2,
} from "lucide-react";
import Link from "next/link";

interface Contact {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  linkedinUrl: string | null;
  email: string | null;
  connectionType: string;
  school: string | null;
}

interface OutreachEvent {
  id: string;
  status: string;
  statusRank: number;
  messageDraft: string | null;
  messageFinal: string | null;
  platform: string | null;
  lastActionAt: string;
  notes: string | null;
  contact: Contact;
}

interface Job {
  id: string;
  title: string;
  company: string;
  location: string | null;
  remoteType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  description: string | null;
  url: string | null;
  source: string;
  datePosted: string | null;
  applied: boolean;
  appliedAt: string | null;
  resumeVersionId: string | null;
  coverLetter: string | null;
  interviewStage: string | null;
  nextAction: string | null;
  nextActionOverride: boolean;
  strategyOverride: string | null;
  notes: string | null;
  archived: boolean;
  outreachEvents: OutreachEvent[];
  resumeVersion: { id: string; name: string } | null;
}

const OUTREACH_STATUSES = [
  "identified", "message_drafted", "message_sent", "responded",
  "sharing_internally", "referral_requested", "referral_secured",
  "referral_submitted", "no_response", "declined",
];

const INTERVIEW_STAGES = [
  { value: "", label: "None" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offer", label: "Offer" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Add contact form
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "", title: "", company: "", linkedinUrl: "", email: "",
    connectionType: "cold", school: "", notes: "",
  });

  const fetchJob = useCallback(async () => {
    const res = await fetch(`/api/jobs/${params.id}`);
    if (res.ok) {
      setJob(await res.json());
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  async function updateJob(data: Record<string, unknown>) {
    setSaving(true);
    const res = await fetch(`/api/jobs/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      setJob((prev) => prev ? { ...prev, ...updated } : prev);
    }
    setSaving(false);
  }

  async function handleApply() {
    await updateJob({ applied: true });
    await fetchJob();
  }

  async function addContact() {
    setError("");
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...contactForm, company: contactForm.company || job?.company }),
    });

    if (!res.ok) {
      setError("Failed to create contact");
      return;
    }

    const contact = await res.json();

    // Create outreach event linking contact to this job
    await fetch("/api/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: job?.id,
        contactId: contact.id,
        status: "identified",
      }),
    });

    setShowAddContact(false);
    setContactForm({ name: "", title: "", company: "", linkedinUrl: "", email: "", connectionType: "cold", school: "", notes: "" });
    await fetchJob();
  }

  async function updateOutreachStatus(eventId: string, status: string) {
    await fetch(`/api/outreach/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchJob();
  }

  async function deleteOutreach(eventId: string) {
    await fetch(`/api/outreach/${eventId}`, { method: "DELETE" });
    await fetchJob();
  }

  if (loading) return <div className="text-center py-12 text-muted">Loading...</div>;
  if (!job) return <div className="text-center py-12 text-muted">Job not found.</div>;

  // Referral gating logic
  const userStrategy = session?.user?.strategyMode || "referral_first";
  const effectiveStrategy = job.strategyOverride || userStrategy;
  const contactedEvents = job.outreachEvents.filter((e) => e.statusRank >= 2);
  const canApply = effectiveStrategy === "speed_first" || contactedEvents.length > 0;

  // Build LinkedIn alumni search URL
  const userConfig = (session as unknown as { user: { config?: { schools?: Array<{ linkedin_id: string }> } } })?.user?.config;
  const schools = (userConfig?.schools || []) as Array<{ linkedin_id: string }>;
  const schoolIds = schools.map((s) => s.linkedin_id).filter(Boolean);
  const linkedinSearchUrl = schoolIds.length > 0
    ? `https://www.linkedin.com/search/results/people/?company=${encodeURIComponent(job.company)}&schoolFilter=${encodeURIComponent(JSON.stringify(schoolIds))}`
    : `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(job.company)}`;

  const statusBadgeVariant = (status: string): "default" | "success" | "warning" | "danger" | "info" => {
    if (["referral_secured", "referral_submitted"].includes(status)) return "success";
    if (["message_sent", "responded", "sharing_internally"].includes(status)) return "info";
    if (["no_response"].includes(status)) return "warning";
    if (["declined"].includes(status)) return "danger";
    return "default";
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-muted hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{job.company}</h1>
          <p className="text-muted">{job.title}</p>
        </div>
        <div className="flex items-center gap-2">
          {job.url && (
            <a href={job.url} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-4 w-4" />
                View Posting
              </Button>
            </a>
          )}
          {!job.applied && (
            canApply ? (
              <Button onClick={handleApply} disabled={saving}>
                <Check className="h-4 w-4" />
                Mark as Applied
              </Button>
            ) : (
              <div className="text-right">
                <Button disabled className="opacity-50">
                  <Check className="h-4 w-4" />
                  Mark as Applied
                </Button>
                <p className="text-xs text-muted mt-1">Find a connection first</p>
                <button
                  onClick={handleApply}
                  className="text-xs text-muted hover:text-foreground underline mt-1"
                >
                  Override and apply anyway
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-danger/10 border border-danger/20 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted">Location</p>
                  <p className="text-sm">{job.location || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Salary</p>
                  <p className="text-sm">
                    {job.salaryMin || job.salaryMax
                      ? `$${(job.salaryMin || 0).toLocaleString()} - $${(job.salaryMax || 0).toLocaleString()}`
                      : "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Source</p>
                  <p className="text-sm">{job.source}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Date Posted</p>
                  <p className="text-sm">
                    {job.datePosted ? new Date(job.datePosted).toLocaleDateString() : "Unknown"}
                  </p>
                </div>
              </div>
              {job.description && (
                <div>
                  <p className="text-xs text-muted mb-1">Description</p>
                  <div className="text-sm whitespace-pre-wrap max-h-60 overflow-y-auto rounded-lg border border-border bg-background p-3">
                    {job.description}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Outreach / Referrals */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Referrals & Outreach
                </CardTitle>
                <div className="flex gap-2">
                  <a href={linkedinSearchUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary" size="sm">
                      <Search className="h-4 w-4" />
                      Find Alumni
                    </Button>
                  </a>
                  <Button size="sm" onClick={() => setShowAddContact(true)}>
                    <Plus className="h-4 w-4" />
                    Add Contact
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {showAddContact && (
                <div className="mb-6 rounded-lg border border-border p-4 space-y-3">
                  <h4 className="font-medium text-sm">New Contact</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      id="contact-name" label="Name" value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      required
                    />
                    <Input
                      id="contact-title" label="Title" value={contactForm.title}
                      onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })}
                    />
                    <Input
                      id="contact-linkedin" label="LinkedIn URL" value={contactForm.linkedinUrl}
                      onChange={(e) => setContactForm({ ...contactForm, linkedinUrl: e.target.value })}
                    />
                    <Input
                      id="contact-email" label="Email" value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    />
                    <Select
                      id="contact-type" label="Connection Type" value={contactForm.connectionType}
                      onChange={(e) => setContactForm({ ...contactForm, connectionType: e.target.value })}
                    >
                      <option value="alumni">Alumni</option>
                      <option value="linkedin_1st">LinkedIn 1st</option>
                      <option value="cold">Cold</option>
                      <option value="recruiter">Recruiter</option>
                      <option value="other">Other</option>
                    </Select>
                    <Input
                      id="contact-school" label="School" value={contactForm.school}
                      onChange={(e) => setContactForm({ ...contactForm, school: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addContact}>Save Contact</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAddContact(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {job.outreachEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-muted mx-auto mb-2" />
                  <p className="text-sm text-muted">No contacts yet. Find alumni or add a contact.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {job.outreachEvents.map((event) => (
                    <div key={event.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{event.contact.name}</p>
                          <p className="text-xs text-muted">
                            {event.contact.title}{event.contact.company ? ` at ${event.contact.company}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={statusBadgeVariant(event.status)}>
                            {event.status.replace(/_/g, " ")}
                          </Badge>
                          <button onClick={() => deleteOutreach(event.id)} className="text-muted hover:text-danger">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <select
                          value={event.status}
                          onChange={(e) => updateOutreachStatus(event.id, e.target.value)}
                          className="rounded border border-border bg-surface px-2 py-1 text-xs text-foreground"
                        >
                          {OUTREACH_STATUSES.map((s) => (
                            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                          ))}
                        </select>
                        {event.contact.linkedinUrl && (
                          <a href={event.contact.linkedinUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-accent hover:underline">LinkedIn</a>
                        )}
                        <span className="text-xs text-muted">
                          Last: {new Date(event.lastActionAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted mb-1">Application</p>
                {job.applied ? (
                  <Badge variant="success">
                    Applied {job.appliedAt ? new Date(job.appliedAt).toLocaleDateString() : ""}
                  </Badge>
                ) : (
                  <Badge>Not Applied</Badge>
                )}
              </div>
              {job.applied && (
                <div>
                  <p className="text-xs text-muted mb-1">Interview Stage</p>
                  <select
                    value={job.interviewStage || ""}
                    onChange={(e) => updateJob({ interviewStage: e.target.value || null })}
                    className="w-full rounded border border-border bg-surface px-2 py-1 text-sm text-foreground"
                  >
                    {INTERVIEW_STAGES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {!job.applied && (
                <div>
                  <p className="text-xs text-muted mb-1">Next Action</p>
                  <p className="text-sm">{job.nextAction || "Find referral"}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted mb-1">Resume</p>
                <p className="text-sm">{job.resumeVersion?.name || "Not selected"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={job.notes || ""}
                onChange={(e) => setJob({ ...job, notes: e.target.value })}
                onBlur={() => updateJob({ notes: job.notes })}
                placeholder="Add notes..."
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => updateJob({ archived: !job.archived })}
                >
                  {job.archived ? "Unarchive" : "Archive"}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    if (confirm("Delete this job? This cannot be undone.")) {
                      await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
                      router.push("/jobs");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
