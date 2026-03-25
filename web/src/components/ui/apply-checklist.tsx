"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle, X } from "lucide-react";

interface ResumeVersion {
  id: string;
  name: string;
  isDefault: boolean;
}

interface ApplyChecklistProps {
  jobId: string;
  jobCompany: string;
  jobTitle: string;
  resumeVersions: ResumeVersion[];
  currentResumeVersionId: string | null;
  hasOutreach: boolean;
  strategyMode: string;
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

export function ApplyChecklist({
  jobId,
  jobCompany,
  jobTitle,
  resumeVersions,
  currentResumeVersionId,
  hasOutreach,
  strategyMode,
  onApply,
  onCancel,
  isLoading,
}: ApplyChecklistProps) {
  const [resumeVersionId, setResumeVersionId] = useState(
    currentResumeVersionId || resumeVersions[0]?.id || ""
  );
  const [applicationMethod, setApplicationMethod] = useState("company_website");
  const [applicationUrl, setApplicationUrl] = useState("");
  const [applicationNotes, setApplicationNotes] = useState("");

  const isReferralFirst = strategyMode === "referral_first";
  const showOutreachWarning = isReferralFirst && !hasOutreach;

  const canApply =
    resumeVersionId && applicationMethod && (!showOutreachWarning || true);

  const checklist = [
    {
      id: "resume",
      title: "Resume version",
      completed: !!resumeVersionId,
      optional: false,
    },
    {
      id: "method",
      title: "Application method",
      completed: !!applicationMethod,
      optional: false,
    },
    {
      id: "url",
      title: "Application URL",
      completed: !!applicationUrl,
      optional: true,
    },
    {
      id: "notes",
      title: "Application notes",
      completed: !!applicationNotes,
      optional: true,
    },
  ];

  const completedCount = checklist.filter((item) => item.completed).length;
  const requiredCount = checklist.filter((item) => !item.optional).length;
  const allRequiredCompleted = checklist
    .filter((item) => !item.optional)
    .every((item) => item.completed);

  async function handleConfirm() {
    if (!allRequiredCompleted) return;

    try {
      await onApply({
        resumeVersionId,
        applicationMethod,
        applicationUrl,
        applicationNotes,
      });
    } catch (error) {
      console.error("Error applying:", error);
    }
  }

  return (
    <Card className="border-blue-500/50 bg-blue-950/20 mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Apply to {jobCompany}</span>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-1 hover:bg-white/10 rounded"
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress indicator */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
          <div className="flex gap-1">
            {checklist.map((item) => (
              <div
                key={item.id}
                className="relative"
                title={item.title}
              >
                {item.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-600" />
                )}
              </div>
            ))}
          </div>
          <span>
            {completedCount} of {checklist.length} steps
          </span>
        </div>

        {/* Outreach warning */}
        {showOutreachWarning && (
          <div className="rounded-lg bg-yellow-950/30 border border-yellow-700/50 p-3 text-sm text-yellow-200">
            <div className="font-semibold mb-1">Referral-First Mode</div>
            <p>
              You haven't reached out to any contacts yet. Consider finding a
              referral first for better odds.
            </p>
          </div>
        )}

        {/* Resume version */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Resume Version <span className="text-red-500">*</span>
          </label>
          <Select
            value={resumeVersionId}
            onChange={setResumeVersionId}
            options={resumeVersions.map((v) => ({
              value: v.id,
              label: `${v.name}${v.isDefault ? " (default)" : ""}`,
            }))}
            disabled={isLoading}
          />
        </div>

        {/* Application method */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Application Method <span className="text-red-500">*</span>
          </label>
          <Select
            value={applicationMethod}
            onChange={setApplicationMethod}
            options={APPLICATION_METHODS}
            disabled={isLoading}
          />
        </div>

        {/* Application URL */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Application URL
          </label>
          <Input
            type="url"
            placeholder="https://..."
            value={applicationUrl}
            onChange={(e) => setApplicationUrl(e.target.value)}
            disabled={isLoading}
          />
        </div>

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
            rows={3}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleConfirm}
            disabled={!allRequiredCompleted || isLoading}
            className="flex-1"
          >
            {isLoading ? "Confirming..." : "Confirm Application"}
          </Button>
          <Button
            onClick={onCancel}
            disabled={isLoading}
            variant="outline"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
