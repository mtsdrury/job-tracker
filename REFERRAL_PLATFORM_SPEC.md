# Referral-First Job Search Platform — Implementation Spec

## Context for Claude Code

MacKenzie has a working desktop job tracker app (Python/tkinter with ttkbootstrap dark theme, CSV-backed, CLI + GUI). She wants to evolve this into a **web-based referral-first job search platform** — not just a tracker, but a full job search operating system with an integrated job board, AI-guided networking workflow, and multi-step referral tracking.

This document explains the current state, the north star vision, and what needs to change. Your job is the technical implementation. Read the whole thing before writing any code.

---

## What Exists Now

### Architecture
- **Desktop app**: Python/tkinter with ttkbootstrap (dark theme)
- **Data store**: Single CSV file (no database, no accounts, fully portable)
- **Config**: JSON file next to CSV — stores user's schools, resume versions, networking connections, outreach message templates, job search strategy preference
- **Setup wizard**: First-launch onboarding that walks user through configuring all of the above
- **AI chat**: Embedded Claude Haiku chat that can read and modify the tracker through natural language
- **CLI**: Full command-line interface alongside the GUI

### Current Workflow
1. User adds a job (company, role, URL, etc.)
2. Detail tab shows a step-by-step pipeline: Job Added → Find Referral → Draft Message → Pick Resume → Done
3. Action cards guide user through each step (e.g., "Draft Message" opens a popup, then asks "Did you send it?")
4. PipelineMixin handles the wizard flow, isolated from detail/actions code
5. User can choose between "referral-first" mode (gates applying until networking steps done) or "speed-first" mode (apply immediately, networking optional)
6. Statuses track multi-step progress: not just "applied/interviewing/offer" but the full referral cultivation lifecycle
7. Resume version control — user has multiple resume variants (e.g., Data Scientist, ML Builder, Research Engineer) and selects which to use per application
8. Smart nudges and warnings when outreach goes stale or steps are skipped

### What's Good About It
- The referral-first philosophy and multi-step workflow are the core IP. Preserve this.
- The strategy toggle (referral-first vs. speed-first) is a great UX concept. Keep it.
- The setup wizard concept (schools, resumes, templates, strategy) translates directly to web onboarding.
- The AI chat that can read/modify the tracker is differentiated. Evolve it from chat sidebar to embedded workflow AI.

---

## North Star: What We're Building

A **web application** that is a referral-first job search platform for white-collar professionals. It has:

1. **Integrated job board** — Real listings from external APIs, not just user-entered jobs
2. **AI-guided referral workflow** — For each job, the AI proactively surfaces who to reach out to and drafts messages
3. **Closed-loop tracking** — The connection between "I messaged this person" and "for this specific job" is maintained end-to-end
4. **Resume & cover letter management** — Multiple versions, AI suggestions for which to use per role
5. **Configurable strategy** — User sets preferences that control how aggressive the workflow guidance is
6. **Freemium billing** — Free tier for basic tracking, paid tier for AI features and full workflow

### The Core User Flow

```
DISCOVER → RESEARCH → REACH OUT → TRACK RELATIONSHIP → APPLY → FOLLOW UP
```

**Step 1 — Discover:**
User browses the integrated job board. Filters by role, location, remote, salary, etc. Jobs come from external aggregator APIs. User can also manually add a job URL.

**Step 2 — Research:**
When a user saves a job, the platform immediately:
- Shows company info (size, industry, etc. — from the API data)
- Surfaces potential connections: alumni from user's configured schools who work there, 2nd-degree LinkedIn connections (if we can get that data), people in relevant roles
- This is where the AI adds the most value. The connection surfacing should feel automatic, not like a separate step the user has to initiate.

**Step 3 — Reach Out:**
For each potential connection, the AI drafts a personalized outreach message based on:
- The user's background (from their config/profile)
- The contact's apparent role and background
- The specific job posting
- The user's configured message templates as a style baseline

User reviews, edits, and sends (via LinkedIn DM, email, etc. — we don't send for them, we draft and they copy/paste or send externally).

**Step 4 — Track the Relationship:**
Each outreach has a status lifecycle:
```
IDENTIFIED → MESSAGE_DRAFTED → MESSAGE_SENT → RESPONDED → CALL_SCHEDULED → CALL_COMPLETED → REFERRAL_REQUESTED → REFERRAL_SECURED → REFERRAL_SUBMITTED
```
Not every outreach goes through all steps. The user updates status as things progress. The platform nudges when things go stale ("You messaged Sarah 5 days ago and haven't heard back — want to draft a follow-up?").

**The critical thing**: each outreach/contact is **linked to a specific job**. This is what Jobright gets wrong. When the user looks at a job, they see all their networking activity for that job. When they look at a contact, they see which jobs that contact is associated with.

**Step 5 — Apply:**
In referral-first mode, the "Apply" action is gated until at least one referral step is completed (configurable — could require referral secured, or just message sent, depending on user's strategy setting).

When applying:
- Platform suggests which resume version to use based on the job description keywords vs. resume content
- AI generates a tailored cover letter draft
- User selects resume version, edits cover letter, marks as applied
- Application is linked to any referral contacts for this job

In speed-first mode, user can apply immediately but the platform still surfaces networking opportunities and gently nudges.

**Step 6 — Follow Up:**
Post-application tracking through standard stages (Applied → Phone Screen → Technical → Onsite → Offer → Accepted/Rejected). Referral contacts remain linked so user knows who to update or thank.

---

## Technical Implementation Plan

### Stack Recommendation

**Frontend:** Next.js (React) with Tailwind CSS
- Why: SSR for SEO (landing page matters for organic growth), React ecosystem for complex UI state, Tailwind for rapid styling
- Dark theme by default (matches the existing app's aesthetic)

**Backend:** Next.js API routes OR separate FastAPI backend
- If MacKenzie is more comfortable with Python, a FastAPI backend behind a Next.js frontend is fine
- If she wants a unified stack, Next.js API routes + Prisma ORM work well
- Either way, the backend needs to handle: auth, job data, user profiles, AI calls, billing

**Database:** PostgreSQL
- The CSV-backed approach doesn't work for web. Postgres via Supabase or Railway for managed hosting.
- Schema needs to support: users, jobs, contacts, outreach_events, applications, resume_versions, message_templates

**AI:** Anthropic API (Claude Haiku for most features, Sonnet for complex analysis)
- Outreach message drafting → Haiku (fast, cheap, good enough for messages)
- Resume-to-job matching / cover letter generation → Haiku
- Pipeline coaching ("here's what to focus on today") → Haiku
- All AI calls gated behind paid tier

**Job Board API:** Start with one of these:
- Arbeitnow (free tier available, pulls from major ATS systems)
- RapidAPI JSearch (aggregates LinkedIn, Indeed, Glassdoor — ~$50-100/mo)
- TheirStack (premium, very detailed data including company info)
- Google Jobs API (free, scrapes structured job data)
- Can start with one and add more later. The job data should be normalized into a consistent internal format regardless of source.

**Auth:** NextAuth.js or Supabase Auth
- Email/password + OAuth (Google, GitHub)
- Free tier users and paid users share the same auth, billing status is a flag on the user record

**Billing:** Stripe
- Free tier: no payment method required
- Pro tier: $12/month or $29/3 months or $49/6 months
- Stripe Checkout for subscription management
- Webhook to update user's billing status in DB

**Hosting:** Vercel (frontend) + Railway or Fly.io (backend/DB)
- Or all-in-one on Railway if using Next.js fullstack

### Database Schema (Core Tables)

```sql
-- Users
users (
  id, email, name, created_at,
  billing_status ENUM('free', 'pro'),
  stripe_customer_id,
  strategy_mode ENUM('referral_first', 'speed_first'),
  -- onboarding config stored as JSONB:
  config JSONB  -- { schools: [...], linkedin_url, default_templates: {...}, ... }
)

-- Resume versions
resume_versions (
  id, user_id, name, -- e.g. "ML Engineer", "Data Scientist"
  content TEXT,       -- could be plain text, markdown, or file reference
  file_url,           -- if uploaded as PDF
  keywords JSONB,     -- extracted keywords for matching
  is_default BOOLEAN,
  created_at, updated_at
)

-- Jobs (from API or manually added)
jobs (
  id, user_id,
  title, company, location, remote_type,
  salary_min, salary_max, salary_currency,
  description TEXT,
  url,                          -- original posting URL
  source,                       -- 'api:jsearch', 'api:arbeitnow', 'manual'
  external_id,                  -- ID from the API for deduplication
  keywords JSONB,               -- extracted from description
  status ENUM('saved', 'networking', 'ready_to_apply', 'applied',
              'phone_screen', 'technical', 'onsite', 'offer',
              'accepted', 'rejected', 'withdrawn', 'archived'),
  strategy_override,            -- user can override their default strategy per job
  resume_version_id,            -- which resume they used/plan to use
  cover_letter TEXT,
  applied_at, created_at, updated_at,
  excitement_rating INTEGER,    -- 1-5, user rates how excited they are
  notes TEXT
)

-- Contacts (people the user is networking with)
contacts (
  id, user_id,
  name, title, company,
  linkedin_url, email,
  connection_type ENUM('alumni', 'mutual_connection', 'cold', 'recruiter', 'other'),
  school,                       -- if alumni, which school
  notes TEXT,
  created_at
)

-- Outreach Events (the link between a job and a contact)
outreach_events (
  id, user_id,
  job_id,                       -- FK to jobs
  contact_id,                   -- FK to contacts
  status ENUM('identified', 'message_drafted', 'message_sent',
              'responded', 'call_scheduled', 'call_completed',
              'referral_requested', 'referral_secured', 'referral_submitted',
              'no_response', 'declined'),
  message_draft TEXT,           -- AI-generated or user-written message
  message_final TEXT,           -- what they actually sent (if different)
  platform ENUM('linkedin', 'email', 'other'),
  last_action_at,               -- for stale detection
  follow_up_at,                 -- scheduled follow-up date
  notes TEXT,
  created_at, updated_at
)

-- Message Templates (user-configured outreach templates)
message_templates (
  id, user_id,
  name,                         -- e.g. "Alumni cold outreach", "Recruiter follow-up"
  template TEXT,                 -- with {{placeholders}} for AI to fill
  category ENUM('initial_outreach', 'follow_up', 'thank_you', 'referral_request'),
  created_at
)
```

### Key Implementation Details

#### Job Board Integration

Create a job service that normalizes data from multiple API sources:

```
/services/jobs/
  provider.ts          -- abstract interface for job providers
  jsearch.ts           -- RapidAPI JSearch implementation
  arbeitnow.ts         -- Arbeitnow implementation
  normalizer.ts        -- maps provider-specific fields to internal Job format
  search.ts            -- unified search across providers with caching
```

Jobs from the API are NOT stored in the database until a user saves them. The search results page shows API results directly. When a user clicks "Save" or "Start Networking," the job gets persisted to their `jobs` table.

Cache API results aggressively (Redis or in-memory with TTL) to avoid hitting rate limits and reduce costs. A search for "machine learning engineer in Los Angeles" doesn't need to hit the API every time — cache for 1-6 hours.

#### AI Integration

Create an AI service that handles all Claude API calls:

```
/services/ai/
  client.ts            -- Anthropic SDK wrapper with error handling and rate limiting
  outreach.ts          -- drafts outreach messages given user profile + contact + job
  connections.ts       -- suggests potential connections at a company (see below)
  cover-letter.ts      -- generates cover letters given resume + job description
  resume-match.ts      -- scores resume versions against a job description
  coaching.ts          -- generates daily "here's what to focus on" based on pipeline state
  nudges.ts            -- generates stale-outreach follow-up suggestions
```

**Connection surfacing** is the hardest AI feature. For MVP, this works by:
1. User configures their schools in onboarding
2. When they save a job, the system searches LinkedIn (via an API or manual prompt) for alumni at that company
3. MVP approach: the AI constructs a LinkedIn search URL for the user to click (`site:linkedin.com/in "{school}" "{company}"`) and the user manually identifies contacts and adds them
4. Future approach: integrate with a people data API (like Coresignal, Apollo, or Proxycurl) to programmatically find alumni. This is expensive and complex — do it later.

For MVP, the AI's main job is **drafting messages** and **suggesting actions**, not finding people. Finding people can be semi-manual with AI-constructed search queries.

#### The Referral Gating Logic

This is the core product logic. In the jobs detail view:

```
if user.strategy_mode == 'referral_first' AND job.strategy_override != 'speed':
    if no outreach_events exist for this job with status >= 'message_sent':
        show "Apply" button as disabled/grayed
        show prompt: "Find a connection first — it increases your chances 5x"
        show "Override and apply anyway" as a small text link (not a button)
    else:
        show "Apply" button as enabled
else:
    show "Apply" button always enabled
    show networking opportunities as a suggestion panel, not a gate
```

The gating should feel like guidance, not punishment. The override is always available. The goal is to make the user pause and think "actually, let me try to find someone first" — not to trap them.

#### Nudge System

A background job (cron or triggered on login) checks:
- Outreach events with status `message_sent` and `last_action_at` > 5 days ago → suggest follow-up
- Jobs saved > 7 days ago with no outreach events → suggest finding connections
- Jobs with referral secured but not yet applied → prompt to apply
- Jobs applied > 14 days ago with no status update → suggest following up with recruiter

Nudges show as a banner or card on the dashboard. Not email (for now). Keep it in-app.

#### Dashboard (Home Screen)

When the user logs in, they see:
1. **Pipeline summary**: X jobs saved, Y in networking, Z applied, W interviewing
2. **Today's actions**: AI-generated list of 3-5 things to do today based on pipeline state (e.g., "Follow up with Sarah at Google — it's been 5 days", "You saved 3 jobs last week but haven't reached out to anyone — pick one to start networking")
3. **Recent activity**: last 5 things they did
4. **Stale items**: any jobs or outreach that need attention

#### Onboarding Wizard (Web Version)

Translates directly from the existing setup wizard:
1. **Profile**: Name, email, LinkedIn URL
2. **Schools**: Add schools (these are used for alumni connection surfacing)
3. **Resume versions**: Upload or paste 1+ resume versions, name each one (e.g., "ML Engineer", "Data Scientist")
4. **Strategy**: Choose referral-first or speed-first, with an explanation of each
5. **Templates** (optional): Customize outreach message templates or use defaults

This should feel quick — 3-5 minutes max. Everything is editable later in settings.

---

## Migration Path: Desktop → Web

The desktop app (Python/tkinter) and the web app are **separate products** sharing the same philosophy. You are NOT porting the tkinter code to the web. You are building a new web app that implements the same workflow.

However:
- The CSV format should be importable. Users of the desktop app should be able to upload their CSV and have jobs imported into the web app.
- The JSON config should map to the web onboarding. If someone has a config from the desktop app, the web app should be able to read it and pre-fill their profile.

The desktop app stays open-source. The web app is the freemium product.

---

## What to Build First (MVP Scope)

Phase 1 — the minimum viable product that someone could actually pay for:

1. **Auth + onboarding wizard** (profile, schools, resume upload, strategy choice)
2. **Job board search** (one API provider, search + filter, save jobs)
3. **Job detail view** with referral workflow (add contacts manually, draft outreach with AI, track outreach status)
4. **Referral gating** (referral-first mode gates the apply button)
5. **Application tracking** (mark as applied, select resume version, basic status progression)
6. **Dashboard** with pipeline summary and nudges
7. **Stripe billing** (free tier limited to 10 saved jobs + no AI; pro unlocks unlimited + AI)
8. **Landing page** explaining the referral-first philosophy with signup CTA

What is NOT in MVP:
- Cover letter generation (Phase 2)
- Chrome extension (Phase 2)
- Automated connection surfacing via people data APIs (Phase 2 — MVP uses AI-constructed LinkedIn search URLs)
- Analytics dashboard (Phase 2)
- CSV import from desktop app (Phase 2)
- Community features (Phase 3)
- Mobile app (Phase 3)

---

## Naming

The app needs a name that communicates "referral-first job search" in a way that sounds like a modern job board/platform, not a spreadsheet tool. The current working name "Job Tracker" undersells what this is. MacKenzie should decide on the final name, but the architecture should make renaming easy (one config file for brand name, not hardcoded everywhere).

---

## Summary for Claude Code

You're building a Next.js web app (or FastAPI + Next.js if MacKenzie prefers Python backend) that:

1. Lets users search real job listings from an API
2. Guides them through a referral-first workflow for each job: find connections → draft outreach → track responses → apply
3. Uses Claude Haiku to draft personalized outreach messages and suggest actions
4. Gates the "Apply" button behind networking steps (configurable)
5. Tracks the full lifecycle from discovery to offer
6. Has freemium billing via Stripe
7. Looks clean and modern with a dark theme

The core differentiator is the **closed-loop referral tracking** — the link between "I messaged this person" and "for this specific job" is never broken. Every other tool drops this connection. Don't drop it.

Start with the database schema and auth, then the job board integration, then the referral workflow UI. The AI features can be stubbed initially and filled in once the workflow is solid.
