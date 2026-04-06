export interface PricingFeature {
  text: string;
  included: boolean;
}

export const PRICING_FEATURES: PricingFeature[] = [
  { text: "Track up to 25 jobs", included: true },
  { text: "Unlimited jobs", included: false },
  { text: "Full referral workflow", included: true },
  { text: "Message templates", included: true },
  { text: "AI message drafting", included: false },
  { text: "Pipeline dashboard", included: true },
  { text: "Job board search", included: false },
  { text: "Smart nudges & follow-ups", included: true },
  { text: "Advanced analytics", included: false },
  { text: "Priority support", included: false },
];

// Helper to get features by inclusion status
export const getFreeFeatures = () =>
  PRICING_FEATURES.filter((f) => f.included);

export const getProOnlyFeatures = () =>
  PRICING_FEATURES.filter((f) => !f.included);
