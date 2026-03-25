"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, ExternalLink, Users, Plus, Search,
  Check, Trash2, Edit2, Copy, Sparkles,
} from "lucide-react";
import Link from "next/link";
import { substituteTemplateVars, type TemplateContext } from "@/lib/template-substitution";
import { useToast } from "@/components/ui/toast";
import { JobDetailSkeleton } from "@/components/ui/skeleton";

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
  contactId: string;
  status: string;
  statusRank: number;
  messageDraft: string | null;
  messageFinal: string | null;
  platform: string | null;
  lastActionAt: string;
  notes: string | null;
  contact: Contact;
}

interface MessageTemplate {
  id: string;
  name: string;
  body: string;
}

interface UserSettings {
  resumeVersions: Array<{ id: string; name: string; isDefault: boolean }>;
  messageTemplates: MessageTemplate[];
  strategyMode: string;
  stalledDays: number;
  config?: Record<string, unknown>;
}

interface DraftingState {
  eventId: string | null;
  templateId: string | null;
  connectionId: string | null;
  message: string;
  isLoading: boolean;
  copied: boolean;
}

interface ConnectionOption {
  label: string;
  line: string;
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
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [drafting, setDrafting] = useState<DraftingState>({
    eventId: null,
    templateId: null,
    connectionId: null,
    message: "",
    isLoading: false,
    copied: false,
  });

  const toast = useToast();

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

  const fetchSettings = useCallback(async () => {
    const res = await fetch("/api/settings");
    if (res.ok) {
      setSettings(await res.json());
    }
  }, []);

  useEffect(() => {
    fetchJob();
    fetchSettings();
  }, [fetchJob, fetchSettings]);

  async function updateJob(data: Record<string, unknown>, message?: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setJob((prev) => prev ? { ...prev, ...updated } : prev);
        if (message) toast.success(message);
      } else {
        toast.error("Failed to update job");
      }
    } catch {
      toast.error("Network error");
    }
    setSaving(false);
  }

  async function handleApply() {
    await updateJob({ applied: true }, "Marked as applied");
    await fetchJob();
  }

  async function addContact() {
    setError("");
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...contactForm, company: contactForm.company || job?.company }),
      });

      if (!res.ok) {
        setError("Failed to create contact");
        toast.error("Failed to add contact");
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
      toast.success(`Added ${contact.name} as a contact`);
      await fetchJob();
    } catch {
      toast.error("Failed to add contact");
    }
  }

  async function updateOutreachStatus(eventId: string, status: string) {
    try {
      await fetch(`/api/outreach/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      toast.success(`Status updated to ${status.replace(/_/g, " ")}`);
      await fetchJob();
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function deleteOutreach(eventId: string) {
    try {
      await fetch(`/api/outreach/${eventId}`, { method: "DELETE" });
      toast.success("Contact removed from this job");
      await fetchJob();
    } catch {
      toast.error("Failed to remove contact");
    }
  }

  function getConnections(): ConnectionOption[] {
    const config = settings?.config as Record<string, unknown> | undefined;
    return (config?.connections as ConnectionOption[]) || [];
  }

  function getConnectionLine(connectionId: string): string {
    const connections = getConnections();
    const idx = parseInt(connectionId, 10);
    return connections[idx]?.line || "";
  }

  function updateDraftMessage() {
    if (!drafting.templateId || !job || !drafting.eventId) return;

    const template = settings?.messageTemplates.find(
      (t) => t.id === drafting.templateId
    );
    if (!template) return;

    const event = job.outreachEvents.find((e) => e.id === drafting.eventId);
    if (!event) return;

    const firstName = event.contact.name.split(" ")[0];
    const context: TemplateContext = {
      firstName,
      company: job.company,
      role: job.title,
      connection: drafting.connectionId ? getConnectionLine(drafting.connectionId) : "",
    };

    const substituted = substituteTemplateVars(template.body, context);
    setDrafting((prev) => ({ ...prev, message: substituted }));
  }

  async function generateAIDraft(eventId: string) {
    if (!job) return;

    const event = job.outreachEvents.find((e) => e.id === eventId);
    if (!event) return;

    setDrafting((prev) => ({ ...prev, eventId, isLoading: true }));

    try {
      const res = await fetch("/api/ai/draft-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          contactId: event.contactId,
          templateId: drafting.templateId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to generate message");
        return;
      }

      const data = await res.json();
      setDrafting((prev) => ({ ...prev, message: data.message }));
    } catch (err) {
      setError("Failed to generate message");
      console.error(err);
    } finally {
      setDrafting((prev) => ({ ...prev, isLoading: false }));
    }
  }

  async function saveDraft(eventId: string) {
    await fetch(`/api/outreach/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageDraft: drafting.message,
        status: job?.outreachEvents.find((e) => e.id === eventId)?.status === "identified"
          ? "message_drafted"
          : undefined,
      }),
    });
    await fetchJob();
    setDrafting({
      eventId: null,
      templateId: null,
      connectionId: null,
      message: "",
      isLoading: false,
      copied: false,
    });
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(drafting.message);
    setDrafting((prev) => ({ ...prev, copied: true }));
    setTimeout(() => {
      setDrafting((prev) => ({ ...prev, copied: false }));
    }, 2000);
  }

  if (loading) return <JobDetailSkeleton />;
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
                    <div key={event.id} className="rounded-lg border border-border overflow-hidden">
                      <div className="p-4">
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
                          <button
                            onClick={() => {
                              if (drafting.eventId === event.id) {
                                setDrafting({
                                  eventId: null,
                                  templateId: null,
                                  connectionId: null,
                                  message: "",
                                  isLoading: false,
                                  copied: false,
                                });
                              } else {
                                setDrafting({
                                  eventId: event.id,
                                  templateId: settings?.messageTemplates[0]?.id || null,
                                  connectionId: null,
                                  message: event.messageDraft || "",
                                  isLoading: false,
                                  copied: false,
                                });
                              }
                            }}
                            className="text-muted hover:text-accent ml-auto"
                            title="Draft message"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Drafting Panel */}
                      {drafting.eventId === event.id && (
                        <div className="border-t border-border bg-surface/30 p-4 space-y-3 max-h-[500px] overflow-y-auto">
                          <div className="grid grid-cols-2 gap-3">
                            <Select
                              label="Template"
                              value={drafting.templateId || ""}
                              onChange={(e) => {
                                setDrafting((prev) => ({ ...prev, templateId: e.target.value }));
                              }}
                            >
                              <option value="">Select template...</option>
                              {settings?.messageTemplates.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </Select>
                            <Select
                              label="Connection"
                              value={drafting.connectionId || ""}
                              onChange={(e) => {
                                setDrafting((prev) => ({ ...prev, connectionId: e.target.value }));
                              }}
                            >
                              <option value="">Select connection...</option>
                              {getConnections().map((conn, idx) => (
                                <option key={idx} value={idx.toString()}>{conn.label}</option>
                              ))}
                            </Select>
                          </div>

                          {drafting.templateId && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={updateDraftMessage}
                              className="w-full"
                            >
                              Apply Template
                            </Button>
                          )}

                          <Textarea
                            label="Message"
                            value={drafting.message}
                            onChange={(e) =>
                              setDrafting((prev) => ({ ...prev, message: e.target.value }))
                            }
                            placeholder="Your message here..."
                            className="min-h-[120px]"
                          />

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={drafting.copied ? "secondary" : "ghost"}
                              onClick={copyToClipboard}
                              disabled={!drafting.message}
                            >
                              {drafting.copied ? (
                                <>
                                  <Check className="h-4 w-4" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4" />
                                  Copy
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => saveDraft(event.id)}
                              disabled={!drafting.message}
                            >
                              Save Draft
                            </Button>
                            {session?.user?.billingStatus === "pro" ? (
                              <Button
                                size="sm"
                                onClick={() => generateAIDraft(event.id)}
                                disabled={drafting.isLoading}
                              >
                                <Sparkles className="h-4 w-4" />
                                {drafting.isLoading ? "Generating..." : "AI Rewrite"}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled
                                title="Upgrade to Pro for AI-powered drafting"
                              >
                                <Sparkles className="h-4 w-4" />
                                AI Rewrite
                              </Button>
                            )}
                          </div>
                          {session?.user?.billingStatus !== "pro" && (
                            <p className="text-xs text-muted">
                              <Link href="/billing" className="text-accent hover:underline">
                                Upgrade to Pro
                              </Link>
                              {" "}for AI-powered drafting
                            </p>
                          )}
                        </div>
                      )}
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
              {job.nextAction && (
                <div>
                  <p className="text-xs text-muted mb-1">Next Action</p>
                  <p className="text-sm font-medium">{job.nextAction}</p>
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
                      toast.success("Job deleted");
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
