"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Lock } from "lucide-react";
import Link from "next/link";

interface PrepQuestion {
  question: string;
  category: "behavioral" | "technical" | "company" | "ask_interviewer";
}

interface InterviewPrepProps {
  jobId: string;
  jobTitle: string;
  jobCompany: string;
  billingStatus: string;
  onQuestionsLoaded?: (questions: PrepQuestion[]) => void;
  initialQuestions?: PrepQuestion[];
}

const categoryVariants: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  behavioral: "info",
  technical: "default",
  company: "success",
  ask_interviewer: "warning",
};

const categoryLabels: Record<string, string> = {
  behavioral: "Behavioral",
  technical: "Technical",
  company: "Company",
  ask_interviewer: "Questions to Ask",
};

export function InterviewPrep({
  jobId,
  jobTitle,
  jobCompany,
  billingStatus,
  onQuestionsLoaded,
  initialQuestions,
}: InterviewPrepProps) {
  const [questions, setQuestions] = useState<PrepQuestion[] | null>(
    initialQuestions || null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerateQuestions = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/jobs/${jobId}/interview-prep`, {
        method: "POST",
      });

      if (res.status === 403) {
        setError("Upgrade to Pro to get AI-generated interview prep questions");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to generate questions");
        return;
      }

      const data = await res.json();
      setQuestions(data.questions);

      if (onQuestionsLoaded) {
        onQuestionsLoaded(data.questions);
      }
    } catch (err) {
      console.error("Error generating prep questions:", err);
      setError("Failed to generate questions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (billingStatus !== "pro") {
    return (
      <div className="rounded-lg border border-border bg-surface/50 p-6 text-center">
        <Lock className="h-8 w-8 text-muted mx-auto mb-3 opacity-50" />
        <h3 className="font-semibold mb-2">Upgrade to Pro</h3>
        <p className="text-sm text-muted mb-4">
          Get AI-generated interview prep questions to prepare for your upcoming
          interviews.
        </p>
        <Link href="/billing">
          <Button size="sm">Upgrade to Pro</Button>
        </Link>
      </div>
    );
  }

  if (!questions) {
    return (
      <div className="space-y-4">
        <Button
          onClick={handleGenerateQuestions}
          disabled={loading}
          className="w-full"
        >
          <Sparkles className="h-4 w-4" />
          {loading ? "Generating Questions..." : "Generate Prep Questions"}
        </Button>
        {error && (
          <div className="rounded-lg bg-danger/10 border border-danger/20 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Group questions by category
  const groupedQuestions: Record<string, PrepQuestion[]> = {
    behavioral: [],
    technical: [],
    company: [],
    ask_interviewer: [],
  };

  questions.forEach((q) => {
    if (groupedQuestions[q.category]) {
      groupedQuestions[q.category].push(q);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Interview Prep Questions</h3>
          <p className="text-xs text-muted">
            {questions.length} questions generated for {jobTitle} at{" "}
            {jobCompany}
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleGenerateQuestions}
          disabled={loading}
        >
          <Sparkles className="h-4 w-4" />
          {loading ? "Regenerating..." : "Regenerate"}
        </Button>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedQuestions).map(([category, categoryQuestions]) => {
          if (categoryQuestions.length === 0) return null;

          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant={categoryVariants[category] || "default"}>
                  {categoryLabels[category]}
                </Badge>
                <span className="text-xs text-muted">
                  {categoryQuestions.length} question
                  {categoryQuestions.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-3">
                {categoryQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-border p-4 hover:bg-surface/50 transition-colors"
                  >
                    <p className="text-sm leading-relaxed">{q.question}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-muted text-center pt-4 border-t border-border">
        These questions are AI-generated. Review and adapt them to your specific
        situation.
      </div>
    </div>
  );
}
