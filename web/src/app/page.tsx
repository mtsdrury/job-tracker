import Link from "next/link";
import { clsx } from "clsx";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Search,
  Users,
  MessageSquare,
  Target,
  Zap,
  Shield,
  BarChart3,
  ArrowRight,
  Check,
  X,
  Play,
} from "lucide-react";
import { DemoButton } from "@/components/demo-button";

const APP_NAME = "Job Tracker";

const steps = [
  {
    icon: Search,
    title: "Search Jobs",
    description:
      "Add roles you are interested in. Paste a URL or enter details manually.",
  },
  {
    icon: Users,
    title: "Find Connections",
    description:
      "Search your alumni networks and LinkedIn to find people at the company.",
  },
  {
    icon: MessageSquare,
    title: "Draft Outreach",
    description:
      "Use customizable templates to draft personalized referral messages. Adapts to your tone and network.",
  },
  {
    icon: Target,
    title: "Track & Apply",
    description:
      "Monitor referral progress, get nudges when follow-ups are due, then apply with confidence.",
  },
];

const features = [
  {
    icon: Zap,
    title: "Template-Based Drafting",
    description:
      "Customize message templates that auto-fill with contact details and shared connections.",
  },
  {
    icon: Shield,
    title: "Referral Gating",
    description:
      "The app nudges you to exhaust referral options before submitting a cold application.",
  },
  {
    icon: BarChart3,
    title: "Pipeline Analytics",
    description:
      "See where your applications stand at a glance. Track conversion rates across strategies.",
  },
  {
    icon: Users,
    title: "Multi-Resume Management",
    description:
      "Tag each application with the resume variant you used. Know what works for which roles.",
  },
  {
    icon: MessageSquare,
    title: "Smart Nudges",
    description:
      "Get reminders when referrals go quiet. Configurable stalled thresholds keep you moving.",
  },
  {
    icon: Target,
    title: "Kanban & List Views",
    description:
      "Drag jobs between status columns or browse a filterable list. Your workflow, your way.",
  },
];

interface PricingFeature {
  free: string;
  pro: string;
  proOnly: boolean;
}

const pricingFeatures: PricingFeature[] = [
  { free: "Track up to 25 jobs", pro: "Unlimited jobs", proOnly: false },
  { free: "Full referral workflow", pro: "Full referral workflow", proOnly: false },
  { free: "Message templates", pro: "Message templates", proOnly: false },
  { free: "Pipeline dashboard", pro: "Pipeline dashboard", proOnly: false },
  { free: "Smart nudges", pro: "Smart nudges", proOnly: false },
  { free: "Job board search", pro: "Job board search", proOnly: true },
  { free: "AI message drafting", pro: "AI message drafting", proOnly: true },
  { free: "AI cover letters", pro: "AI cover letters", proOnly: true },
  { free: "Advanced analytics", pro: "Advanced analytics", proOnly: true },
  { free: "Priority support", pro: "Priority support", proOnly: true },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold text-foreground">
            {APP_NAME}
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="primary" size="sm">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-20 md:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-accent">
            Referral-first job search
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl md:leading-tight">
            Stop applying into the void.
            <br />
            <span className="text-accent">Get referred instead.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Cold applications get ignored. In this market, you need someone on
            the inside. {APP_NAME} puts referral outreach at the center of your
            job search, not as an afterthought.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Get Started - Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <DemoButton />
            <a href="#how-it-works">
              <Button variant="secondary" size="lg">
                Learn More
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="border-t border-border bg-surface py-24"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-muted">
              Four steps from &quot;interested&quot; to &quot;referred.&quot;
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <step.icon className="h-7 w-7" />
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted">
                  Step {i + 1}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              Built for the referral-first workflow
            </h2>
            <p className="mt-4 text-muted">
              Every feature is designed around one idea: talk to a person before
              you click &quot;Apply.&quot;
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-border bg-surface py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              Simple pricing
            </h2>
            <p className="mt-4 text-muted">
              Start free. Upgrade when you need more.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-3xl gap-8 md:grid-cols-2">
            {/* Free Tier */}
            <Card className="flex flex-col p-8">
              <CardHeader className="mb-6">
                <CardTitle className="text-xl">Free</CardTitle>
                <CardDescription className="mt-1">
                  Everything you need to get started
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <p className="text-4xl font-bold text-foreground">
                  $0
                  <span className="text-base font-normal text-muted">
                    /month
                  </span>
                </p>
                <ul className="mt-8 flex-1 space-y-3">
                  {pricingFeatures.map((f) => (
                    <li
                      key={f.free}
                      className={clsx(
                        "flex items-center gap-3 text-sm",
                        f.proOnly ? "text-muted opacity-40" : "text-muted"
                      )}
                    >
                      {f.proOnly ? (
                        <X className="h-4 w-4 shrink-0 text-danger" />
                      ) : (
                        <Check className="h-4 w-4 shrink-0 text-success" />
                      )}
                      <span className={f.proOnly ? "line-through" : ""}>
                        {f.free}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="mt-8 block">
                  <Button variant="secondary" size="lg" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Pro Tier */}
            <Card className="relative flex flex-col border-accent p-8">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-semibold text-white">
                Popular
              </div>
              <CardHeader className="mb-6">
                <CardTitle className="text-xl">Pro</CardTitle>
                <CardDescription className="mt-1">
                  For serious job searchers
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <p className="text-4xl font-bold text-foreground">
                  $15
                  <span className="text-base font-normal text-muted">
                    /month
                  </span>
                </p>
                <ul className="mt-8 flex-1 space-y-3">
                  {pricingFeatures.map((f) => (
                    <li
                      key={f.pro}
                      className="flex items-center gap-3 text-sm text-muted"
                    >
                      <Check className="h-4 w-4 shrink-0 text-success" />
                      {f.pro}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="mt-8 block">
                  <Button size="lg" className="w-full">
                    Upgrade to Pro
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted sm:flex-row">
          <p>
            &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
