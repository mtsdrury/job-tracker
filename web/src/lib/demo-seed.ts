// Seed data for the demo account.
// This creates a realistic job search pipeline so visitors can explore the app.

export const DEMO_EMAIL_DOMAIN = "demo.jobtracker.dev";
export const DEMO_NAME = "Demo User";

export function generateDemoCredentials() {
  const id = Math.random().toString(36).slice(2, 10);
  return {
    email: `demo-${id}@${DEMO_EMAIL_DOMAIN}`,
    password: `demo-${id}-${Date.now()}`,
  };
}

export interface SeedJob {
  title: string;
  company: string;
  location: string;
  url: string;
  applied: boolean;
  appliedAt?: string;
  interviewStage?: string;
  nextAction: string;
  notes?: string;
  resumeVersion?: string;
  datePosted?: string;
  contacts?: SeedContact[];
}

export interface SeedContact {
  name: string;
  title: string;
  company: string;
  linkedinUrl: string;
  connectionType: string;
  school?: string;
  outreachStatus: string;
  outreachPlatform?: string;
  daysAgo?: number;
}

export const seedSchools = [
  { name: "Georgia Tech", linkedin_id: "3558", status: "Student" },
  { name: "UCLA", linkedin_id: "17882", status: "Alum" },
];

export const seedResumeVersions = [
  "Data Scientist",
  "ML Engineer",
  "Research Engineer",
];

export const seedTemplates = [
  {
    name: "Alumni Intro",
    body: "Hi {first_name},\n\nI am a fellow {connection} and noticed you work at {company}. I am currently looking for roles in {role} and would love to hear about your experience there.\n\nWould you have 15 minutes for a quick chat?\n\nBest,\nDemo User",
    category: "initial_outreach" as const,
  },
  {
    name: "Follow-up",
    body: "Hi {first_name},\n\nJust following up on my previous message. I am still very interested in the {role} position at {company} and would appreciate any insight you could share.\n\nThanks,\nDemo User",
    category: "follow_up" as const,
  },
];

export const seedJobs: SeedJob[] = [
  {
    title: "ML Engineer",
    company: "Spotify",
    location: "Los Angeles, CA",
    url: "https://jobs.lever.co/spotify/example-1",
    applied: false,
    nextAction: "Message referral",
    resumeVersion: "ML Engineer",
    datePosted: daysAgoISO(3),
    contacts: [
      {
        name: "Sarah Chen",
        title: "Senior ML Engineer",
        company: "Spotify",
        linkedinUrl: "https://linkedin.com/in/example-sarah",
        connectionType: "alumni",
        school: "Georgia Tech",
        outreachStatus: "message_sent",
        outreachPlatform: "linkedin",
        daysAgo: 2,
      },
    ],
  },
  {
    title: "Data Scientist",
    company: "Netflix",
    location: "Los Angeles, CA",
    url: "https://jobs.lever.co/netflix/example-2",
    applied: true,
    appliedAt: daysAgoISO(5),
    nextAction: "Follow up",
    resumeVersion: "Data Scientist",
    datePosted: daysAgoISO(12),
    notes: "Applied with referral from James. Strong match for content algorithms team.",
    contacts: [
      {
        name: "James Park",
        title: "Data Scientist II",
        company: "Netflix",
        linkedinUrl: "https://linkedin.com/in/example-james",
        connectionType: "alumni",
        school: "UCLA",
        outreachStatus: "referral_submitted",
        outreachPlatform: "linkedin",
        daysAgo: 8,
      },
    ],
  },
  {
    title: "Research Scientist Intern",
    company: "Google DeepMind",
    location: "Mountain View, CA",
    url: "https://careers.google.com/example-3",
    applied: false,
    nextAction: "Find referral",
    resumeVersion: "Research Engineer",
    datePosted: daysAgoISO(1),
  },
  {
    title: "Applied Scientist",
    company: "Amazon",
    location: "Seattle, WA",
    url: "https://amazon.jobs/example-4",
    applied: true,
    appliedAt: daysAgoISO(14),
    interviewStage: "interviewing",
    nextAction: "Prepare for interview",
    resumeVersion: "ML Engineer",
    datePosted: daysAgoISO(21),
    notes: "Phone screen completed. Technical round scheduled for next week.",
    contacts: [
      {
        name: "Maria Garcia",
        title: "Applied Scientist II",
        company: "Amazon",
        linkedinUrl: "https://linkedin.com/in/example-maria",
        connectionType: "alumni",
        school: "Georgia Tech",
        outreachStatus: "sharing_internally",
        outreachPlatform: "email",
        daysAgo: 16,
      },
    ],
  },
  {
    title: "ML Platform Engineer",
    company: "Stripe",
    location: "San Francisco, CA (Remote OK)",
    url: "https://stripe.com/jobs/example-5",
    applied: false,
    nextAction: "Find referral",
    resumeVersion: "ML Engineer",
    datePosted: daysAgoISO(2),
    notes: "Strong Python/infra focus. Good match for ML builder resume.",
  },
  {
    title: "Data Scientist, Growth",
    company: "Airbnb",
    location: "San Francisco, CA",
    url: "https://careers.airbnb.com/example-6",
    applied: true,
    appliedAt: daysAgoISO(21),
    interviewStage: "rejected",
    nextAction: "",
    resumeVersion: "Data Scientist",
    datePosted: daysAgoISO(30),
  },
  {
    title: "Senior Data Analyst",
    company: "Riot Games",
    location: "Los Angeles, CA",
    url: "https://riotgames.com/careers/example-7",
    applied: false,
    nextAction: "Message referral",
    resumeVersion: "Data Scientist",
    datePosted: daysAgoISO(4),
    contacts: [
      {
        name: "Kevin Liu",
        title: "Data Analyst",
        company: "Riot Games",
        linkedinUrl: "https://linkedin.com/in/example-kevin",
        connectionType: "alumni",
        school: "UCLA",
        outreachStatus: "identified",
        daysAgo: 0,
      },
    ],
  },
  {
    title: "Machine Learning Engineer",
    company: "Hulu",
    location: "Santa Monica, CA",
    url: "https://hulu.com/careers/example-8",
    applied: false,
    nextAction: "Write cover letter",
    resumeVersion: "ML Engineer",
    datePosted: daysAgoISO(6),
    contacts: [
      {
        name: "Priya Sharma",
        title: "Engineering Manager",
        company: "Hulu",
        linkedinUrl: "https://linkedin.com/in/example-priya",
        connectionType: "linkedin_1st",
        outreachStatus: "responded",
        outreachPlatform: "linkedin",
        daysAgo: 3,
      },
    ],
  },
];

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}
