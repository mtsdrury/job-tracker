"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

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
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);
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

  const [loadError, setLoadError] = useState("");

  // Load current settings
  useEffect(() => {
    fetch("/api/settings").then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setStrategy(data.strategyMode || "referral_first");
        setStalledDays(data.stalledDays || 5);
        const config = data.config || {};
        setSchools(config.schools || []);
        setResumeVersions(data.resumeVersions || []);
        setTemplates(data.messageTemplates || []);
      } else {
        setLoadError("Failed to load settings. Please refresh the page.");
      }
    }).catch(() => {
      setLoadError("Could not connect to the server. Please check your connection.");
    });
  }, []);

  async function saveSettings() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        strategyMode: strategy,
        stalledDays,
        schools,
        resumeVersions: resumeVersions.map((r) => r.name),
        templates,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("Settings saved!");
      setTimeout(() => setMessage(""), 3000);
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
    setResumeVersions([...resumeVersions, { id: "", name: newResume.trim(), isDefault: false }]);
    setNewResume("");
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

      {/* Strategy */}
      <Card>
        <CardHeader>
          <CardTitle>Strategy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
          <div className="flex gap-2 items-end">
            <Input id="s-name" label="Name" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="State University" />
            <Input id="s-id" label="LinkedIn ID" value={schoolId} onChange={(e) => setSchoolId(e.target.value)} placeholder="1234" />
            <Button size="sm" onClick={addSchool}>Add</Button>
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
        <CardContent className="space-y-3">
          <div className="flex gap-2 items-end">
            <Input id="r-name" label="Version Name" value={newResume} onChange={(e) => setNewResume(e.target.value)} placeholder="ML Engineer" />
            <Button size="sm" onClick={addResume}>Add</Button>
          </div>
          {resumeVersions.map((r, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              <span>{r.name}{r.isDefault ? " (default)" : ""}</span>
              <button onClick={() => setResumeVersions(resumeVersions.filter((_, j) => j !== i))} className="text-muted hover:text-danger text-xs">Remove</button>
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
              <div className="flex items-center justify-between">
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
                <button onClick={() => setTemplates(templates.filter((_, j) => j !== i))} className="text-muted hover:text-danger text-xs ml-2">Remove</button>
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
    </div>
  );
}
