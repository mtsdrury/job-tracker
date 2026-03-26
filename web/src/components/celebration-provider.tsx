"use client";

import { createContext, useContext, useCallback } from "react";
import { useToast } from "@/components/ui/toast";
import { triggerConfetti } from "@/components/ui/confetti";

interface CelebrationContextValue {
  celebrate: (milestone: string) => void;
}

const CelebrationContext = createContext<CelebrationContextValue | null>(null);

export function useCelebration(): CelebrationContextValue {
  const ctx = useContext(CelebrationContext);
  if (!ctx) throw new Error("useCelebration must be used within a CelebrationProvider");
  return ctx;
}

const milestoneMessages: Record<string, string> = {
  interview: "You landed an interview! Keep the momentum going.",
  offer: "You got an offer! All that networking paid off.",
  applied: "Application submitted! One step closer.",
  first_referral: "First referral added! The network is growing.",
  first_job: "First job tracked! Your search starts here.",
};

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();

  const celebrate = useCallback(
    (milestone: string) => {
      triggerConfetti();
      const message = milestoneMessages[milestone] || "Great milestone reached!";
      toast.success(message);
    },
    [toast]
  );

  const value: CelebrationContextValue = {
    celebrate,
  };

  return (
    <CelebrationContext.Provider value={value}>
      {children}
    </CelebrationContext.Provider>
  );
}
