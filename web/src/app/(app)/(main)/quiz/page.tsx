"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FREE_TIER_QUESTIONS,
  PRO_TIER_QUESTIONS,
  WRITING_PROMPTS,
  calculateToneProfile,
  type ToneProfile,
  type QuizQuestion,
  type WritingPrompt,
  type WritingSample,
} from "@/lib/tone-quiz";
import { Sparkles } from "lucide-react";

interface QuizAnswers {
  [questionId: number]: number;
}

interface UserData {
  billingStatus: "free" | "pro";
  toneProfile?: ToneProfile | null;
}

type QuizStep = "loading" | "intro" | "questions" | "free-results" | "pro-upsell" | "writing-prompts" | "pro-questions" | "final-results";

const ARCHETYPE_ICONS: Record<string, string> = {
  "The Connector": "🤝",
  "The Strategist": "🎯",
  "The Natural": "😄",
  "The Professional": "💼",
  "The Storyteller": "📖",
  "The Minimalist": "⚡",
  "The Balanced": "⚖️",
};

export default function QuizPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const toast = useToast();

  // State
  const [step, setStep] = useState<QuizStep>("loading");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [writingSamples, setWritingSamples] = useState<WritingSample[]>([]);
  const [currentPromptResponse, setCurrentPromptResponse] = useState("");

  // Load user data and initialize
  useEffect(() => {
    if (!session?.user?.id) return;

    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setUserData({
          billingStatus: data.billingStatus || "free",
          toneProfile: data.toneProfile || null,
        });
        setStep("intro");
      })
      .catch((err) => {
        console.error("Failed to load user data:", err);
      });
  }, [session?.user?.id]);

  // Determine which questions to show based on step
  useEffect(() => {
    if (step === "questions") {
      setQuestions(FREE_TIER_QUESTIONS);
    } else if (step === "pro-questions") {
      setQuestions(PRO_TIER_QUESTIONS);
    }
  }, [step]);

  function startQuiz() {
    setAnswers({});
    setSelectedOption(null);
    setCurrentQuestionIndex(0);
    setStep("questions");
  }

  function handleAnswerSelect(optionIndex: number) {
    setSelectedOption(optionIndex);
  }

  function handleNext() {
    if (selectedOption === null) return;

    const currentQuestion = questions[currentQuestionIndex];
    const newAnswers = { ...answers, [currentQuestion.id]: selectedOption };
    setAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(null);
    } else {
      // Questions finished
      if (step === "questions") {
        // Free tier questions done
        if (userData?.billingStatus === "pro") {
          // Show writing prompts next
          setCurrentPromptIndex(0);
          setCurrentPromptResponse("");
          setWritingSamples([]);
          setStep("writing-prompts");
        } else {
          // Show results
          const profile = calculateToneProfile(newAnswers, false);
          showFreeResults(profile, newAnswers);
        }
      } else if (step === "pro-questions") {
        // All pro questions done
        const profile = calculateToneProfile(newAnswers, true);
        showFinalResults(profile, writingSamples);
      }
    }
  }

  function handleBack() {
    if (currentQuestionIndex > 0) {
      const currentQuestion = questions[currentQuestionIndex];
      const prevQuestion = questions[currentQuestionIndex - 1];
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setSelectedOption(answers[prevQuestion.id] ?? null);
    }
  }

  function showFreeResults(profile: ToneProfile, questionAnswers: QuizAnswers) {
    // Store free tier answers for potential pro continuation
    setAnswers(questionAnswers);
    setStep("free-results");
  }

  function continueToProQuiz() {
    setCurrentPromptIndex(0);
    setCurrentPromptResponse("");
    setWritingSamples([]);
    setStep("writing-prompts");
  }

  function handlePromptResponseChange(value: string) {
    setCurrentPromptResponse(value);
  }

  function handlePromptNext() {
    const currentPrompt = WRITING_PROMPTS[currentPromptIndex];

    // Save the response if provided
    if (currentPromptResponse.trim()) {
      const newSamples = [...writingSamples, {
        promptId: currentPrompt.id,
        response: currentPromptResponse.trim(),
      }];
      setWritingSamples(newSamples);
    }

    // Move to next prompt or finish writing section
    if (currentPromptIndex < WRITING_PROMPTS.length - 1) {
      setCurrentPromptIndex(currentPromptIndex + 1);
      setCurrentPromptResponse("");
    } else {
      // Writing prompts done, move to pro questions
      setCurrentQuestionIndex(0);
      setSelectedOption(null);
      setQuestions(PRO_TIER_QUESTIONS);
      setAnswers({});
      setStep("pro-questions");
    }
  }

  function handlePromptSkip() {
    // Move to next prompt or finish
    if (currentPromptIndex < WRITING_PROMPTS.length - 1) {
      setCurrentPromptIndex(currentPromptIndex + 1);
      setCurrentPromptResponse("");
    } else {
      // Skip remaining, move to pro questions
      setCurrentQuestionIndex(0);
      setSelectedOption(null);
      setQuestions(PRO_TIER_QUESTIONS);
      setAnswers({});
      setStep("pro-questions");
    }
  }

  function showFinalResults(profile: ToneProfile, samples: WritingSample[] = []) {
    // Store complete profile and writing samples
    setAnswers({}); // Clear to indicate we're at results
    saveProfile(profile, samples);
  }

  async function saveProfile(profile: ToneProfile, samples: WritingSample[] = []) {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toneProfile: profile,
          writingSamples: samples.length > 0 ? samples : undefined,
        }),
      });

      if (res.ok) {
        setUserData((prev) => prev ? { ...prev, toneProfile: profile } : null);
        toast.success("Tone profile saved!");
        setStep("final-results");
      } else {
        toast.error("Failed to save profile");
      }
    } catch (err) {
      console.error("Failed to save profile:", err);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function retakeQuiz() {
    setAnswers({});
    setSelectedOption(null);
    setCurrentQuestionIndex(0);
    setStep("intro");
  }

  if (step === "loading") {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Card>
          <CardContent className="py-8 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "intro") {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-accent" />
            <h1 className="text-3xl font-bold">Tone Profile Quiz</h1>
          </div>
          <p className="text-muted text-lg">
            Discover your communication style and unlock AI-powered messaging tailored to you.
          </p>
        </div>

        <Card>
          <CardContent className="py-8 space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">How It Works</h2>
              <ul className="space-y-3 text-muted">
                <li className="flex gap-3">
                  <span className="font-bold text-accent flex-shrink-0">1.</span>
                  <span>Answer 5 quick questions about your communication style.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-accent flex-shrink-0">2.</span>
                  <span>Get your communication archetype and insight into your tone dimensions.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-accent flex-shrink-0">3.</span>
                  <span>Your AI message drafting will be personalized to match your style.</span>
                </li>
                {userData?.billingStatus === "pro" && (
                  <>
                    <li className="flex gap-3">
                      <span className="font-bold text-accent flex-shrink-0">4.</span>
                      <span>Pro users: provide 3 optional writing samples so we can match your natural voice.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold text-accent flex-shrink-0">5.</span>
                      <span>Pro users: unlock 10 deeper questions for a more detailed profile.</span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            <div className="bg-surface border border-border rounded-lg p-4">
              <p className="text-sm text-muted">
                This quiz takes about 2-3 minutes. Your responses help us understand your unique voice so your AI-drafted messages feel authentically you.
              </p>
            </div>

            <Button onClick={startQuiz} className="w-full" size="lg">
              Start Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "questions" || step === "pro-questions") {
    const currentQuestion = questions[currentQuestionIndex];
    const totalQuestions = questions.length;
    const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
    const isProTier = step === "pro-questions";

    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
            {isProTier && (
              <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded">Pro Tier</span>
            )}
          </div>
          <div className="w-full bg-border-default rounded-full h-2">
            <div
              className="bg-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <Card>
          <CardContent className="py-8 space-y-6">
            <h2 className="text-xl font-semibold leading-tight">{currentQuestion.text}</h2>

            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedOption === index
                      ? "border-accent bg-accent/10"
                      : "border-border bg-surface hover:border-accent/50"
                  }`}
                >
                  <p className="font-medium">{option.text}</p>
                </button>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleBack}
                variant="secondary"
                disabled={currentQuestionIndex === 0}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={selectedOption === null}
                className="flex-1"
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "free-results") {
    const profile = calculateToneProfile(answers, false);

    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <ResultsView profile={profile} />

        <Card className="mt-8">
          <CardContent className="py-8 space-y-4">
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Want deeper insights?</h3>
              <p className="text-sm text-muted mb-4">
                Upgrade to Pro to unlock 10 additional questions for a more detailed personality analysis and even more refined AI messaging.
              </p>
            </div>

            {userData?.billingStatus === "pro" && (
              <Button onClick={continueToProQuiz} className="w-full" variant="primary">
                Continue for Deeper Insights
              </Button>
            )}

            {userData?.billingStatus === "free" && (
              <Button onClick={() => router.push("/billing")} className="w-full" variant="primary">
                Upgrade to Pro
              </Button>
            )}

            <Button onClick={retakeQuiz} variant="secondary" className="w-full">
              Retake Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "writing-prompts") {
    const currentPrompt = WRITING_PROMPTS[currentPromptIndex];
    const totalPrompts = WRITING_PROMPTS.length;
    const progress = ((currentPromptIndex + 1) / totalPrompts) * 100;

    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted">
              Writing Sample {currentPromptIndex + 1} of {totalPrompts}
            </span>
            <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded">Pro Only</span>
          </div>
          <div className="w-full bg-border-default rounded-full h-2">
            <div
              className="bg-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <Card>
          <CardContent className="py-8 space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">{currentPrompt.title}</h2>
              <div className="bg-surface border border-border rounded-lg p-4 mb-6 text-sm text-muted whitespace-pre-wrap">
                {currentPrompt.scenario}
              </div>
            </div>

            <div>
              <textarea
                value={currentPromptResponse}
                onChange={(e) => handlePromptResponseChange(e.target.value)}
                placeholder={currentPrompt.placeholder}
                className="w-full p-4 rounded-lg border border-border bg-surface text-foreground placeholder:text-muted focus:border-accent focus:outline-none min-h-[150px] resize-none"
              />
              <div className="mt-2 text-xs text-muted">
                {currentPromptResponse.length}/{currentPrompt.minLength} characters minimum
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handlePromptSkip}
                variant="secondary"
                className="flex-1"
              >
                Skip
              </Button>
              <Button
                onClick={handlePromptNext}
                disabled={currentPromptResponse.trim().length < currentPrompt.minLength}
                className="flex-1"
              >
                {currentPromptIndex === WRITING_PROMPTS.length - 1 ? "Continue" : "Next"}
              </Button>
            </div>

            <div className="text-xs text-muted bg-surface border border-border rounded p-3">
              These writing samples help us understand your natural communication style, so we can make AI-drafted messages feel authentically you. You can skip any prompt if you prefer.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "final-results") {
    const profile = userData?.toneProfile || calculateToneProfile(answers, true);

    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <ResultsView profile={profile} isPro={true} />

        <Card className="mt-8">
          <CardContent className="py-6 space-y-3">
            <Button onClick={() => router.push("/dashboard")} className="w-full" variant="primary">
              Return to Dashboard
            </Button>
            <Button onClick={retakeQuiz} variant="secondary" className="w-full">
              Retake Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

function ResultsView({
  profile,
  isPro = false,
}: {
  profile: ToneProfile;
  isPro?: boolean;
}) {
  const icon = ARCHETYPE_ICONS[profile.archetype] || "✨";

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-5xl mb-4">{icon}</div>
        <h1 className="text-3xl font-bold mb-2">{profile.archetype}</h1>
        <p className="text-muted text-lg">{profile.description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Tone Dimensions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <DimensionBar name="Formality" value={profile.formality} label={profile.formality > 60 ? "Formal" : "Casual"} />
          <DimensionBar name="Warmth" value={profile.warmth} label={profile.warmth > 60 ? "Warm" : "Reserved"} />
          <DimensionBar name="Directness" value={profile.directness} label={profile.directness > 60 ? "Direct" : "Indirect"} />
          <DimensionBar name="Energy" value={profile.energy} label={profile.energy > 60 ? "Energetic" : "Measured"} />
          <DimensionBar name="Humor" value={profile.humor} label={profile.humor > 60 ? "Playful" : "Serious"} />
        </CardContent>
      </Card>

      <Card className="bg-surface border border-accent/30">
        <CardHeader>
          <CardTitle className="text-sm">How This Affects Your Messages</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted">
          <p>
            {profile.archetype === "The Connector" &&
              "Your outreach messages will emphasize genuine connection and relationship-building, showing authentic interest in the person beyond the job opportunity."}
            {profile.archetype === "The Strategist" &&
              "Your messages will be crisp and purposeful, leading with clear value and getting straight to the ask while maintaining professionalism."}
            {profile.archetype === "The Natural" &&
              "Your messages will feel conversational and authentic, using light humor and natural language that puts people at ease."}
            {profile.archetype === "The Professional" &&
              "Your messages will be polished and well-structured, commanding respect through clear articulation and composed confidence."}
            {profile.archetype === "The Storyteller" &&
              "Your messages will be engaging and expressive, using narrative elements and energy to captivate and inspire action."}
            {profile.archetype === "The Minimalist" &&
              "Your messages will be straightforward and efficient, respecting the recipient's time with substance over small talk."}
            {profile.archetype === "The Balanced" &&
              "Your messages will adapt to different contexts and people, flexibly finding the right tone for each situation."}
          </p>
          <p className="pt-2 text-xs">
            When you use our AI message drafting, Claude will adjust its style to match your voice and ensure every message feels authentically you.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function DimensionBar({
  name,
  value,
  label,
}: {
  name: string;
  value: number;
  label: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{name}</span>
        <span className="text-xs text-muted">{label}</span>
      </div>
      <div className="w-full bg-border-default rounded-full h-2">
        <div
          className="bg-accent h-2 rounded-full transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="text-xs text-muted mt-1 text-right">{value}/100</div>
    </div>
  );
}
