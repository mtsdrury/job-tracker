"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  Lock,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

interface MatchScoreProps {
  jobId: string;
  jobDescription?: string | null;
  resumeVersionId?: string;
  resumeVersionName?: string;
  userBillingStatus?: "free" | "pro";
}

interface MatchScoreData {
  score: number;
  verdict: string;
  strengths: string[];
  gaps: string[];
  suggestions: string[];
}

/**
 * Displays Claude-powered resume-to-job match analysis
 * Shows score, strengths, gaps, and actionable suggestions
 */
export function MatchScore({
  jobId,
  jobDescription,
  resumeVersionId,
  resumeVersionName,
  userBillingStatus = "free",
}: MatchScoreProps) {
  const [matchData, setMatchData] = useState<MatchScoreData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    strengths: true,
    gaps: false,
    suggestions: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleAnalyzeMatch = async () => {
    if (!resumeVersionId || !jobId) {
      setError("Missing resume or job information");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/jobs/${jobId}/match-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeVersionId }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 403) {
          setError(
            data.error ||
              "This feature requires a Pro subscription. Please upgrade."
          );
        } else {
          setError(data.error || "Failed to analyze match");
        }
        return;
      }

      const data = await response.json();
      setMatchData(data);
      setExpandedSections({ strengths: true, gaps: false, suggestions: false });
    } catch (err) {
      console.error("Error analyzing match:", err);
      setError("Failed to analyze match. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Free user view
  if (userBillingStatus === "free") {
    return (
      <Card className="bg-accent/5 border-accent/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Lock className="h-5 w-5 text-accent mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold mb-1">
                AI-Powered Resume Matching
              </h3>
              <p className="text-sm text-muted mb-4">
                Get AI analysis of how well your resume matches this job. See
                your strengths, gaps, and personalized suggestions.
              </p>
              <Link href="/billing">
                <Button size="sm">
                  Upgrade to Pro
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No job description
  if (!jobDescription) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-sm text-muted">
            <AlertCircle className="h-5 w-5" />
            <span>Save a job from Job Search to get AI match analysis</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No resume selected
  if (!resumeVersionId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-sm text-muted">
            <AlertCircle className="h-5 w-5" />
            <span>Select a resume version to analyze your match</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="bg-danger/5 border-danger/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-danger mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-danger">{error}</p>
              {error.includes("Pro") && (
                <Link href="/billing" className="mt-2 block">
                  <Button size="sm">
                    Upgrade to Pro
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data yet - show analyze button
  if (!matchData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <TrendingUp className="h-8 w-8 text-accent" />
            </div>
            <h3 className="font-semibold mb-2">Analyze Your Match</h3>
            <p className="text-sm text-muted mb-4">
              Get AI assessment of how your resume matches this job.
            </p>
            <Button
              onClick={handleAnalyzeMatch}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Analyze Match
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get score color and label
  const getScoreColor = () => {
    if (matchData.score >= 80) return "text-success";
    if (matchData.score >= 60) return "text-accent";
    if (matchData.score >= 40) return "text-warning";
    return "text-danger";
  };

  const getScoreLabel = () => {
    if (matchData.score >= 80) return "Strong Match";
    if (matchData.score >= 60) return "Good Match";
    if (matchData.score >= 40) return "Moderate Match";
    return "Weak Match";
  };

  const getScoreBgColor = () => {
    if (matchData.score >= 80) return "bg-success/5";
    if (matchData.score >= 60) return "bg-accent/5";
    if (matchData.score >= 40) return "bg-warning/5";
    return "bg-danger/5";
  };

  const getScoreBorderColor = () => {
    if (matchData.score >= 80) return "border-success/20";
    if (matchData.score >= 60) return "border-accent/20";
    if (matchData.score >= 40) return "border-warning/20";
    return "border-danger/20";
  };

  return (
    <Card className={`${getScoreBgColor()} ${getScoreBorderColor()}`}>
      <CardContent className="pt-6">
        {/* Header with score circle */}
        <div className="flex items-start gap-4 mb-6">
          {/* Score circle */}
          <div className="relative w-20 h-20 flex items-center justify-center flex-shrink-0">
            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-border"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - matchData.score / 100)}`}
                className={`${getScoreColor()} transition-all`}
              />
            </svg>
            <div className="absolute text-center">
              <div className={`text-lg font-bold ${getScoreColor()}`}>
                {matchData.score}
              </div>
              <div className="text-xs text-muted">score</div>
            </div>
          </div>

          {/* Match info */}
          <div className="flex-1">
            <div className={`font-semibold ${getScoreColor()}`}>
              {getScoreLabel()}
            </div>
            <div className="text-sm text-muted mt-1">{matchData.verdict}</div>
            {resumeVersionName && (
              <div className="text-xs text-muted mt-2">{resumeVersionName}</div>
            )}
          </div>
        </div>

        {/* Expandable sections */}
        <div className="space-y-3">
          {/* Strengths */}
          <div className="border-t">
            <button
              onClick={() => toggleSection("strengths")}
              className="w-full flex items-center justify-between py-3 hover:bg-white/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="font-semibold text-sm">Your Strengths</span>
              </div>
              {expandedSections.strengths ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {expandedSections.strengths && (
              <div className="pb-3 space-y-2">
                {matchData.strengths.map((strength, idx) => (
                  <div key={idx} className="flex gap-2 text-sm ml-4">
                    <span className="text-success font-bold">+</span>
                    <span className="text-foreground">{strength}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gaps */}
          <div className="border-t">
            <button
              onClick={() => toggleSection("gaps")}
              className="w-full flex items-center justify-between py-3 hover:bg-white/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-warning" />
                <span className="font-semibold text-sm">Gaps</span>
              </div>
              {expandedSections.gaps ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {expandedSections.gaps && (
              <div className="pb-3 space-y-2">
                {matchData.gaps.map((gap, idx) => (
                  <div key={idx} className="flex gap-2 text-sm ml-4">
                    <span className="text-warning font-bold">-</span>
                    <span className="text-foreground">{gap}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Suggestions */}
          <div className="border-t">
            <button
              onClick={() => toggleSection("suggestions")}
              className="w-full flex items-center justify-between py-3 hover:bg-white/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span className="font-semibold text-sm">How to Improve</span>
              </div>
              {expandedSections.suggestions ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {expandedSections.suggestions && (
              <div className="pb-3 space-y-2">
                {matchData.suggestions.map((suggestion, idx) => (
                  <div key={idx} className="flex gap-2 text-sm ml-4">
                    <span className="text-accent font-bold">•</span>
                    <span className="text-foreground">{suggestion}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Re-analyze button */}
        <div className="pt-4 border-t">
          <Button
            onClick={handleAnalyzeMatch}
            disabled={isLoading}
            variant="secondary"
            size="sm"
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Re-analyzing...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Re-analyze
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
