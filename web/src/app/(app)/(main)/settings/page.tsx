"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ResumeUpload } from "@/components/ui/resume-upload";

const ARCHETYPE_ICONS: Record<string, string> = {
  "The Connector": "🤝",
  "The Strategist": "🎯",
  "The Natural": "😄",
  "The Professional": "💼",
  "The Storyteller": "📖",
  "The Minimalist": "⚡",
  "The Balanced": "⚖️",
};

function getArchetypeIcon(archetype: string): string {
  return ARCHETYPE_ICONS[archetype] || "✨";
}

interface School {
  name: string;
  linkedin_id: string;
  status: string;
}

interface Template {
  id?: string;
  name: string;
  body: string;
  category: string;
}

interface ResumeVersion {
  id: string;
  name: string;
  isDefault: boolean;
  fileUrl?: string | null;
}

interface ToneProfile {
  archetype: string;
  description: string;
  formality: number;
  warmth: number;
  directness: number;
  energy: number;
  humor: number;
}

interface WritingSample {
  promptId: string;
  response: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { success, error } = useToast();

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Settings state
  const [strategy, setStrategy] = useState("referral_first");
  const [stalledDays, setStalledDays] = useState(5);
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolName, setSchoolName] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [resumeVersions, setResumeVersions] = useState<ResumeVersion[]>([]);
  const [newResume, setNewResume] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [apolloApiKey, setApolloApiKey] = useState("");
  const [showApolloKey, setShowApolloKey] = useState(false);

  // Profile fields
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [newRole, setNewRole] = useState("");
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState("");
  const [remotePreference, setRemotePreference] = useState<string>("");
  const [experienceLevel, setExperienceLevel] = useState<string>("");

  const [loadError, setLoadError] = useState("");

  // Email preferences
  const [emailDigest, setEmailDigest] = useState(true);
  const [emailDigestDay, setEmailDigestDay] = useState(1);

  // Tone profile
  const [toneProfile, setToneProfile] = useState<ToneProfile | null>(null);
  const [writingSamples, setWritingSamples] = useState<WritingSample[]>([]);

  // Danger zone state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Load current settings
  useEffect(() => {
    setLoading(true);
    fetch("/api/settings").then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setStrategy(data.strategyMode || "referral_first");
        setStalledDays(data.stalledDays || 5);
        const config = data.config || {};
        setSchools(config.schools || []);
        setResumeVersions(data.resumeVersions || []);
        setTemplates(data.messageTemplates || []);
        setTargetRoles(data.targetRoles || []);
        setPreferredLocations(data.preferredLocations || []);
        setRemotePreference(data.remotePreference || "");
        setExperienceLevel(data.experienceLevel || "");
        setEmailDigest(data.emailDigest !== false);
        setEmailDigestDay(data.emailDigestDay || 1);
        setToneProfile(data.toneProfile || null);
        setWritingSamples(data.writingSamples || []);
        setApolloApiKey(data.apolloApiKey || "");
      } else {
        setLoadError("Failed to load settings. Please refresh the page.");
      }
      setLoading(false);
    }).catch(() => {
      setLoadError("Could not connect to the server. Please check your connection.");
      setLoading(false);
    });
  }, []);

  async function saveSettings() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyMode: strategy,
          stalledDays,
          schools,
          resumeVersions: resumeVersions.map((r) => r.name),
          templates,
          targetRoles,
          preferredLocations,
          remotePreference: remotePreference || null,
          experienceLevel: experienceLevel || null,
          emailDigest,
          emailDigestDay,
          apolloApiKey: apolloApiKey || null,
        }),
      });

      if (res.ok) {
        // Fetch updated resume versions to get the IDs assigned by database
        const resumesRes = await fetch("/api/resumes");
        if (resumesRes.ok) {
          const updatedResumes = await resumesRes.json();
          setResumeVersions(updatedResumes);
        }
        success("Settings saved successfully");
      } else {
        error("Failed to save settings");
      }
      setSaving(false);
    } catch {
      error("Network error while saving settings");
      setSaving(false);
    }
  }

  function addSchool() {
    if (!schoolName.trim()) return;
    setSchools([...schools, { name: schoolName.trim(), linkedin_id: schoolId.trim(), status: "Alum" }]);
    setSchoolName("");
    setSchoolId("");
  }

  function addResume() {
    if (!newResume.trim()) return;
    setResumeVersions([...resumeVersions, { id: "", name: newResume.trim(), isDefault: false, fileUrl: null }]);
    setNewResume("");
  }

  async function createResumeAndSync(name: string) {
    try {
      // Create resume version in database via settings API
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyMode: strategy,
          stalledDays,
          schools,
          resumeVersions: [...resumeVersions.map((r) => r.name), name],
          templates,
          targetRoles,
          preferredLocations,
          remotePreference: remotePreference || null,
          experienceLevel: experienceLevel || null,
          emailDigest,
          emailDigestDay,
        }),
      });

      if (res.ok) {
        // Fetch updated resume versions from API
        const resData = await fetch("/api/resumes");
        if (resData.ok) {
          const data = await resData.json();
          setResumeVersions(data);
        }
      }
    } catch (err) {
      console.error("Failed to create resume:", err);
    }
  }

  async function deleteResume(id: string) {
    try {
      const res = await fetch(`/api/resumes/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setResumeVersions(resumeVersions.filter((r) => r.id !== id));
        success("Resume version deleted");
      } else {
        error("Failed to delete resume version");
      }
    } catch (err) {
      console.error("Failed to delete resume:", err);
      error("Failed to delete resume version");
    }
  }

  async function handleResumeUploadSuccess(resumeId: string, fileUrl: string) {
    // Update local state
    setResumeVersions(
      resumeVersions.map((r) =>
        r.id === resumeId ? { ...r, fileUrl } : r
      )
    );
    success("Resume uploaded successfully");
  }

  function addRole() {
    const trimmed = newRole.trim();
    if (!trimmed || targetRoles.includes(trimmed)) return;
    setTargetRoles([...targetRoles, trimmed]);
    setNewRole("");
  }

  function removeRole(idx: number) {
    setTargetRoles(targetRoles.filter((_, i) => i !== idx));
  }

  function addLocation() {
    const trimmed = newLocation.trim();
    if (!trimmed || preferredLocations.includes(trimmed)) return;
    setPreferredLocations([...preferredLocations, trimmed]);
    setNewLocation("");
  }

  function removeLocation(idx: number) {
    setPreferredLocations(preferredLocations.filter((_, i) => i !== idx));
  }

  async function handleExportData() {
    try {
      setIsExporting(true);
      const res = await fetch("/api/account/export");

      if (!res.ok) {
        throw new Error("Failed to export data");
      }

      // Get filename from Content-Disposition header
      const contentDisposition = res.headers.get("content-disposition");
      let filename = "knowsomeone-export.json";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+?)"/);
        if (match) filename = match[1];
      }

      // Convert response to blob and trigger download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      success("Data exported successfully!");
    } catch (err) {
      error("Failed to export data. Please try again.");
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmInput !== "DELETE") {
      error("Please type 'DELETE' to confirm");
      return;
    }

    try {
      setIsDeleting(true);
      const res = await fetch("/api/account/delete", {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete account");
      }

      success("Account deleted successfully");
      // Wait a moment for the toast to show, then redirect
      setTimeout(() => {
        signOut({ redirect: false }).then(() => {
          router.push("/");
        });
      }, 500);
    } catch (err) {
      error("Failed to delete account. Please try again.");
      console.error(err);
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Settings</h1>

      {loadError && (
        <div className="rounded-lg bg-danger/10 border border-danger/20 px-4 py-3 text-sm text-danger">
          {loadError}
        </div>
      )}

      {message && (
        <div className="rounded-lg bg-success/10 border border-success/20 px-4 py-3 text-sm text-success">
          {message}
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 pb-4 border-b border-border">
            <div>
              <label className="block text-sm font-medium mb-2">Apollo.io API Key</label>
              <p className="text-xs text-muted mb-3">
                Add your Apollo.io API key to enrich contacts with emails, titles, and LinkedIn URLs.
              </p>
              <div className="flex gap-2 mb-3">
                <Input
                  type={showApolloKey ? "text" : "password"}
                  value={apolloApiKey}
                  onChange={(e) => setApolloApiKey(e.target.value)}
                  placeholder="sk_live_..."
                  className="flex-1"
                />
                <button
                  onClick={() => setShowApolloKey(!showApolloKey)}
                  className="px-3 py-2 rounded-lg border border-border text-muted hover:text-foreground transition-colors text-sm"
                >
                  {showApolloKey ? "Hide" : "Show"}
                </button>
              </div>
              <p className="text-xs text-muted">
                Get your free Apollo.io API key:{" "}
                <a
                  href="https://app.apollo.io/settings/integrations/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  app.apollo.io/settings/integrations/api
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tone Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Communication Style</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {toneProfile ? (
            <div className="space-y-4">
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-3xl">{getArchetypeIcon(toneProfile.archetype)}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{toneProfile.archetype}</h3>
                    <p className="text-sm text-muted mt-1">{toneProfile.description}</p>
                  </div>
                </div>
              </div>
              {writingSamples && writingSamples.length > 0 && (
                <div className="bg-surface border border-border rounded-lg p-3">
                  <p className="text-sm font-medium text-foreground mb-2">
                    {writingSamples.length} writing sample{writingSamples.length !== 1 ? 's' : ''} saved
                  </p>
                  <p className="text-xs text-muted">
                    Your writing samples help ensure AI-drafted messages match your natural voice.
                  </p>
                </div>
              )}
              <p className="text-sm text-muted">
                Your communication style is personalized in all AI-powered message drafting to match your authentic voice.
              </p>
              <Button
                variant="secondary"
                onClick={() => router.push("/quiz")}
                className="w-full"
              >
                Retake Tone Quiz
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Discover your communication style with our Tone Profile Quiz. Your results will personalize your AI-drafted messages to match your authentic voice.
              </p>
              <Button
                onClick={() => router.push("/quiz")}
                className="w-full"
              >
                Take Tone Quiz
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Target Job Titles</label>
            <div className="flex flex-col sm:flex-row gap-2 items-end mb-3">
              <Input
                id="new-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRole())}
                placeholder="e.g. Software Engineer, Product Manager"
              />
              <Button size="sm" onClick={addRole} className="w-full sm:w-auto">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {targetRoles.map((role, i) => (
                <div key={i} className="inline-flex items-center gap-2 rounded-full bg-accent/20 border border-accent/40 px-3 py-1">
                  <span className="text-sm text-foreground">{role}</span>
                  <button
                    onClick={() => removeRole(i)}
                    className="text-muted hover:text-danger text-xs font-medium"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Preferred Locations</label>
            <div className="flex flex-col sm:flex-row gap-2 items-end mb-3">
              <Input
                id="new-location"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLocation())}
                placeholder="e.g. San Francisco, CA; New York, NY"
              />
              <Button size="sm" onClick={addLocation} className="w-full sm:w-auto">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {preferredLocations.map((location, i) => (
                <div key={i} className="inline-flex items-center gap-2 rounded-full bg-accent/20 border border-accent/40 px-3 py-1">
                  <span className="text-sm text-foreground">{location}</span>
                  <button
                    onClick={() => removeLocation(i)}
                    className="text-muted hover:text-danger text-xs font-medium"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Remote Preference</label>
              <select
                value={remotePreference}
                onChange={(e) => setRemotePreference(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground w-full"
              >
                <option value="">No Preference</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Experience Level</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground w-full"
              >
                <option value="">Select Level</option>
                <option value="entry">Entry Level</option>
                <option value="mid">Mid-Level</option>
                <option value="senior">Senior</option>
                <option value="executive">Executive</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Weekly Email Digest</p>
                <p className="text-xs text-muted mt-1">Get a summary of your job search activity each week</p>
              </div>
              <input
                type="checkbox"
                checked={emailDigest}
                onChange={(e) => setEmailDigest(e.target.checked)}
                className="h-5 w-5 rounded border-border text-accent cursor-pointer"
              />
            </div>
            {emailDigest && (
              <div>
                <label className="block text-sm font-medium mb-2">Send digest on</label>
                <select
                  value={emailDigestDay}
                  onChange={(e) => setEmailDigestDay(parseInt(e.target.value))}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
                >
                  <option value={0}>Sunday</option>
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                </select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Strategy */}
      <Card>
        <CardHeader>
          <CardTitle>Strategy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setStrategy("referral_first")}
              className={`text-left rounded-lg border p-3 text-sm transition-colors ${
                strategy === "referral_first" ? "border-accent bg-accent/5" : "border-border"
              }`}
            >
              <p className="font-medium">Referral First</p>
              <p className="text-xs text-muted mt-1">Network before applying</p>
            </button>
            <button
              onClick={() => setStrategy("speed_first")}
              className={`text-left rounded-lg border p-3 text-sm transition-colors ${
                strategy === "speed_first" ? "border-accent bg-accent/5" : "border-border"
              }`}
            >
              <p className="font-medium">Speed First</p>
              <p className="text-xs text-muted mt-1">Apply quickly</p>
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Stalled Threshold (days)</label>
            <select
              value={stalledDays}
              onChange={(e) => setStalledDays(parseInt(e.target.value))}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
            >
              <option value={3}>Quick (3 days)</option>
              <option value={5}>Standard (5 days)</option>
              <option value={7}>Patient (7 days)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Schools */}
      <Card>
        <CardHeader>
          <CardTitle>Schools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted">
            Add your schools to find alumni at companies you target. To get the LinkedIn ID:
            search for your school on LinkedIn, go to its page, and copy the number from the URL
            (e.g. linkedin.com/school/<strong>1234</strong>/).
          </p>
          <div className="flex flex-col sm:flex-row gap-2 items-end">
            <Input id="s-name" label="Name" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="State University" />
            <Input id="s-id" label="LinkedIn ID" value={schoolId} onChange={(e) => setSchoolId(e.target.value)} placeholder="1234" />
            <Button size="sm" onClick={addSchool} className="w-full sm:w-auto">Add</Button>
          </div>
          {schools.map((s, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              <span>{s.name} ({s.linkedin_id || "no ID"})</span>
              <button onClick={() => setSchools(schools.filter((_, j) => j !== i))} className="text-muted hover:text-danger text-xs">Remove</button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Resume Versions */}
      <Card>
        <CardHeader>
          <CardTitle>Resume Versions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 items-end">
            <Input id="r-name" label="Version Name" value={newResume} onChange={(e) => setNewResume(e.target.value)} placeholder="ML Engineer" />
            <Button size="sm" onClick={addResume} className="w-full sm:w-auto">Add</Button>
          </div>
          {resumeVersions.map((r, i) => (
            <div key={r.id || i} className="space-y-3 pb-4 border-b border-border last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{r.name}{r.isDefault ? " (default)" : ""}</p>
                  {r.fileUrl && <p className="text-xs text-success mt-1">PDF uploaded</p>}
                  {!r.fileUrl && <p className="text-xs text-muted mt-1">No file uploaded</p>}
                </div>
                {r.id && (
                  <button
                    onClick={() => deleteResume(r.id)}
                    className="text-muted hover:text-danger text-xs font-medium"
                  >
                    Delete
                  </button>
                )}
              </div>
              {r.id && (
                <ResumeUpload
                  resumeId={r.id}
                  resumeName={r.name}
                  currentFileUrl={r.fileUrl}
                  onUploadSuccess={(fileUrl) => handleResumeUploadSuccess(r.id, fileUrl)}
                />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Message Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Message Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {templates.map((t, i) => (
            <div key={i} className="space-y-2 pb-4 border-b border-border last:border-0">
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <Input
                  id={`t-name-${i}`}
                  value={t.name}
                  onChange={(e) => {
                    const updated = [...templates];
                    updated[i] = { ...updated[i], name: e.target.value };
                    setTemplates(updated);
                  }}
                  placeholder="Template name"
                />
                <button onClick={() => setTemplates(templates.filter((_, j) => j !== i))} className="text-muted hover:text-danger text-xs sm:flex-shrink-0">Remove</button>
              </div>
              <Textarea
                id={`t-body-${i}`}
                value={t.body}
                onChange={(e) => {
                  const updated = [...templates];
                  updated[i] = { ...updated[i], body: e.target.value };
                  setTemplates(updated);
                }}
                rows={4}
              />
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setTemplates([...templates, { name: "", body: "", category: "initial_outreach" }])}
          >
            Add Template
          </Button>
        </CardContent>
      </Card>

      <Button onClick={saveSettings} disabled={saving} className="w-full">
        {saving ? "Saving..." : "Save Settings"}
      </Button>

      {/* Danger Zone */}
      <Card className="border-danger/30 bg-danger/5">
        <CardHeader>
          <CardTitle className="text-danger">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted">Export all your data in JSON format for backup or migration.</p>
            <Button
              variant="secondary"
              onClick={handleExportData}
              disabled={isExporting}
              className="w-full"
            >
              {isExporting ? "Exporting..." : "Export My Data"}
            </Button>
          </div>

          <div className="border-t border-danger/20 pt-4 space-y-2">
            <p className="text-sm text-muted">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <Button
              variant="danger"
              onClick={() => setShowDeleteModal(true)}
              disabled={isDeleting}
              className="w-full"
            >
              Delete My Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-danger">Delete Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-danger/10 border border-danger/20 rounded-lg p-3 text-sm text-foreground">
                <p className="font-medium mb-2">This will permanently delete:</p>
                <ul className="text-xs space-y-1 text-muted">
                  <li>• Your account and profile</li>
                  <li>• All jobs and applications</li>
                  <li>• All contacts and outreach events</li>
                  <li>• All resume versions and message templates</li>
                  <li>• All user settings and preferences</li>
                </ul>
              </div>

              <p className="text-sm text-muted">
                Type <strong>DELETE</strong> to confirm:
              </p>

              <Input
                placeholder="Type DELETE to confirm"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
              />

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmInput("");
                  }}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || deleteConfirmInput !== "DELETE"}
                  className="flex-1"
                >
                  {isDeleting ? "Deleting..." : "Delete Account"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
        </>
      )}
    </div>
  );
}
