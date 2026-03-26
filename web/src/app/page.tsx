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
  Link2,
  Sparkles,
} from "lucide-react";
import { DemoButton } from "@/components/demo-button";

const APP_NAME = "KnowSomeone";

const steps = [
  {
    icon: Search,
    title: "Save a Job",
    description:
      "Find a role on our job board or paste a URL. KnowSomeone immediately starts working for you.",
  },
  {
    icon: Users,
    title: "Find Your Connection",
    description:
      "Search your alumni networks and LinkedIn. We surface who you know at the company so you're never starting cold.",
  },
  {
    icon: MessageSquare,
    title: "Reach Out",
    description:
      "Draft a personalized message using smart templates. We auto-fill your shared connections and background.",
  },
  {
    icon: Target,
    title: "Get Referred, Then Apply",
    description:
      "Track every conversation. Get nudged when follow-ups are due. Apply with a warm introduction behind you.",
  },
];

const features = [
  {
    icon: Link2,
    title: "Closed-Loop Tracking",
    description:
      "The connection between 'I messaged this person' and 'for this specific job' is maintained end-to-end. No other tool does this.",
  },
  {
    icon: Shield,
    title: "Referral-First Gating",
    description:
      "In referral mode, the apply button stays grayed out until you've reached out. A gentle nudge to try the warm route first.",
  },
  {
    icon: Zap,
    title: "Smart Message Drafting",
    description:
      "Templates that auto-fill with contact details and shared connections. Pro users get AI-powered rewrites.",
  },
  {
    icon: BarChart3,
    title: "Pipeline Intelligence",
    description:
      "Know exactly where every job stands. Action items, stalled outreach alerts, and follow-up reminders, all automatic.",
  },
  {
    icon: Users,
    title: "Contact Network",
    description:
      "Build a reusable network as you search. Contacts are linked to specific jobs so you always know who's helping where.",
  },
  {
    icon: Sparkles,
    title: "Strategy Modes",
    description:
      "Referral-first or speed-first: you choose. Configurable stalled thresholds let you set how patient you want to be.",
  },
];

const freeFeatures = [
  "Track up to 25 jobs",
  "Full referral workflow",
  "Message templates",
  "Pipeline dashboard",
  "Smart nudges & follow-ups",
];

const proFeatures = [
  "Unlimited jobs",
  "Full referral workflow",
  "Message templates",
  "Pipeline dashboard",
  "Smart nudges & follow-ups",
  "AI message drafting",
  "Job board search",
  "Advanced analytics",
  "Priority support",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-4">
          <Link href="/" className="text-lg sm:text-xl font-bold text-foreground">
            {APP_NAME}
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
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
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-16 sm:pb-24 pt-16 sm:pt-20 md:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-xs sm:text-sm font-medium uppercase tracking-widest text-accent">
            The referral-first job search platform
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-foreground md:leading-tight">
            In this market, it&apos;s not what you know.
            <br />
            <span className="text-accent">It&apos;s who you know.</span>
          </h1>
          <p className="mx-auto mt-4 sm:mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-muted px-2">
            Cold applications disappear into the void. Referrals get interviews.
            {" "}{APP_NAME} is the only job search tool that puts networking first, guiding you
            from &quot;I found a role&quot; to &quot;someone on the inside is vouching for me.&quot;
          </p>
          <div className="mt-8 sm:mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row w-full px-4 sm:px-0">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Start Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <DemoButton />
          </div>
          <p className="mt-4 text-xs text-muted">
            No credit card required. Free tier includes 25 jobs.
          </p>
        </div>
      </section>

      {/* Social proof / stat bar */}
      <section className="border-y border-border bg-surface/50 py-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-6 px-4 sm:px-6 sm:flex-row sm:gap-8 md:gap-16">
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-accent">5x</p>
            <p className="mt-1 text-xs text-muted">higher response rate with referrals vs. cold apply</p>
          </div>
          <div className="hidden sm:block h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-accent">70%</p>
            <p className="mt-1 text-xs text-muted">of jobs are filled through networking</p>
          </div>
          <div className="hidden sm:block h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-accent">10x</p>
            <p className="mt-1 text-xs text-muted">more likely to get hired with an internal referral</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="border-t border-border py-16 sm:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
              How {APP_NAME} works
            </h2>
            <p className="mt-4 text-sm sm:text-base text-muted">
              Four steps from "interested" to "referred."
            </p>
          </div>
          <div className="mt-12 sm:mt-16 grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Key differentiator callout */}
      <section className="border-t border-border bg-accent/5 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            The missing link in job search tools
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-muted leading-relaxed">
            Other trackers let you log that you applied somewhere. {APP_NAME} tracks
            the entire referral journey: who you messaged, for which job, what they
            said, and whether it turned into an actual referral. That closed loop is
            what makes the difference.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
              Built for the referral-first workflow
            </h2>
            <p className="mt-4 text-sm sm:text-base text-muted">
              Every feature is designed around one idea: talk to a person before
              you click "Apply."
            </p>
          </div>
          <div className="mt-12 sm:mt-16 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
      <section className="border-t border-border bg-surface py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
              Simple, fair pricing
            </h2>
            <p className="mt-4 text-sm sm:text-base text-muted">
              Start free. Upgrade when your search gets serious.
            </p>
          </div>
          <div className="mx-auto mt-12 sm:mt-16 grid max-w-4xl gap-6 sm:gap-8 grid-cols-1 md:grid-cols-3">
            {/* Free Tier */}
            <Card className="flex flex-col p-8">
              <CardHeader className="mb-6">
                <CardTitle className="text-xl">Free</CardTitle>
                <CardDescription className="mt-1">
                  Get started with the basics
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <p className="text-4xl font-bold text-foreground">
                  $0
                  <span className="text-base font-normal text-muted">
                    /forever
                  </span>
                </p>
                <ul className="mt-8 flex-1 space-y-3">
                  {freeFeatures.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-muted">
                      <Check className="h-4 w-4 shrink-0 text-success" />
                      {f}
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

            {/* Pro Monthly */}
            <Card className="relative flex flex-col border-accent p-8">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-semibold text-white">
                Most Popular
              </div>
              <CardHeader className="mb-6">
                <CardTitle className="text-xl">Pro Monthly</CardTitle>
                <CardDescription className="mt-1">
                  For active job searchers
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <p className="text-4xl font-bold text-foreground">
                  $12
                  <span className="text-base font-normal text-muted">
                    /month
                  </span>
                </p>
                <ul className="mt-8 flex-1 space-y-3">
                  {proFeatures.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-muted">
                      <Check className="h-4 w-4 shrink-0 text-success" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="mt-8 block">
                  <Button size="lg" className="w-full">
                    Start Free, Upgrade Anytime
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Pro Bundles */}
            <Card className="flex flex-col p-8">
              <CardHeader className="mb-6">
                <CardTitle className="text-xl">Pro Bundles</CardTitle>
                <CardDescription className="mt-1">
                  Save with a longer commitment
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <div className="space-y-4">
                  <div className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">3 months</span>
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                        Save 19%
                      </span>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                      $29
                      <span className="text-sm font-normal text-muted"> ($9.67/mo)</span>
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">6 months</span>
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                        Save 32%
                      </span>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                      $49
                      <span className="text-sm font-normal text-muted"> ($8.17/mo)</span>
                    </p>
                  </div>
                </div>
                <p className="mt-6 text-xs text-center text-muted">
                  All Pro features included. One-time payment, no auto-renewal.
                </p>
                <Link href="/register" className="mt-6 block">
                  <Button variant="secondary" size="lg" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
            Common questions
          </h2>
          <div className="mt-8 sm:mt-12 space-y-4 sm:space-y-6">
            {[
              {
                q: "How is this different from a spreadsheet?",
                a: "A spreadsheet tracks where you applied. KnowSomeone tracks who you talked to, what you said, and whether it turned into a referral. It connects outreach to specific jobs and nudges you when follow-ups are overdue.",
              },
              {
                q: "Do I need to know people at every company?",
                a: "No. KnowSomeone helps you find connections through your alumni networks and LinkedIn. You'd be surprised how many second-degree connections you have at companies you're interested in.",
              },
              {
                q: "What if I want to just apply quickly?",
                a: "Switch to Speed-first mode. It loosens the referral gating so you can apply immediately while still tracking outreach in the background.",
              },
              {
                q: "Is my data private?",
                a: "Yes. Your job search data is stored securely and never shared with employers, recruiters, or other users. You can export or delete everything at any time.",
              },
              {
                q: "What do I get with the free tier?",
                a: "Track up to 25 jobs, the full referral workflow, message templates, pipeline dashboard, and smart nudges. No credit card required, no time limit.",
              },
            ].map((faq) => (
              <details
                key={faq.q}
                className="group rounded-lg border border-border bg-surface/50 px-6 py-4"
              >
                <summary className="flex cursor-pointer items-center justify-between text-base font-medium text-foreground">
                  {faq.q}
                  <span className="ml-4 text-muted transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
            Your next job starts with someone you know
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-muted leading-relaxed">
            Stop sending applications into the void. Start building the connections that actually get you hired.
          </p>
          <div className="mt-8 sm:mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row w-full px-4 sm:px-0">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Get Started (It&apos;s Free)
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <DemoButton />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 sm:py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:px-6 text-xs sm:text-sm text-muted sm:flex-row">
          <p>
            &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
          <div className="flex gap-4 sm:gap-6">
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
