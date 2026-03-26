"use client";

import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ApplyChecklist } from "@/components/ui/apply-checklist";
import {
  ArrowLeft, ExternalLink, Users, Plus, Search,
  Check, Trash2, Edit2, Copy, Sparkles, Calendar, ChevronDown, ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { substituteTemplateVars, type TemplateContext } from "@/lib/template-substitution";
import { useToast } from "@/components/ui/toast";
import { useCelebration } from "@/components/celebration-provider";
import { JobDetailSkeleton } from "@/components/ui/skeleton";
import { EnrichButton } from "@/components/ui/enrich-button";
import { FindEmailButton } from "@/components/ui/find-email-button";
import { ContactSidebar } from "@/components/jobs/ContactSidebar";

const InterviewPrep = dynamic(
  () => import("@/components/ui/interview-prep").then(mod => ({ default: mod.InterviewPrep })),
  { ssr: false }
);
const MatchScore = dynamic(
  () => import("@/components/ui/match-score").then(mod => ({ default: mod.MatchScore })),
  { ssr: false }
);

interface Contact {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  linkedinUrl: string | null;
  email: string | null;
  connectionType: string;
  school: string | null;
  enrichedAt?: Date | null;
  headline?: string | null;
  photoUrl?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
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

interface Interview {
  id: string;
  stage: string;
  scheduledAt: string | null;
  completedAt: string | null;
  interviewerName: string | null;
  interviewerTitle: string | null;
  notes: string | null;
  prepNotes: string | null;
  reflection: string | null;
  outcome: string | null;
  createdAt: string;
  updatedAt: string;
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
  isClosed: boolean;
  closedAt: string | null;
  applicationMethod: string | null;
  applicationUrl: string | null;
  companyContactEmail: string | null;
  outreachEvents: OutreachEvent[];
  resumeVersion: { id: string; name: string; keywords?: string[] } | null;
  interviews?: Interview[];
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
  const celebration = useCelebration();

  // Add contact form
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "", title: "", company: "", linkedinUrl: "", email: "",
    connectionType: "cold", school: "", notes: "",
  });

  // Cover letter state
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false);
  const [coverLetterCopied, setCoverLetterCopied] = useState(false);

  // Interviews state
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [showAddInterview, setShowAddInterview] = useState(false);
  const [interviewForm, setInterviewForm] = useState({
    stage: "phone_screen", scheduledAt: "", interviewerName: "",
    interviewerTitle: "", notes: "", prepNotes: "",
  });
  const [expandedInterview, setExpandedInterview] = useState<string | null>(null);
  const [reflectingInterview, setReflectingInterview] = useState<string | null>(null);
  const [reflection, setReflection] = useState("");
  const [outcome, setOutcome] = useState("pending");

  // Apply checklist state
  const [showApplyChecklist, setShowApplyChecklist] = useState(false);

  // Contact sidebar state
  const [showContactSidebar, setShowContactSidebar] = useState(false);

  // Close/Reopen job state
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${params.id}`);
      if (res.ok) {
        setJob(await res.json());
        setError("");
      } else if (res.status === 404) {
        setJob(null);
      } else {
        setError("Failed to load job details");
      }
    } catch {
      setError("Network error loading job");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const fetchInterviews = useCallback(async () => {
    const res = await fetch(`/api/interviews?jobId=${params.id}`);
    if (res.ok) {
      setInterviews(await res.json());
    }
  }, [params.id]);

  const fetchSettings = useCallback(async () => {
    const res = await fetch("/api/settings");
    if (res.ok) {
      setSettings(await res.json());
    }
  }, []);

  useEffect(() => {
    fetchJob();
    fetchInterviews();
    fetchSettings();
  }, [fetchJob, fetchInterviews, fetchSettings]);

  // Listen for popup contact additions via postMessage
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "contacts-updated" && event.data?.jobId === params.id) {
        fetchJob();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [params.id, fetchJob]);

  async function updateJob(data: Record<string, unknown>, message?: string) {
    setSaving(true);
    try {
      const previousInterviewStage = job?.interviewStage;
      const previousApplied = job?.applied;

      const res = await fetch(`/api/jobs/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setJob((prev) => prev ? { ...prev, ...updated } : prev);

        // Trigger celebrations for milestones
        if (data.interviewStage && !previousInterviewStage) {
          celebration.celebrate("interview");
        } else if (data.interviewStage === "offer" && previousInterviewStage !== "offer") {
          celebration.celebrate("offer");
        }
        if (data.applied === true && !previousApplied) {
          celebration.celebrate("applied");
        }

        if (message) toast.success(message);
      } else {
        toast.error("Failed to update job");
      }
    } catch {
      toast.error("Network error");
    }
    setSaving(false);
  }

  function handleApplyClick() {
    // Open the job URL in a new tab if it exists
    const urlToOpen = job?.url || job?.applicationUrl;
    if (urlToOpen) {
      window.open(urlToOpen, "_blank");
    }
    // Show the inline confirmation card
    setShowApplyChecklist(true);
  }

  async function handleApplyConfirm(data: {
    resumeVersionId: string;
    applicationMethod: string;
    applicationUrl: string;
    applicationNotes: string;
  }) {
    const updateData = {
      applied: true,
      appliedAt: new Date().toISOString(),
      resumeVersionId: data.resumeVersionId,
      applicationMethod: data.applicationMethod,
      applicationUrl: data.applicationUrl || undefined,
      applicationNotes: data.applicationNotes || undefined,
    };

    await updateJob(updateData, "Application confirmed");
    setShowApplyChecklist(false);
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

    const firstName = event.contact?.name?.split(" ")[0] || "there";
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

  async function handleCloseJob() {
    try {
      const now = new Date().toISOString();
      await updateJob({ isClosed: true, closedAt: now }, "Job marked as closed");
      setShowCloseConfirm(false);
    } catch {
      toast.error("Failed to close job");
    }
  }

  async function handleReopenJob() {
    try {
      await updateJob({ isClosed: false, closedAt: null }, "Job reopened");
    } catch {
      toast.error("Failed to reopen job");
    }
  }

  async function addInterview() {
    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: params.id,
          ...interviewForm,
        }),
      });

      if (!res.ok) {
        toast.error("Failed to add interview");
        return;
      }

      toast.success("Interview added");
      setInterviewForm({
        stage: "phone_screen", scheduledAt: "", interviewerName: "",
        interviewerTitle: "", notes: "", prepNotes: "",
      });
      setShowAddInterview(false);
      await fetchInterviews();
    } catch {
      toast.error("Failed to add interview");
    }
  }

  async function deleteInterview(interviewId: string) {
    try {
      await fetch(`/api/interviews/${interviewId}`, { method: "DELETE" });
      toast.success("Interview deleted");
      await fetchInterviews();
    } catch {
      toast.error("Failed to delete interview");
    }
  }

  async function saveReflection(interviewId: string) {
    try {
      await fetch(`/api/interviews/${interviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reflection,
          outcome,
          completedAt: new Date().toISOString(),
        }),
      });
      toast.success("Reflection saved");
      setReflectingInterview(null);
      setReflection("");
      setOutcome("pending");
      await fetchInterviews();
    } catch {
      toast.error("Failed to save reflection");
    }
  }

  const stageLabels: Record<string, string> = {
    phone_screen: "Phone Screen",
    technical: "Technical Interview",
    behavioral: "Behavioral Interview",
    onsite: "On-site Interview",
    final: "Final Round",
    other: "Other",
  };

  const stageColors: Record<string, string> = {
    phone_screen: "bg-blue-500",
    technical: "bg-purple-500",
    behavioral: "bg-indigo-500",
    onsite: "bg-orange-500",
    final: "bg-green-500",
    other: "bg-muted",
  };

  const outcomeColors: Record<string, string> = {
    passed: "bg-success/10 text-success border-success/20",
    failed: "bg-danger/10 text-danger border-danger/20",
    pending: "bg-warning/10 text-warning border-warning/20",
    cancelled: "bg-muted/10 text-muted border-muted/20",
  };

  if (loading) return <JobDetailSkeleton />;
  if (!job) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-muted hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
        <div className="text-center py-12">
          <h2 className="text-lg font-semibold mb-2">Job not found</h2>
          <p className="text-muted mb-6">This job may have been deleted or you do not have access to it.</p>
          <Link href="/jobs">
            <Button>Back to Jobs</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Referral gating logic
  const userStrategy = session?.user?.strategyMode || "referral_first";
  const effectiveStrategy = job.strategyOverride || userStrategy;
  const contactedEvents = job.outreachEvents.filter((e) => e.statusRank >= 2);
  const canApply = effectiveStrategy === "speed_first" || contactedEvents.length > 0;

  // Build LinkedIn alumni search URL
  const configSchools = (settings?.config as Record<string, unknown>)?.schools as Array<{ linkedin_id: string }> | undefined;
  const schoolIds = (configSchools || []).map((s) => s.linkedin_id).filter(Boolean);
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
      <div className="flex flex-col sm:flex-row sm:items-start sm:gap-4 gap-3">
        <button onClick={() => router.back()} className="text-muted hover:text-foreground flex-shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold truncate">{job.company}</h1>
          <p className="text-sm sm:text-base text-muted truncate">{job.title}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-shrink-0">
          {job.url && (
            <a href={job.url} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                <ExternalLink className="h-4 w-4" />
                View Posting
              </Button>
            </a>
          )}
          {!job.isClosed && !job.applied && (
            canApply ? (
              <Button onClick={handleApplyClick} disabled={saving} className="w-full sm:w-auto">
                <Check className="h-4 w-4" />
                Apply
              </Button>
            ) : (
              <div className="space-y-2 w-full sm:w-auto">
                <div className="rounded-lg bg-warning/10 border border-warning/20 p-3">
                  <p className="text-xs text-warning font-medium">
                    Referral-first mode: Find a connection first
                  </p>
                </div>
                <Button
                  onClick={handleApplyClick}
                  disabled={saving}
                  variant="ghost"
                  className="w-full sm:w-auto"
                >
                  Override and Apply Anyway
                </Button>
              </div>
            )
          )}
          {!job.isClosed && (
            <Button onClick={() => setShowCloseConfirm(true)} variant="danger" size="sm" disabled={saving} className="w-full sm:w-auto">
              Close Job
            </Button>
          )}
        </div>
      </div>

      {job.isClosed && (
        <div className="rounded-lg bg-danger/10 border border-danger/20 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="danger">Job Closed</Badge>
            <p className="text-sm text-foreground">
              Closed on {job.closedAt ? new Date(job.closedAt).toLocaleDateString() : "unknown date"}
            </p>
          </div>
          <Button onClick={handleReopenJob} variant="ghost" size="sm" disabled={saving}>
            Reopen
          </Button>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-danger/10 border border-danger/20 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Apply Confirmation Card */}
      {showApplyChecklist && job && settings && (
        <ApplyChecklist
          jobId={job.id}
          company={job.company}
          title={job.title}
          resumeVersions={settings.resumeVersions}
          currentResumeVersionId={job.resumeVersionId}
          applicationUrl={job.url || job.applicationUrl}
          onApply={handleApplyConfirm}
          onCancel={() => setShowApplyChecklist(false)}
          isLoading={saving}
        />
      )}

      {/* Close Job Confirmation Dialog */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-sm mx-4">
            <CardHeader>
              <CardTitle>Mark Job as Closed?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted">
                This will prevent you from applying to this job and will mark it as closed. You can reopen it later if needed.
              </p>
              <div className="flex gap-3 justify-end">
                <Button onClick={() => setShowCloseConfirm(false)} variant="secondary" disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleCloseJob} variant="danger" disabled={saving}>
                  Close Job
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-4 sm:space-y-6">
          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div>
                <p className="text-xs text-muted mb-1">Company Contact Email</p>
                <div className="flex gap-2">
                  <Input
                    id="company-contact-email"
                    type="email"
                    value={job.companyContactEmail || ""}
                    onChange={(e) => setJob({ ...job, companyContactEmail: e.target.value })}
                    onBlur={() => updateJob({ companyContactEmail: job.companyContactEmail })}
                    placeholder="recruiter@company.com"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted mt-1">
                  Add a recruiter or HR contact email to track communications
                </p>
              </div>
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
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      window.open(linkedinSearchUrl, "_blank");
                      setShowContactSidebar(true);
                    }}
                  >
                    <Search className="h-4 w-4" />
                    Find Connections
                  </Button>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{event.contact.name}</p>
                            <p className="text-xs text-muted truncate">
                              {event.contact.title}{event.contact.company ? ` at ${event.contact.company}` : ""}
                            </p>
                            {event.contact.email && (
                              <p className="text-xs text-muted mt-1">{event.contact.email}</p>
                            )}
                            {event.contact.headline && (
                              <p className="text-xs text-muted mt-1">{event.contact.headline}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                            <Badge variant={statusBadgeVariant(event.status)} className="text-xs">
                              {event.status.replace(/_/g, " ")}
                            </Badge>
                            <button onClick={() => deleteOutreach(event.id)} className="text-muted hover:text-danger">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 mt-2 text-xs">
                          <select
                            value={event.status}
                            onChange={(e) => updateOutreachStatus(event.id, e.target.value)}
                            className="rounded border border-border bg-surface px-2 py-1 text-xs text-foreground w-full sm:w-auto"
                          >
                            {OUTREACH_STATUSES.map((s) => (
                              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                            ))}
                          </select>
                          <div className="flex items-center gap-2 flex-wrap">
                            <EnrichButton
                              contactId={event.contact.id}
                              contactName={event.contact.name}
                              enrichedAt={event.contact.enrichedAt ? new Date(event.contact.enrichedAt) : null}
                              onEnrichSuccess={() => {
                                fetchJob();
                              }}
                            />
                            <FindEmailButton
                              contactId={event.contact.id}
                              contactName={event.contact.name}
                              contactEmail={event.contact.email}
                              companyDomain={event.contact.company || job.company || undefined}
                              onEmailFound={() => {
                                fetchJob();
                              }}
                            />
                            {event.contact.linkedinUrl && (
                              <a href={event.contact.linkedinUrl} target="_blank" rel="noopener noreferrer"
                                className="text-accent hover:underline">LinkedIn</a>
                            )}
                            <span className="text-muted whitespace-nowrap">
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
                              className="text-muted hover:text-accent ml-auto sm:ml-0 flex-shrink-0"
                              title="Draft message"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Drafting Panel */}
                      {drafting.eventId === event.id && (
                        <div className="border-t border-border bg-surface/30 p-3 sm:p-4 space-y-3 max-h-[500px] overflow-y-auto">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          {/* Interviews - Only show if job is applied or later */}
          {job.applied && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Interview Pipeline
                  </CardTitle>
                  <Button size="sm" onClick={() => setShowAddInterview(!showAddInterview)}>
                    <Plus className="h-4 w-4" />
                    Add Interview
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Interview Form */}
                {showAddInterview && (
                  <div className="rounded-lg border border-border p-4 space-y-3 mb-6 bg-surface/30">
                    <h4 className="font-medium text-sm">New Interview</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Select
                        id="stage" label="Stage" value={interviewForm.stage}
                        onChange={(e) => setInterviewForm({ ...interviewForm, stage: e.target.value })}
                      >
                        <option value="phone_screen">Phone Screen</option>
                        <option value="technical">Technical</option>
                        <option value="behavioral">Behavioral</option>
                        <option value="onsite">On-site</option>
                        <option value="final">Final Round</option>
                        <option value="other">Other</option>
                      </Select>
                      <Input
                        id="scheduled-at" label="Scheduled Date/Time" type="datetime-local"
                        value={interviewForm.scheduledAt}
                        onChange={(e) => setInterviewForm({ ...interviewForm, scheduledAt: e.target.value })}
                      />
                      <Input
                        id="interviewer-name" label="Interviewer Name"
                        value={interviewForm.interviewerName}
                        onChange={(e) => setInterviewForm({ ...interviewForm, interviewerName: e.target.value })}
                      />
                      <Input
                        id="interviewer-title" label="Interviewer Title"
                        value={interviewForm.interviewerTitle}
                        onChange={(e) => setInterviewForm({ ...interviewForm, interviewerTitle: e.target.value })}
                      />
                    </div>
                    <Textarea
                      id="prep-notes" label="Prep Notes"
                      value={interviewForm.prepNotes}
                      onChange={(e) => setInterviewForm({ ...interviewForm, prepNotes: e.target.value })}
                      placeholder="What do you want to prepare for this interview?"
                      className="min-h-[80px]"
                    />
                    <Textarea
                      id="notes" label="Notes"
                      value={interviewForm.notes}
                      onChange={(e) => setInterviewForm({ ...interviewForm, notes: e.target.value })}
                      placeholder="Add any other notes..."
                      className="min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={addInterview}>Save Interview</Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowAddInterview(false)}>Cancel</Button>
                    </div>
                  </div>
                )}

                {/* Timeline View */}
                {interviews.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-8 w-8 text-muted mx-auto mb-2" />
                    <p className="text-sm text-muted">No interviews scheduled yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Progress Indicator */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {interviews.map((interview) => (
                        <div
                          key={interview.id}
                          className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium text-white ${stageColors[interview.stage as keyof typeof stageColors] || 'bg-muted'}`}
                          title={stageLabels[interview.stage as keyof typeof stageLabels] || interview.stage}
                        >
                          {interviews.indexOf(interview) + 1}
                        </div>
                      ))}
                    </div>

                    {/* Timeline Cards */}
                    <div className="relative space-y-3">
                      {interviews.map((interview, idx) => (
                        <div
                          key={interview.id}
                          className="rounded-lg border border-border p-4 hover:bg-surface/50 transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div
                                  className={`w-3 h-3 rounded-full flex-shrink-0 ${stageColors[interview.stage as keyof typeof stageColors] || 'bg-muted'}`}
                                />
                                <p className="font-medium text-sm">
                                  {stageLabels[interview.stage as keyof typeof stageLabels] || interview.stage}
                                </p>
                                {interview.outcome && (
                                  <Badge
                                    variant={
                                      interview.outcome === 'passed'
                                        ? 'success'
                                        : interview.outcome === 'failed'
                                        ? 'danger'
                                        : interview.outcome === 'cancelled'
                                        ? 'info'
                                        : 'warning'
                                    }
                                    className="text-xs"
                                  >
                                    {interview.outcome}
                                  </Badge>
                                )}
                              </div>
                              {interview.scheduledAt && (
                                <p className="text-xs text-muted mt-1">
                                  {new Date(interview.scheduledAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() =>
                                  setExpandedInterview(
                                    expandedInterview === interview.id ? null : interview.id
                                  )
                                }
                                className="text-muted hover:text-foreground"
                              >
                                {expandedInterview === interview.id ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => deleteInterview(interview.id)}
                                className="text-muted hover:text-danger"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Interviewer Info */}
                          {(interview.interviewerName || interview.interviewerTitle) && (
                            <div className="text-xs text-muted mb-3 ml-5">
                              {interview.interviewerName}
                              {interview.interviewerTitle && ` • ${interview.interviewerTitle}`}
                            </div>
                          )}

                          {/* Expanded Section */}
                          {expandedInterview === interview.id && (
                            <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                              {interview.prepNotes && (
                                <div>
                                  <p className="text-xs font-medium text-muted mb-1">Prep Notes</p>
                                  <p className="text-xs whitespace-pre-wrap">{interview.prepNotes}</p>
                                </div>
                              )}

                              {interview.notes && (
                                <div>
                                  <p className="text-xs font-medium text-muted mb-1">Notes</p>
                                  <p className="text-xs whitespace-pre-wrap">{interview.notes}</p>
                                </div>
                              )}

                              {interview.reflection && (
                                <div>
                                  <p className="text-xs font-medium text-muted mb-1">Reflection</p>
                                  <p className="text-xs whitespace-pre-wrap">{interview.reflection}</p>
                                </div>
                              )}

                              {/* Reflect Button - show if interview is scheduled and time has passed */}
                              {interview.scheduledAt &&
                                !interview.reflection &&
                                new Date(interview.scheduledAt) <= new Date() && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setReflectingInterview(interview.id)}
                                    className="w-full"
                                  >
                                    Add Reflection
                                  </Button>
                                )}

                              {/* Reflection Form */}
                              {reflectingInterview === interview.id && (
                                <div className="space-y-3 bg-surface/30 -mx-4 -mb-4 p-4 rounded-b-lg">
                                  <Select
                                    id="outcome" label="Outcome"
                                    value={outcome}
                                    onChange={(e) => setOutcome(e.target.value)}
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="passed">Passed</option>
                                    <option value="failed">Failed</option>
                                    <option value="cancelled">Cancelled</option>
                                  </Select>
                                  <Textarea
                                    id="reflection-notes" label="How did it go?"
                                    value={reflection}
                                    onChange={(e) => setReflection(e.target.value)}
                                    placeholder="Your thoughts on the interview..."
                                    className="min-h-[100px]"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => saveReflection(interview.id)}
                                    >
                                      Save Reflection
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setReflectingInterview(null);
                                        setReflection("");
                                        setOutcome("pending");
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interview Prep Section */}
                <div className="mt-6 pt-6 border-t border-border">
                  <InterviewPrep
                    jobId={job.id}
                    jobTitle={job.title}
                    jobCompany={job.company}
                    billingStatus={session?.user?.billingStatus || "free"}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-6">
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

          {/* AI-Powered Match Score */}
          {job && (
            <MatchScore
              jobId={job.id}
              jobDescription={job.description}
              resumeVersionId={job.resumeVersionId || undefined}
              resumeVersionName={job.resumeVersion?.name}
              userBillingStatus={session?.user?.billingStatus as "free" | "pro"}
            />
          )}

          {/* Cover Letter */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Cover Letter
                </CardTitle>
                <div className="flex gap-2">
                  {job.coverLetter && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(job.coverLetter || "");
                          setCoverLetterCopied(true);
                          toast.success("Copied to clipboard");
                          setTimeout(() => setCoverLetterCopied(false), 2000);
                        }}
                      >
                        {coverLetterCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {coverLetterCopied ? "Copied" : "Copy"}
                      </Button>
                    </>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={generatingCoverLetter || session?.user?.billingStatus !== "pro"}
                    onClick={async () => {
                      setGeneratingCoverLetter(true);
                      try {
                        const res = await fetch("/api/ai/cover-letter", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ jobId: job.id }),
                        });
                        if (!res.ok) {
                          const err = await res.json();
                          toast.error(err.error || "Failed to generate");
                          return;
                        }
                        const data = await res.json();
                        setJob({ ...job, coverLetter: data.coverLetter });
                        await updateJob({ coverLetter: data.coverLetter });
                        toast.success("Cover letter generated");
                      } catch {
                        toast.error("Failed to generate cover letter");
                      } finally {
                        setGeneratingCoverLetter(false);
                      }
                    }}
                  >
                    <Sparkles className="h-4 w-4" />
                    {generatingCoverLetter ? "Generating..." : job.coverLetter ? "Regenerate" : "Generate"}
                  </Button>
                </div>
              </div>
              {session?.user?.billingStatus !== "pro" && (
                <p className="text-xs text-muted mt-1">Upgrade to Pro to generate AI cover letters</p>
              )}
            </CardHeader>
            <CardContent>
              {job.coverLetter ? (
                <textarea
                  value={job.coverLetter}
                  onChange={(e) => setJob({ ...job, coverLetter: e.target.value })}
                  onBlur={() => updateJob({ coverLetter: job.coverLetter })}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted min-h-[250px] resize-y focus:outline-none focus:ring-2 focus:ring-accent"
                />
              ) : (
                <p className="text-sm text-muted">
                  No cover letter yet. Click Generate to create one based on your resume, tone profile, and the job description.
                </p>
              )}
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

      {/* Contact Sidebar */}
      {job && (
        <ContactSidebar
          jobId={job.id}
          company={job.company}
          jobTitle={job.title}
          isOpen={showContactSidebar}
          onClose={() => setShowContactSidebar(false)}
          onContactAdded={() => fetchJob()}
        />
      )}
    </div>
  );
}
