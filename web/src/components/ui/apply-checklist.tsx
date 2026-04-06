"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";

interface ResumeVersion {
  id: string;
  name: string;
  isDefault: boolean;
}

interface ApplyChecklistProps {
  jobId: string;
  company: string;
  title: string;
  resumeVersions: ResumeVersion[];
  currentResumeVersionId: string | null;
  applicationUrl: string | null;
  onApply: (data: {
    resumeVersionId: string;
    applicationMethod: string;
    applicationUrl: string;
    applicationNotes: string;
  }) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

const APPLICATION_METHODS = [
  { value: "company_website", label: "Company Website" },
  { value: "linkedin_easy_apply", label: "LinkedIn Easy Apply" },
  { value: "email", label: "Email" },
  { value: "recruiter", label: "Recruiter" },
  { value: "other", label: "Other" },
];

function detectApplicationMethod(url: string | null): string {
  if (!url) return "company_website";

  const domain = url.toLowerCase();
  if (domain.includes("linkedin.com")) return "linkedin_easy_apply";
  if (domain.includes("email") || domain.includes("mail")) return "email";
  return "company_website";
}

export function ApplyChecklist({
  jobId,
  company,
  title,
  resumeVersions,
  currentResumeVersionId,
  applicationUrl,
  onApply,
  onCancel,
  isLoading,
}: ApplyChecklistProps) {
  const [resumeVersionId, setResumeVersionId] = useState(
    currentResumeVersionId || resumeVersions[0]?.id || ""
  );
  const [applicationMethod, setApplicationMethod] = useState(
    detectApplicationMethod(applicationUrl)
  );
  const [newApplicationUrl, setNewApplicationUrl] = useState("");
  const [applicationNotes, setApplicationNotes] = useState("");

  // Only show URL input if no existing URL
  const showUrlInput = !applicationUrl;

  const canApply = resumeVersionId && applicationMethod;

  async function handleConfirm() {
    if (!canApply) return;

    try {
      await onApply({
        resumeVersionId,
        applicationMethod,
        applicationUrl: newApplicationUrl || applicationUrl || "",
        applicationNotes,
      });
    } catch (error) {
      console.error("Error applying:", error);
    }
  }

  return (
    <Card className="border-success/20 bg-accent/10 mb-4">
      <CardContent className="pt-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">
              Applying to {company}...
            </h3>
            <p className="text-xs text-muted mt-1">{title}</p>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            aria-label="Cancel"
          >
            <X className="w-4 h-4 text-muted" />
          </button>
        </div>

        {/* Resume version */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Resume Version <span className="text-danger">*</span>
          </label>
          <Select
            value={resumeVersionId}
            onChange={(e) => setResumeVersionId(e.target.value)}
            disabled={isLoading}
          >
            <option value="">Select resume version...</option>
            {resumeVersions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}{v.isDefault ? " (default)" : ""}
              </option>
            ))}
          </Select>
        </div>

        {/* Application method */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Application Method <span className="text-danger">*</span>
          </label>
          <Select
            value={applicationMethod}
            onChange={(e) => setApplicationMethod(e.target.value)}
            disabled={isLoading}
          >
            <option value="">Select method...</option>
            {APPLICATION_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Application URL -- only shown if no existing URL */}
        {showUrlInput && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Application URL
            </label>
            <Input
              type="url"
              placeholder="https://..."
              value={newApplicationUrl}
              onChange={(e) => setNewApplicationUrl(e.target.value)}
              disabled={isLoading}
            />
          </div>
        )}

        {/* Application notes */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Application Notes
          </label>
          <Textarea
            placeholder="Any notes about how you applied..."
            value={applicationNotes}
            onChange={(e) => setApplicationNotes(e.target.value)}
            disabled={isLoading}
            rows={2}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleConfirm}
            disabled={!canApply || isLoading}
            className="flex-1"
          >
            {isLoading ? "Confirming..." : "Confirm Application"}
          </Button>
          <Button
            onClick={onCancel}
            disabled={isLoading}
            variant="ghost"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
