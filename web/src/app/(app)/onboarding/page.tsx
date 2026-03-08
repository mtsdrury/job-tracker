"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface School {
  name: string;
  linkedin_id: string;
  status: "Student" | "Alum";
}

interface Template {
  name: string;
  body: string;
  category: "initial_outreach" | "follow_up" | "thank_you" | "referral_request";
}

const DEFAULT_TEMPLATE: Template = {
  name: "Alumni Outreach",
  body: `Hi {first_name},

I noticed you work at {company} and I'm very interested in the {role} position. {connection}

I'd love to hear about your experience there and any advice you might have. Would you be open to a quick chat?

Thanks so much!`,
  category: "initial_outreach",
};

const STEPS = ["Schools", "Resumes", "Strategy", "Templates"];

const SAMPLE_PREVIEW: Record<string, string> = {
  "{first_name}": "Alex",
  "{company}": "Google",
  "{role}": "Software Engineer",
  "{connection}": "I'm also a State University alum.",
};

function renderPreview(body: string): string {
  let result = body;
  for (const [placeholder, value] of Object.entries(SAMPLE_PREVIEW)) {
    result = result.replaceAll(placeholder, value);
  }
  return result;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Schools
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolName, setSchoolName] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [schoolStatus, setSchoolStatus] = useState<"Student" | "Alum">("Alum");

  // Step 2: Resume Versions
  const [resumeVersions, setResumeVersions] = useState<string[]>([]);
  const [newResume, setNewResume] = useState("");

  // Step 3: Strategy
  const [strategy, setStrategy] = useState<"referral_first" | "speed_first">(
    "referral_first"
  );

  // Step 4: Templates
  const [templates, setTemplates] = useState<Template[]>([
    { ...DEFAULT_TEMPLATE },
  ]);
  const [showPreview, setShowPreview] = useState<number | null>(null);

  function addSchool() {
    if (!schoolName.trim()) return;
    setSchools([
      ...schools,
      {
        name: schoolName.trim(),
        linkedin_id: schoolId.trim(),
        status: schoolStatus,
      },
    ]);
    setSchoolName("");
    setSchoolId("");
  }

  function removeSchool(idx: number) {
    setSchools(schools.filter((_, i) => i !== idx));
  }

  function addResume() {
    const trimmed = newResume.trim();
    if (!trimmed || resumeVersions.includes(trimmed)) return;
    setResumeVersions([...resumeVersions, trimmed]);
    setNewResume("");
  }

  function removeResume(idx: number) {
    setResumeVersions(resumeVersions.filter((_, i) => i !== idx));
  }

  function updateTemplate(idx: number, field: keyof Template, value: string) {
    const updated = [...templates];
    updated[idx] = { ...updated[idx], [field]: value };
    setTemplates(updated);
  }

  async function handleComplete() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schools,
          resumeVersions,
          strategy,
          templates,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Progress steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  i <= step
                    ? "bg-accent text-white"
                    : "bg-surface border border-border text-muted"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-sm hidden sm:inline ${
                  i <= step ? "text-foreground" : "text-muted"
                }`}
              >
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-8 h-px ${
                    i < step ? "bg-accent" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardContent>
            {error && (
              <div className="rounded-lg bg-danger/10 border border-danger/20 px-4 py-3 text-sm text-danger mb-4">
                {error}
              </div>
            )}

            {/* Step 1: Schools */}
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Your Schools
                  </h2>
                  <p className="text-sm text-muted mt-1">
                    Add your schools to find alumni at target companies.
                    To find the LinkedIn ID: go to LinkedIn, search for your
                    school, open its page, and grab the number from the URL
                    (e.g. linkedin.com/school/<strong>1234</strong>/).
                    This powers the &quot;Find Alumni&quot; button on each job.
                  </p>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input
                      id="school-name"
                      label="School Name"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="State University"
                      onKeyDown={(e) => e.key === "Enter" && addSchool()}
                    />
                  </div>
                  <div className="w-28">
                    <Input
                      id="school-id"
                      label="LinkedIn ID"
                      value={schoolId}
                      onChange={(e) => setSchoolId(e.target.value)}
                      placeholder="1234"
                      onKeyDown={(e) => e.key === "Enter" && addSchool()}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-foreground">
                      Status
                    </label>
                    <select
                      value={schoolStatus}
                      onChange={(e) =>
                        setSchoolStatus(e.target.value as "Student" | "Alum")
                      }
                      className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground hover:border-border-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
                    >
                      <option value="Student">Student</option>
                      <option value="Alum">Alum</option>
                    </select>
                  </div>
                  <Button onClick={addSchool} size="sm" className="shrink-0">
                    Add
                  </Button>
                </div>
                {schools.length > 0 && (
                  <div className="space-y-2">
                    {schools.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2"
                      >
                        <span className="text-sm text-foreground">
                          {s.name}{" "}
                          <span className="text-muted">
                            ({s.status}
                            {s.linkedin_id ? `, ID: ${s.linkedin_id}` : ""})
                          </span>
                        </span>
                        <button
                          onClick={() => removeSchool(i)}
                          className="text-muted hover:text-danger text-sm transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {schools.length === 0 && (
                  <p className="text-sm text-muted italic">
                    No schools added yet. You can skip this step and add them
                    later in settings.
                  </p>
                )}
              </div>
            )}

            {/* Step 2: Resume Versions */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Resume Versions
                  </h2>
                  <p className="text-sm text-muted mt-1">
                    Name your resume variants so you can track which version you
                    send to each company. You can upload the actual files later.
                  </p>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input
                      id="resume-name"
                      label="Version Name"
                      value={newResume}
                      onChange={(e) => setNewResume(e.target.value)}
                      placeholder="Software Engineer"
                      onKeyDown={(e) => e.key === "Enter" && addResume()}
                    />
                  </div>
                  <Button onClick={addResume} size="sm" className="shrink-0">
                    Add
                  </Button>
                </div>
                {resumeVersions.length > 0 && (
                  <div className="space-y-2">
                    {resumeVersions.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2"
                      >
                        <span className="text-sm text-foreground">{r}</span>
                        <button
                          onClick={() => removeResume(i)}
                          className="text-muted hover:text-danger text-sm transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {resumeVersions.length === 0 && (
                  <p className="text-sm text-muted italic">
                    No resume versions added yet. You can skip this and add them
                    later.
                  </p>
                )}
              </div>
            )}

            {/* Step 3: Strategy */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Job Search Strategy
                  </h2>
                  <p className="text-sm text-muted mt-1">
                    How should the platform guide your applications? You can
                    change this anytime.
                  </p>
                </div>
                <div className="grid gap-4">
                  <button
                    onClick={() => setStrategy("referral_first")}
                    className={`text-left rounded-xl border p-4 transition-colors ${
                      strategy === "referral_first"
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-border-hover"
                    }`}
                  >
                    <div className="font-medium text-foreground">
                      Referral First
                    </div>
                    <p className="text-sm text-muted mt-1">
                      The platform will encourage you to find connections and
                      reach out before applying. The Apply button is gated until
                      you&apos;ve made contact (with an override always
                      available). Best for maximizing your chances at companies
                      you really want.
                    </p>
                  </button>
                  <button
                    onClick={() => setStrategy("speed_first")}
                    className={`text-left rounded-xl border p-4 transition-colors ${
                      strategy === "speed_first"
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-border-hover"
                    }`}
                  >
                    <div className="font-medium text-foreground">
                      Speed First
                    </div>
                    <p className="text-sm text-muted mt-1">
                      Apply quickly, network in parallel. The platform still
                      surfaces connections and suggests outreach, but never
                      blocks you from applying. Best for volume applications.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Templates */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Message Templates
                  </h2>
                  <p className="text-sm text-muted mt-1">
                    Set up outreach message templates. Use placeholders:{" "}
                    <code className="text-xs bg-surface-hover px-1 py-0.5 rounded">
                      {"{first_name}"}
                    </code>
                    ,{" "}
                    <code className="text-xs bg-surface-hover px-1 py-0.5 rounded">
                      {"{company}"}
                    </code>
                    ,{" "}
                    <code className="text-xs bg-surface-hover px-1 py-0.5 rounded">
                      {"{role}"}
                    </code>
                    ,{" "}
                    <code className="text-xs bg-surface-hover px-1 py-0.5 rounded">
                      {"{connection}"}
                    </code>
                    . You can edit these anytime in settings.
                  </p>
                </div>
                {templates.map((t, i) => (
                  <div
                    key={i}
                    className="space-y-3 rounded-lg border border-border p-4"
                  >
                    <Input
                      id={`template-name-${i}`}
                      label="Template Name"
                      value={t.name}
                      onChange={(e) =>
                        updateTemplate(i, "name", e.target.value)
                      }
                    />
                    <Textarea
                      id={`template-body-${i}`}
                      label="Message Body"
                      value={t.body}
                      rows={6}
                      onChange={(e) =>
                        updateTemplate(i, "body", e.target.value)
                      }
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setShowPreview(showPreview === i ? null : i)
                        }
                      >
                        {showPreview === i ? "Hide Preview" : "Show Preview"}
                      </Button>
                      {templates.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setTemplates(templates.filter((_, j) => j !== i))
                          }
                          className="text-danger hover:text-danger"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    {showPreview === i && (
                      <div className="rounded-lg bg-background border border-border p-4">
                        <p className="text-xs text-muted mb-2 font-medium">
                          Preview with sample data:
                        </p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {renderPreview(t.body)}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setTemplates([
                      ...templates,
                      { name: "", body: "", category: "initial_outreach" },
                    ])
                  }
                >
                  + Add Another Template
                </Button>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-4 border-t border-border">
              <Button
                variant="ghost"
                onClick={() => setStep(step - 1)}
                disabled={step === 0}
              >
                Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep(step + 1)}>Next</Button>
              ) : (
                <Button onClick={handleComplete} disabled={loading}>
                  {loading ? "Setting up..." : "Complete Setup"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
