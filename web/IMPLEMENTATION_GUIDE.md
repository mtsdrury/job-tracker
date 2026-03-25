# Referral-First Job Search Platform: Vision & Implementation Guide

This document is the single source of truth for the web app. It combines the high-level product vision with the technical implementation status and remaining work.

---

# Part 1: Vision & Design

## What We're Building

A web application that is a referral-first job search platform for white-collar professionals. Not just a tracker; a full job search operating system with an integrated job board, guided networking workflow, and multi-step referral tracking.

What makes it different:

1. **Integrated job board** - Real listings from external APIs, not just user-entered jobs
2. **Guided referral workflow** - For each job, the platform surfaces who to reach out to and helps draft messages
3. **Closed-loop tracking** - The connection between "I messaged this person" and "for this specific job" is maintained end-to-end. Every other tool drops this connection. We do not.
4. **Resume & cover letter management** - Multiple versions, suggestions for which to use per role
5. **Configurable strategy** - User sets preferences that control how aggressive the workflow guidance is
6. **Freemium billing** - Free tier for basic tracking, paid tier for AI features and full workflow

## The Core User Flow

```
DISCOVER -> RESEARCH -> REACH OUT -> TRACK RELATIONSHIP -> APPLY -> FOLLOW UP
```

**Step 1, Discover:**
User browses the integrated job board. Filters by role, location, remote, salary, etc. Jobs come from external aggregator APIs. User can also manually add a job URL.

**Step 2, Research:**
When a user saves a job, the platform immediately:
- Shows company info (size, industry, etc., from the API data)
- Surfaces potential connections: alumni from user's configured schools who work there, people in relevant roles
- Connection surfacing should feel automatic, not like a separate step the user has to initiate

For MVP, the system constructs LinkedIn search URLs for the user to click. The user manually identifies contacts and adds them. Future versions will integrate with people data APIs (Coresignal, Apollo, Proxycurl) to do this programmatically.

**Step 3, Reach Out:**
For each potential connection, the user drafts a personalized outreach message based on:
- The user's background (from their config/profile)
- The contact's apparent role and background
- The specific job posting
- The user's configured message templates as a style baseline

User reviews, edits, and sends externally (via LinkedIn DM, email, etc.). We draft; they send.

**Step 4, Track the Relationship:**
Each outreach has a status lifecycle:
```
IDENTIFIED -> MESSAGE_DRAFTED -> MESSAGE_SENT -> RESPONDED -> CALL_SCHEDULED -> CALL_COMPLETED -> REFERRAL_REQUESTED -> REFERRAL_SECURED -> REFERRAL_SUBMITTED
```
Not every outreach goes through all steps. The user updates status as things progress. The platform nudges when things go stale ("You messaged Sarah 5 days ago and haven't heard back, want to draft a follow-up?").

Each outreach/contact is linked to a specific job. When the user looks at a job, they see all their networking activity for that job. When they look at a contact, they see which jobs that contact is associated with.

**Step 5, Apply:**
In referral-first mode, the "Apply" action is gated until at least one referral step is completed (configurable). When applying:
- Platform suggests which resume version to use based on the job description
- User selects resume version, marks as applied
- Application is linked to any referral contacts for this job

In speed-first mode, user can apply immediately but the platform still surfaces networking opportunities and gently nudges.

**Step 6, Follow Up:**
Post-application tracking through standard stages (Applied, Phone Screen, Technical, Onsite, Offer, Accepted/Rejected). Referral contacts remain linked so user knows who to update or thank.

## Referral Gating Logic

This is the core product logic. In the job detail view:

```
if user.strategy_mode == 'referral_first' AND job.strategy_override != 'speed':
    if no outreach_events exist for this job with status >= 'message_sent':
        show "Apply" button as disabled/grayed
        show prompt: "Find a connection first - it increases your chances 5x"
        show "Override and apply anyway" as a small text link (not a button)
    else:
        show "Apply" button as enabled
else:
    show "Apply" button always enabled
    show networking opportunities as a suggestion panel, not a gate
```

The gating should feel like guidance, not punishment. The override is always available. The goal is to make the user pause and think "actually, let me try to find someone first," not to trap them.

## Nudge System

A background check (triggered on login or page load) evaluates:
- Outreach events with status `message_sent` and `last_action_at` > 5 days ago: suggest follow-up
- Jobs saved > 7 days ago with no outreach events: suggest finding connections
- Jobs with referral secured but not yet applied: prompt to apply
- Jobs applied > 14 days ago with no status update: suggest following up with recruiter

Nudges show as a banner or card on the dashboard. Not email (for now). Keep it in-app. There are 8 nudge conditions total, each with normal/warning/urgent severity.

## Dashboard (Home Screen)

When the user logs in, they see:
1. **Pipeline summary**: X jobs saved, Y in networking, Z applied, W interviewing
2. **Today's actions**: List of 3-5 things to do today based on pipeline state
3. **Recent activity**: last 5 things they did
4. **Stale items**: any jobs or outreach that need attention

## Onboarding Wizard

4-step wizard:
1. **Schools**: Add schools with LinkedIn IDs (used for alumni connection surfacing)
2. **Resumes**: Name resume versions (e.g., "ML Engineer", "Data Scientist")
3. **Strategy**: Choose referral-first or speed-first, set stalled threshold
4. **Templates**: Customize outreach message templates or use defaults

Should feel quick, 3-5 minutes max. Everything is editable later in settings.

## MVP Scope

What is in MVP:
1. Auth + onboarding wizard
2. Job board search (JSearch API)
3. Job detail view with referral workflow (add contacts manually, draft outreach, track outreach status)
4. Referral gating (referral-first mode gates the apply button)
5. Application tracking (mark as applied, select resume version, basic status progression)
6. Dashboard with pipeline summary and nudges
7. Stripe billing (free tier limited to 25 jobs + 5 AI/month; pro unlocks unlimited)
8. Landing page explaining the referral-first philosophy with signup CTA
9. Demo mode (try without registering)

What is NOT in MVP:
- Cover letter generation (Phase 2)
- Chrome extension (Phase 2)
- Automated connection surfacing via people data APIs (Phase 2)
- Analytics dashboard (Phase 2)
- CSV import from desktop app (Phase 2)
- Community features (Phase 3)
- Mobile app (Phase 3)

## Naming

The app needs a name that communicates "referral-first job search" in a way that sounds like a modern job board/platform, not a spreadsheet tool. The architecture keeps brand name in one config location so renaming is easy.

---

# Part 2: Implementation

## Stack

- **Framework:** Next.js 16 + TypeScript + React 19
- **Styling:** Tailwind CSS v4 (dark theme by default)
- **ORM:** Prisma v7 with PrismaPg driver adapter
- **Database:** PostgreSQL on Supabase
- **Auth:** NextAuth.js (Credentials + optional Google OAuth, JWT strategy)
- **Billing:** Stripe (not yet implemented)
- **Job Search:** RapidAPI JSearch with in-memory caching (6hr TTL)
- **Icons:** lucide-react
- **Utilities:** clsx, bcryptjs

## File Structure

```
web/
  package.json
  next.config.ts
  tsconfig.json
  postcss.config.mjs
  .nvmrc                          -- Node 20
  .env / .env.example
  .gitignore

  prisma/
    schema.prisma                 -- 7 enums, 9 models, all indexes
    prisma.config.ts              -- Uses DIRECT_URL for migrations

  src/
    generated/prisma/             -- Prisma client (custom output path)

    lib/
      prisma.ts                   -- Singleton client with PrismaPg adapter
      auth.ts                     -- NextAuth config (JWT, billingStatus + onboardingCompleted in session)
      auth-helpers.ts             -- requireAuth(), requireOnboarding(), getSession()
      job-search.ts               -- JSearch API integration with in-memory caching

    types/
      next-auth.d.ts              -- Session/JWT type augmentations

    components/
      providers.tsx               -- SessionProvider wrapper
      nav.tsx                     -- Sticky top nav with active state, sign out
      demo-button.tsx             -- "Try Demo" button for landing page
      ui/
        button.tsx                -- 4 variants (primary/secondary/ghost/danger), 3 sizes
        input.tsx                 -- With label and error
        textarea.tsx              -- With label and error
        select.tsx                -- With label and error
        card.tsx                  -- Card, CardHeader, CardTitle, CardDescription, CardContent
        badge.tsx                 -- 5 variants (default/success/warning/danger/info)

    app/
      globals.css                 -- Dark-first Tailwind v4 theme
      layout.tsx                  -- Root layout with Providers wrapper
      page.tsx                    -- Landing page (hero, how it works, features, pricing, footer)

      (auth)/
        layout.tsx                -- Centered, no nav
        login/page.tsx
        register/page.tsx

      (app)/
        layout.tsx                -- requireAuth()
        onboarding/page.tsx       -- 4-step wizard

        (main)/
          layout.tsx              -- requireOnboarding() + Nav
          dashboard/page.tsx      -- Pipeline summary, nudge engine, recent jobs
          jobs/page.tsx            -- Job list with search, filters
          jobs/new/page.tsx        -- New job form (manual add)
          jobs/[id]/page.tsx       -- Job detail with outreach, referral gating, contacts, notes
          jobs/search/page.tsx     -- Job board search UI (JSearch integration)
          contacts/page.tsx        -- Contacts list with search, linked outreach events
          settings/page.tsx        -- Strategy, stalled days, schools, resumes, templates

      api/
        auth/
          [...nextauth]/route.ts  -- NextAuth handler
          register/route.ts       -- Registration (hash + create user)
        onboarding/route.ts       -- Save onboarding data
        jobs/route.ts             -- GET (list+filter) / POST (create, free tier limit)
        jobs/[id]/route.ts        -- GET / PATCH / DELETE (ownership verified)
        jobs/search/route.ts      -- Job board search proxy
        contacts/route.ts         -- GET (list+search) / POST (create)
        contacts/[id]/route.ts    -- GET / PATCH / DELETE
        outreach/route.ts         -- POST (create, auto status_rank)
        outreach/[id]/route.ts    -- PATCH (auto status_rank + lastActionAt) / DELETE
        settings/route.ts         -- GET / PUT (user settings, resumes, templates)
        demo/
          start/route.ts          -- Seed demo user and return session
          reset/route.ts          -- Reset demo user data

    scripts/
      demo-seed.ts                -- Demo data seeding logic
```

## Progress Tracking

### Completed

- **Infrastructure:** package.json, Prisma schema, prisma.config.ts, .env/.env.example, .nvmrc, .gitignore, next.config.ts, tsconfig.json, postcss.config.mjs
- **Prisma/DB:** Schema pushed to Supabase via `prisma db push`. Prisma client generated. PrismaPg adapter installed and configured in prisma.ts.
- **Core libraries:** prisma.ts (singleton with driver adapter), auth.ts, auth-helpers.ts, job-search.ts
- **UI components:** button, input, textarea, select, card, badge
- **Layout & theme:** globals.css, root layout, providers, nav
- **All pages:** Landing, login, register, onboarding, dashboard, jobs list, new job, job detail, job search, contacts, settings
- **All API routes:** auth (NextAuth + register), onboarding, jobs (CRUD + search), contacts (CRUD), outreach (CRUD), settings (GET/PUT)
- **Demo mode:** demo-seed.ts, /api/demo/start, /api/demo/reset, demo-button.tsx
- **Build:** Passes with zero errors

### Cut from Scope

- **AI message drafting (ai.ts, /api/ai/draft-message):** Cut in favor of template-based message drafting. Users compose messages from their configured templates rather than calling an LLM. This simplifies the MVP and removes the Anthropic API dependency for core functionality.

### Not Yet Started

- Stripe billing (checkout, webhook, billing page)
- Next action derivation logic
- Polish and testing
- Deployment to Vercel

## Database Setup

The database is hosted on **Supabase** (PostgreSQL). Two connection strings are used:

- **`DATABASE_URL`** (pooler): Used at runtime by the app. Goes through Supabase's connection pooler.
- **`DIRECT_URL`**: Used for migrations/schema pushes. Direct connection to the database.

`prisma.config.ts` is configured to use `DIRECT_URL` for migrations.

**Important:** Prisma migrations must be run via Windows Node because WSL cannot reach the Supabase direct connection. Use:
```bash
node.exe ./node_modules/prisma/build/index.js db push
```

## Prisma Notes

- **Prisma v7** requires the PrismaPg driver adapter (installed as `@prisma/adapter-pg`). The `prisma.ts` singleton sets this up.
- Client output is set to `src/generated/prisma` (custom path in schema.prisma). Import from `@/generated/prisma`.
- The schema uses `password_hash` (snake_case) as the DB field name. All auth code references `user.password_hash`. Confirmed consistent.

## Architecture Notes

### Route Group Structure
```
src/app/
  page.tsx                    -- Landing page (public)
  layout.tsx                  -- Root layout with Providers
  (auth)/
    layout.tsx                -- Centered, no nav
    login/page.tsx
    register/page.tsx
  (app)/
    layout.tsx                -- requireAuth()
    onboarding/page.tsx       -- No nav, just auth
    (main)/
      layout.tsx              -- requireOnboarding() + Nav
      dashboard/page.tsx
      jobs/page.tsx
      jobs/new/page.tsx
      jobs/[id]/page.tsx
      jobs/search/page.tsx
      contacts/page.tsx
      settings/page.tsx
      billing/page.tsx        -- NOT YET BUILT
```

### Key Design Decisions
- **JWT sessions** (not database sessions) so API routes can read session without a DB hit
- **Prisma client singleton** at `src/lib/prisma.ts`, imports from custom output at `@/generated/prisma`
- **All API routes** verify ownership by checking `userId` on every query
- **Free tier limits** checked at the API layer (25 jobs in POST /api/jobs)
- **Job search results** cached in-memory (Map) with 6-hour TTL
- **Status ranks** are integers for ordering/gating: identified=0, message_drafted=1, message_sent=2, responded=3, sharing_internally=4, referral_requested=5, referral_secured=6, referral_submitted=7, no_response=-1, declined=-2
- **Next.js 16** requires Promise-based params in dynamic API routes (all [id] routes updated accordingly)

### Three-Track Status Model
- `applied` (boolean + date): Whether the user has submitted an application
- `next_action` (derived/overridable): What the user should do next for this job
- `interview_stage` (post-apply): Phone screen, technical, onsite, offer, etc.

### Node Version
Node 20 via nvm. Use `nvm use 20` before any npm/node commands. The `.nvmrc` file is set to `20`.

### Dependencies
```json
{
  "dependencies": {
    "next": "16.x",
    "react": "19.x",
    "react-dom": "19.x",
    "prisma": "7.x",
    "@prisma/client": "7.x",
    "@prisma/adapter-pg": "7.x",
    "pg": "...",
    "next-auth": "...",
    "@auth/prisma-adapter": "...",
    "bcryptjs": "...",
    "stripe": "...",
    "@anthropic-ai/sdk": "...",
    "lucide-react": "...",
    "clsx": "..."
  },
  "devDependencies": {
    "@types/bcryptjs": "...",
    "tailwindcss": "^4",
    "@tailwindcss/postcss": "^4",
    "typescript": "^5",
    "eslint": "^9",
    "eslint-config-next": "16.x"
  }
}
```

## Demo Mode

Demo mode lets users try the app without creating an account. The architecture:

- **`src/scripts/demo-seed.ts`**: Contains the seed data and logic to populate a demo user with sample jobs, contacts, and outreach events that showcase the referral-first workflow.
- **`/api/demo/start`**: Creates (or resets) a demo user, seeds sample data, and returns a session so the user is logged in immediately.
- **`/api/demo/reset`**: Wipes the demo user's data and re-seeds it to a clean state.
- **`src/components/demo-button.tsx`**: "Try Demo" button on the landing page that calls the start endpoint and redirects to the dashboard.

Demo users have full access to the UI but are clearly marked as demo sessions. No real data persists beyond the session.

## Database Schema (Core Tables)

```sql
-- Users
users (
  id, email, name, password_hash, created_at,
  billing_status ENUM('free', 'pro'),
  stripe_customer_id,
  strategy_mode ENUM('referral_first', 'speed_first'),
  stalled_days INTEGER,
  onboarding_completed BOOLEAN,
  config JSONB  -- { schools, ai_actions_used, ai_actions_reset_at, ... }
)

-- Resume versions
resume_versions (
  id, user_id, name,
  content TEXT,
  file_url,
  keywords JSONB,
  is_default BOOLEAN,
  created_at, updated_at
)

-- Jobs (from API or manually added)
jobs (
  id, user_id,
  title, company, location, remote_type,
  salary_min, salary_max, salary_currency,
  description TEXT,
  url,
  source,            -- 'api:jsearch', 'manual', etc.
  external_id,
  keywords JSONB,
  status ENUM('saved', 'networking', 'ready_to_apply', 'applied',
              'phone_screen', 'technical', 'onsite', 'offer',
              'accepted', 'rejected', 'withdrawn', 'archived'),
  strategy_override,
  resume_version_id,
  cover_letter TEXT,
  applied_at, created_at, updated_at,
  excitement_rating INTEGER,
  notes TEXT
)

-- Contacts (people the user is networking with)
contacts (
  id, user_id,
  name, title, company,
  linkedin_url, email,
  connection_type ENUM('alumni', 'mutual_connection', 'cold', 'recruiter', 'other'),
  school,
  notes TEXT,
  created_at
)

-- Outreach Events (the link between a job and a contact)
outreach_events (
  id, user_id,
  job_id,          -- FK to jobs
  contact_id,      -- FK to contacts
  status ENUM('identified', 'message_drafted', 'message_sent',
              'responded', 'call_scheduled', 'call_completed',
              'referral_requested', 'referral_secured', 'referral_submitted',
              'no_response', 'declined'),
  status_rank INTEGER,
  message_draft TEXT,
  message_final TEXT,
  platform ENUM('linkedin', 'email', 'other'),
  last_action_at,
  follow_up_at,
  notes TEXT,
  created_at, updated_at
)

-- Message Templates
message_templates (
  id, user_id,
  name,
  template TEXT,    -- with {placeholders}
  category ENUM('initial_outreach', 'follow_up', 'thank_you', 'referral_request'),
  created_at
)
```

## What Needs to Happen Next

### Phase C: Stripe Billing (not started)
1. `src/app/api/stripe/checkout/route.ts` - Create Stripe checkout session
2. `src/app/api/stripe/webhook/route.ts` - Handle subscription events, update `billingStatus`
3. `src/app/(app)/(main)/billing/page.tsx` - Billing page with current plan, upgrade/manage buttons
4. Middleware or per-route checks for free tier limits (partially done in jobs POST route)
5. For demo mode, billing is stubbed; demo users see the billing page but cannot actually subscribe

### Phase D: Next Action Derivation (not started)
The `deriveNextAction()` function needs to be called whenever outreach events change. Options:
- Call it in the outreach PATCH/POST routes and update the job's `nextAction` field
- Or compute it client-side on the dashboard/job detail pages
- This is a rules-based function, not an AI call. It looks at the current outreach status, strategy mode, and stalled threshold to determine what the user should do next.

### Phase F: Polish and Testing
1. Mobile responsive review
2. Loading states and error boundaries
3. Empty state designs
4. Form validation (client + server)
5. Edge cases (archived jobs, deleted contacts with outreach events, etc.)

### Deployment
- Frontend + API: Vercel
- Database: Supabase (already set up)
- Environment variables: mirror .env.example into Vercel project settings
- Stripe webhooks: point to production URL once deployed

## Migration Path: Desktop to Web

The desktop app (Python/tkinter) and the web app are separate products sharing the same philosophy. The tkinter code is not being ported. The web app is a new implementation of the same workflow.

However:
- The CSV format should be importable. Users of the desktop app should be able to upload their CSV and have jobs imported into the web app. (Phase 2)
- The JSON config should map to the web onboarding. If someone has a config from the desktop app, the web app should be able to read it and pre-fill their profile. (Phase 2)

The desktop app stays open-source. The web app is the freemium product.
