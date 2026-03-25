"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";

const plans = [
  {
    name: "Monthly",
    price: "$12",
    period: "per month",
    priceEnvKey: "monthly",
    savings: null,
    features: [
      "Unlimited job tracking",
      "AI-powered message drafting",
      "Full referral workflow",
      "Smart nudges & follow-up reminders",
      "Job board search",
    ],
  },
  {
    name: "Quarterly",
    price: "$29",
    period: "every 3 months",
    priceEnvKey: "quarterly",
    savings: "Save 19%",
    highlighted: true,
    features: [
      "Everything in Monthly",
      "~$9.67/month",
      "Best for active job searches",
    ],
  },
  {
    name: "Semi-Annual",
    price: "$49",
    period: "every 6 months",
    priceEnvKey: "semiannual",
    savings: "Save 32%",
    features: [
      "Everything in Monthly",
      "~$8.17/month",
      "Best value for extended searches",
    ],
  },
];

export default function BillingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [priceIds, setPriceIds] = useState<Record<string, string>>({});

  useEffect(() => {
    // Check for successful checkout redirect
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (sessionId) {
      setActiveSessionId(sessionId);
      window.history.replaceState({}, document.title, "/billing");
    }

    // Fetch price IDs from server
    fetch("/api/stripe/prices")
      .then((res) => res.json())
      .then((data) => setPriceIds(data))
      .catch(console.error);
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="text-center py-12">
        <p className="text-muted mb-4">
          Please sign in to manage your billing.
        </p>
        <Link href="/login">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  const isDemo = session?.user?.isDemo === true;
  const billingStatus = session?.user?.billingStatus;
  const isPro = billingStatus === "pro";

  const handleCheckout = async (priceEnvKey: string) => {
    if (isDemo) {
      router.push("/register");
      return;
    }

    const priceId = priceIds[priceEnvKey];
    if (!priceId) return;

    setLoading(priceEnvKey);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Checkout error:", error);
        return;
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setLoading(null);
    }
  };

  const handleManagePortal = async () => {
    setLoading("portal");
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Portal error:", error);
        return;
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Portal error:", error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Billing & Plans</h1>
        <p className="text-muted">
          Manage your subscription and upgrade your plan.
        </p>
      </div>

      {/* Success Message */}
      {activeSessionId && (
        <Card className="border-success/20 bg-success/5">
          <CardContent className="pt-6">
            <p className="text-success">
              Thank you for upgrading to Pro! Your subscription is now active.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Current Plan Status */}
      {!isDemo && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Current Plan</p>
                <p className="text-xl font-semibold capitalize">
                  {isPro ? "Pro" : "Free"}
                </p>
              </div>
              {isPro && (
                <Button
                  onClick={handleManagePortal}
                  disabled={loading === "portal"}
                >
                  {loading === "portal" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    "Manage Subscription"
                  )}
                </Button>
              )}
            </div>

            {!isPro && (
              <p className="text-sm text-muted mt-4">
                You&apos;re on the free plan with a limit of 25 jobs and
                template-based messaging. Upgrade to Pro for unlimited jobs and
                AI-powered message drafting.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pricing Plans */}
      {!isPro && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Upgrade to Pro</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={
                  plan.highlighted ? "ring-2 ring-accent relative" : ""
                }
              >
                {plan.highlighted && (
                  <div className="absolute top-0 right-0">
                    <Badge className="rounded-none rounded-bl-lg bg-accent text-white border-0">
                      Popular
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="mb-2">{plan.name}</CardTitle>
                  <div className="space-y-1">
                    <div className="text-3xl font-bold">{plan.price}</div>
                    <p className="text-sm text-muted">{plan.period}</p>
                    {plan.savings && (
                      <Badge variant="success">{plan.savings}</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {isDemo ? (
                    <Button
                      className="w-full"
                      onClick={() => handleCheckout(plan.priceEnvKey)}
                    >
                      Sign Up to Upgrade
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleCheckout(plan.priceEnvKey)}
                      disabled={loading !== null}
                    >
                      {loading === plan.priceEnvKey ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        "Upgrade Now"
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Free Plan Features */}
      {!isPro && !isDemo && (
        <Card>
          <CardHeader>
            <CardTitle>What&apos;s included in Free</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                "Up to 25 jobs",
                "Template-based messaging",
                "Referral tracking",
                "Contact management",
                "Onboarding wizard",
                "Basic nudges",
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-muted mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-muted">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Demo User Message */}
      {isDemo && (
        <Card className="bg-accent/5 border-accent/20">
          <CardContent className="pt-6">
            <p className="text-sm mb-4">
              You&apos;re currently using the demo account. Sign up for a
              personal account to access billing and upgrade to Pro.
            </p>
            <Link href="/register">
              <Button>Create an Account</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
