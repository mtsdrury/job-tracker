# KnowSomeone Implementation Flowchart & Roadmap

**Version:** 1.0
**Date:** March 25, 2026
**Target Launch:** Within 1-2 weeks
**Audience:** Product team (developer + designer + product)

---

## Table of Contents

1. [Feature Inventory Table](#feature-inventory-table)
2. [Phased Roadmap](#phased-roadmap)
3. [Visual Implementation Flowchart](#visual-implementation-flowchart)
4. [Autonomous Task Definitions](#autonomous-task-definitions)
5. [User Gate Definitions](#user-gate-definitions)
6. [Risk & Dependencies](#risk--dependencies)
7. [Launch Checklist](#launch-checklist)

---

## Feature Inventory Table

| # | Feature | Description | Priority | Effort | Dependencies | User Gate | Status |
|---|---------|-------------|----------|--------|--------------|-----------|--------|
| **LAUNCH BLOCKERS (P0)** |
| 1 | Privacy Policy Page | Legal compliance page with data handling, third-party processors, user rights, breach notification | P0 | M | Legal review | Legal review needed | Not started |
| 2 | Terms of Service Page | Legal terms covering user responsibilities, limitations of liability, pricing changes, account termination | P0 | M | Legal review | Legal review needed | Not started |
| 3 | Account Deletion | API + UI to let users delete all their data (jobs, contacts, outreach, resume versions) per GDPR/CCPA requirements | P0 | M | Prisma schema verified | None | Not started |
| 4 | Data Export (CSV) | Download all user data as CSV (jobs, contacts, outreach, resumés). Human-readable, import-compatible | P0 | S | Prisma queries, CSV library | None | Not started |
| 5 | Data Export (JSON) | Download all user data as JSON for completeness and future API consumption | P0 | S | Prisma queries, JSON serialization | None | Not started |
| 6 | Cookie Consent Banner | Detect analytics/cookies, show banner, honor opt-out. GA4 or similar if used (check current setup) | P0 | S | Analytics vendor decision | None | Not started |
| 7 | Google OAuth Consent Screen Publish | Move from Testing → Production in Google Cloud Console. Required for third-party OAuth to work | P0 | S | Google Cloud Console access | Third-party login decision | Not started |
| 8 | End-to-End Testing & QA | Comprehensive testing: auth flows, job CRUD, outreach lifecycle, Stripe, edge cases, mobile responsiveness | P0 | L | All features complete | Manual QA | Not started |
| 9 | RapidAPI Key in Vercel | Configure environment variable `RAPIDAPI_KEY` for job search to work in production | P0 | S | RapidAPI account | External API keys | Not started |
| 10 | Anthropic API Key in Vercel | Configure environment variable `ANTHROPIC_API_KEY` for AI drafting (Pro users) | P0 | S | Anthropic account | External API keys | Not started |
| **V1 FEATURES (P1)** |
| 11 | Saved Job Searches | Save search filters (role, location, company, salary) with optional email alert (daily/weekly, opt-in) | P1 | M | Jobs list page, Settings integration | Email service selection | Days 4-10 |
| 12 | Enhanced User Profile | Add target roles/titles, location preferences, experience level. Display on settings page and in notifications | P1 | S | Settings page exists | None | Days 4-10 |
| 13 | Resume Upload (PDF) | Upload PDF, extract keywords, validate file size. Store in Supabase Storage or S3 | P1 | M | Supabase Storage, PDF parsing library | File upload security review | Days 4-10 |
| 14 | Resume Keyword Matching | Parse job description, compare against resume keywords, suggest if match is weak | P1 | M | Resume upload, NLP library or Claude API | None | Days 4-10 |
| 15 | Guided Apply Flow | Confirmation modal: resume version selector, cover letter status, referral status check before marking applied | P1 | M | Jobs detail page, referral gating logic | None | Days 4-10 |
| 16 | Interview Stage Tracker | Add interview_stage field to jobs: Phone Screen, Technical, Onsite, Offer, etc. + date + notes + interviewer names | P1 | M | Jobs table schema update, detail page form | None | Days 4-10 |
| 17 | Interview Prep Questions | Given job description, generate 5-10 interview prep questions using Claude. Pro feature | P1 | M | Claude API integration | None | Days 4-10 |
| 18 | Post-Interview Reflection | Popup after marking interview_stage complete. Prompts: "How did it go?", "What stood out?", "Follow-ups needed?" | P1 | S | Interview stage tracker | None | Days 11-14 |
| 19 | Analytics Dashboard (Full) | Charts: application funnel, referral impact, resume version performance, timeline, company breakdown | P1 | L | Matplotlib, Pandas, aggregation queries | None | Days 11-14 |
| 20 | Email Digest (Weekly) | Weekly opt-in email: pipeline summary, due soon actions, new matching jobs. SendGrid or similar | P1 | M | Email service integration, scheduled task | Email service selection | Days 11-14 |
| 21 | Real-Time Alerts (Opt-In) | Urgent item detection: referral responded, company emailed you, interview scheduled. Toast + optional email | P1 | S | Background job/queue | None | Days 11-14 |
| 22 | Company Email Alert Setup | After applying: form to add company email address so user gets email when they're contacted | P1 | S | Settings page, contact form | None | Days 11-14 |
| **V2 FEATURES (P2)** |
| 23 | Personality/Tone Quiz | 10-question quiz to capture communication style, writing sample, then guide AI message drafting tone | P2 | M | Claude API, quiz form, template system | None | Post-launch |
| 24 | Apollo.io People Lookup | Integrate Apollo.io API: search contacts by company/school, enrich email/phone, "Add as referral" button | P2 | L | Apollo.io API key, people search UI | Apollo.io contract | Post-launch |
| 25 | LinkedIn Deep Linking | "View on LinkedIn" button on contacts, profile links to LinkedIn. Extract profile slug or store URL | P2 | S | Contact model, deep link construction | None | Post-launch |
| 26 | Job Import from CSV | Upload CSV, parse columns (title, company, URL, etc.), bulk create jobs with validation | P2 | M | CSV parsing, validation, bulk import | File security review | Post-launch |
| 27 | "Got the Job" Celebration | Celebration animation/modal when job marked as Accepted. Offer to join Insider Program | P2 | S | Animation library, modal | None | Post-launch |
| 28 | Insider Program | Successful users can sign up to be referral contacts for new KnowSomeone users. Creates flywheel | P2 | L | Program page, contact form, verification flow | Legal/program terms | Post-launch |
| 29 | Community Stats (Anonymous) | Aggregate dashboards: overall success rate, average time to offer, most common roles, industries, etc. | P2 | M | Analytics aggregation, privacy masking | Data privacy review | Post-launch |
| **V3 FEATURES (P3)** |
| 30 | Chrome Extension | Lightweight: capture LinkedIn profile URLs, auto-populate in KnowSomeone. No LinkedIn automation | P3 | L | Extension boilerplate, LinkedIn URL parsing | None | 3-6 months |
| 31 | Cover Letter Generation | Given job description + resume, generate draft cover letter. Pro feature, uses Claude | P3 | M | Claude API, template system | None | 3-6 months |
| 32 | Advanced Email Integration | Send outreach directly from app via email (not LinkedIn), track opens/clicks with integration partner | P3 | L | Email service API (HubSpot/Outreach), tracking | Email service contract | 3-6 months |
| 33 | Custom Domain | Allow users to set custom domain (e.g., alenzie.knowsomeone.io) if on Pro plan | P3 | M | DNS routing, Vercel custom domain | Infrastructure setup | 3-6 months |

---

## Phased Roadmap

### Phase 0: Launch Blockers (Days 1-3, ~25-30 hours)

**Goal:** Remove all legal, auth, and external dependency blockers before launch.

**Must Complete:**
- [ ] Privacy Policy + Terms of Service pages (legal review)
- [ ] Account deletion API + UI
- [ ] Data export (CSV + JSON)
- [ ] Cookie consent banner (if needed)
- [ ] Google OAuth consent screen published
- [ ] RapidAPI key in Vercel env
- [ ] Anthropic API key in Vercel env
- [ ] End-to-end testing (smoke tests for all major flows)

**Parallel Work (no dependencies):**
- Privacy Policy + Terms pages can be drafted by product/legal team in parallel
- E2E testing framework setup

**Blocking Conditions:**
- Legal review of Privacy Policy + Terms must be complete before launch
- All external API keys must be live and tested in Vercel staging

**Deliverables:**
- Privacy Policy page at `/legal/privacy` (publicly accessible)
- Terms of Service page at `/legal/terms` (publicly accessible)
- Account deletion button on `/settings` (authenticated users)
- Data export buttons on `/settings` for CSV + JSON
- QA sign-off on auth flows, job CRUD, Stripe, and job search

---

### Phase 1: V1 Core Features (Days 4-10, ~35-40 hours)

**Goal:** Build high-impact features that improve the core referral workflow and messaging.

**Focus Areas:**
1. **Resume & Interview Tracking** (resume upload, keyword matching, interview stages, prep questions)
2. **Guided Workflows** (apply flow confirmation, post-interview reflection)
3. **Email/Alerts Foundation** (saved searches, real-time alerts, company email setup)

**Autonomous Tasks (can start immediately):**
- [ ] Resume upload API + S3/Supabase Storage integration
- [ ] Resume keyword extraction (local parser or Claude)
- [ ] Interview stage fields (schema migration, form UI)
- [ ] Interview prep questions API (Claude integration)
- [ ] Post-interview reflection popup
- [ ] Saved job searches API + UI (without email alerts first)
- [ ] Company email alert setup form
- [ ] Real-time alert generation logic

**User Gates (need decisions):**
- **Email Service Selection**: Choose SendGrid, Mailgun, or AWS SES for email digest and alerts
  - Recommendation: SendGrid (free tier up to 100 emails/day, good docs)
  - Blocks: Email digest, real-time email alerts
- **PDF Parsing Library**: Choose pdf.js, pdfjs-dist, or Claude for keyword extraction
  - Recommendation: pdfjs-dist for local parsing (no API cost)
  - Blocks: Resume keyword matching feature

**Deliverables:**
- Resume upload working (accept PDF, validate, store, show on detail page)
- Resume keyword matching shows on job detail (visual indicator: match %, missing keywords)
- Interview stage selector on job detail (dropdown: Phone Screen, Technical, Onsite, Offer)
- Interview prep questions generated on demand (Claude API, Pro-gated)
- Post-interview reflection modal triggered after interview_stage update
- Saved job searches with optional daily/weekly email alerts (Pro feature, or all users)
- Company email alert field on job detail

---

### Phase 2: V1 Polish & Analytics (Days 11-14, ~20-25 hours)

**Goal:** Finish remaining V1 features and launch.

**Focus Areas:**
1. **Analytics & Reporting** (full dashboard with charts)
2. **Notifications & Digests** (weekly email, real-time alerts UI)
3. **Launch Polish** (responsive design, accessibility, performance)

**Autonomous Tasks:**
- [ ] Analytics dashboard (Matplotlib queries, chart rendering)
- [ ] Weekly email digest scheduled task (runs every Monday 9am)
- [ ] Real-time alert toast notifications UI
- [ ] Responsive design polish (test on tablet/phone)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance optimization (Lighthouse score)

**Final User Gates:**
- **Email Preferences UI**: Where do users set digest frequency, alert preferences?
  - Recommendation: New "Notifications" section in Settings
  - Blocks: Email digest + real-time alerts UX

**Testing & QA:**
- [ ] All flows with E2E tests (Playwright or Cypress)
- [ ] Stripe test mode: successful charge, failed charge, cancellation
- [ ] Auth: login, register, Google OAuth, logout
- [ ] Jobs: create, edit, delete, referral gating, apply flow
- [ ] Contacts: create, add to job, update outreach status
- [ ] Edge cases: deleted contact, archived job, demo user limits

**Deliverables:**
- Full analytics dashboard (funnel, referral impact, resume performance, timeline)
- Weekly email digest configured and tested
- Real-time alerts working (toast + email if opted in)
- Mobile-responsive layout confirmed
- Accessibility audit passed
- All E2E tests passing
- Stripe test mode verified
- Launch sign-off from product + dev + design

---

### Phase 3: V2 Features (Post-Launch, Days 15-35, ~50-60 hours)

**Goal:** Build deeper integrations (Apollo.io, email, LinkedIn) and community features.

**Must Have User Decisions:**
1. **Apollo.io Integration Decision** — do we launch with people lookup?
   - Recommendation: Yes, as a "Coming Soon" feature. Build in parallel, ship week 2-3.
   - Effort: L, dependencies: Apollo.io contract + API key
2. **Community Features Decision** — Insider Program and anonymous stats?
   - Recommendation: Build celebration modal first (quick), defer program to week 3.
   - Effort: Celebration (S), Program (L)

**Deliverables:**
- Apollo.io people search integration (search by company/school, enrich, add as referral)
- LinkedIn deep linking on contacts ("View on LinkedIn" button)
- CSV import for job bulk load
- "Got the Job" celebration modal
- Community analytics dashboard (with privacy safeguards)
- Insider Program landing page + signup form (manual processing for now)

---

### Phase 4: V3 Features (3-6 Months Post-Launch)

**Goal:** Scale with automation and new platforms.

**Deliverables:**
- Chrome extension (lightweight, URL capture only)
- Cover letter generation (Claude-powered, Pro feature)
- Advanced email integration (HubSpot/Outreach open tracking)
- Custom domain support (Pro feature)

---

## Visual Implementation Flowchart

```
START (Day 1)
     |
     v
[PHASE 0: BLOCKERS] ========================================
     |
     +-- [G1: Legal Review] ──> Privacy Policy Page (Author: Legal)
     |                                 |
     |                    +-----------+
     |                    v
     +-- [G2: Legal Review] ──> Terms of Service Page (Author: Legal)
     |                                 |
     |                    +-----------+
     |                    v
     +-- [AUTONOMOUS] -------> Account Deletion API (2h)
     |                                 |
     +-- [AUTONOMOUS] -------> Data Export CSV (1h)
     |                                 |
     +-- [AUTONOMOUS] -------> Data Export JSON (1h)
     |                                 |
     +-- [AUTONOMOUS] -------> Cookie Consent Banner (1.5h)
     |                                 |
     +-- [G3: GCP Access] -----> Publish OAuth Consent Screen (0.5h)
     |                                 |
     +-- [G4: API Keys] --------> RapidAPI Key to Vercel (0.5h)
     |                                 |
     +-- [G5: API Keys] --------> Anthropic Key to Vercel (0.5h)
     |                                 |
     +-- [E2E Testing] ---------> Smoke Tests All Flows (8h)
     |
     +===============[G: Legal Review Complete?]============
                          |
                          YES --> [PHASE 1: V1 CORE]
                          |
                          v
[PHASE 1: V1 CORE] =========================================
     |
     +-- [AUTONOMOUS] -------> Resume Upload API (4h)
     |       |
     +-- [AUTONOMOUS] -------> Resume Keywords (3h)
     |       |
     +-- [G6: Email Service] --> Saved Job Searches API (2h)
     |       |
     +-- [G7: PDF Library] ---> Keyword Matching UI (2h)
     |       |
     +-- [AUTONOMOUS] -------> Interview Stage Tracker (3h)
     |       |
     +-- [AUTONOMOUS] -------> Interview Prep Questions API (2h)
     |       |
     +-- [AUTONOMOUS] -------> Post-Interview Reflection (1.5h)
     |       |
     +-- [AUTONOMOUS] -------> Guided Apply Flow (2.5h)
     |       |
     +-- [AUTONOMOUS] -------> Company Email Alert Form (1.5h)
     |       |
     +-- [AUTONOMOUS] -------> Real-Time Alert Logic (2h)
     |
     +===============[All Autonomous Complete?]============
                          |
                          YES --> [PHASE 2: POLISH]
                          |
                          v
[PHASE 2: POLISH & LAUNCH] =================================
     |
     +-- [AUTONOMOUS] -------> Full Analytics Dashboard (6h)
     |       |
     +-- [AUTONOMOUS] -------> Weekly Email Digest (3h)
     |       |
     +-- [AUTONOMOUS] -------> Real-Time Alert UI (1.5h)
     |       |
     +-- [G8: Email Prefs] ---> Notification Settings Page (1.5h)
     |       |
     +-- [AUTONOMOUS] -------> Responsive Design Polish (4h)
     |       |
     +-- [AUTONOMOUS] -------> E2E Test Suite (8h)
     |       |
     +-- [AUTONOMOUS] -------> Accessibility Audit (2h)
     |       |
     +-- [AUTONOMOUS] -------> Performance Optimization (2h)
     |
     +===============[All Tests Pass + QA Signoff?]=======
                          |
                          YES --> LAUNCH!
                          |
                          v
[DAY 14: LAUNCH PARTY] =====================================
     |
     +-- Deploy to Vercel (main branch)
     +-- Verify all pages accessible
     +-- Monitor for errors (Sentry, logs)
     +-- Send launch announcement
     |
     v
[PHASE 3: V2 FEATURES] ===================================
     |
     +-- [G9: Apollo Decision] -> Apollo.io Integration (8h)
     |       |
     +-- [AUTONOMOUS] -------> LinkedIn Deep Linking (1h)
     |       |
     +-- [AUTONOMOUS] -------> CSV Import (3h)
     |       |
     +-- [AUTONOMOUS] -------> "Got the Job" Celebration (2h)
     |       |
     +-- [G10: Community Prog] -> Insider Program + Stats (6h)
     |
     v
[PHASE 4: V3 FEATURES] ===================================
     (Chrome Extension, Cover Letters, Email Integration,
      Custom Domain — 3-6 months out)
     |
     v
END (Scale & Sustain)
```

---

## Autonomous Task Definitions

### Phase 0 Tasks

| Task ID | Name | Description | Files Created/Modified | Verification | Est. Time |
|---------|------|-------------|------------------------|--------------|-----------|
| A0-1 | Account Deletion API | Create `DELETE /api/user` endpoint. Verify ownership. Delete all user data (jobs, contacts, outreach, contacts, templates, resume_versions). Soft-delete or hard delete. | `src/app/api/user/delete/route.ts` | Call endpoint with auth token, verify user record gone from DB | 2h |
| A0-2 | Account Deletion UI | Add "Delete Account" button on `/settings`. Confirm modal. Show warnings. Disable after click. | `src/app/(app)/(main)/settings/page.tsx`, `src/components/delete-account-modal.tsx` | Button appears, modal shows, deletion succeeds | 1.5h |
| A0-3 | Data Export CSV API | Create `GET /api/user/export?format=csv` endpoint. Query all user data, format as CSV (jobs, contacts, outreach). Return as file download | `src/app/api/user/export/route.ts` | Call endpoint, download CSV, verify all data present | 1.5h |
| A0-4 | Data Export JSON API | Create `GET /api/user/export?format=json` endpoint. Query all user data, return as JSON object | Same as CSV, different format | 0.5h |
| A0-5 | Data Export UI | Add download buttons on `/settings` for CSV and JSON | `src/app/(app)/(main)/settings/page.tsx` | Buttons appear, downloads work | 0.5h |
| A0-6 | Cookie Consent Banner | Add banner component if GA4/analytics is used. Show opt-in/opt-out. Store choice in localStorage. Respect GPC signal | `src/components/cookie-banner.tsx`, `src/lib/analytics.ts` | Banner shows, choice persists, GA respects opt-out | 1.5h |
| A0-7 | E2E Test Suite (Smoke) | Create Playwright tests for: login, register, Google OAuth, onboarding, create job, add contact, outreach status update, apply, mark interviewed, Stripe test checkout | `e2e/smoke.spec.ts` | All tests pass in CI/CD | 8h |
| A0-8 | Job Search RapidAPI Key Config | Add `RAPIDAPI_KEY` to Vercel environment. Verify job search works in staging. Test with real query | `.env.local`, Vercel dashboard | Job search returns results in staging | 0.5h |
| A0-9 | Anthropic API Key Config | Add `ANTHROPIC_API_KEY` to Vercel environment. Verify AI draft works in staging for Pro users | `.env.local`, Vercel dashboard | AI draft button works and returns text | 0.5h |

### Phase 1 Tasks

| Task ID | Name | Description | Files Created/Modified | Verification | Est. Time |
|---------|------|-------------|------------------------|--------------|-----------|
| A1-1 | Resume Upload API | Create `POST /api/resumes` endpoint. Accept PDF file, validate size (<10MB), store in Supabase Storage or S3. Return signed URL. | `src/app/api/resumes/route.ts`, `src/lib/storage.ts` | Upload PDF, verify in storage, URL accessible | 3h |
| A1-2 | Resume Upload UI | Add "Upload Resume" button on `/settings` or detail page. Show progress. Show uploaded file. Allow re-upload/delete | `src/app/(app)/(main)/settings/page.tsx`, `src/components/resume-uploader.tsx` | Upload works, file listed, delete works | 1h |
| A1-3 | Resume Keyword Extraction | Parse uploaded PDF for keywords (skills, languages, tools). Use pdfjs-dist or Claude. Store in `resume_versions.keywords` | `src/lib/resume-parser.ts` | Upload PDF, verify keywords extracted and stored | 2h |
| A1-4 | Resume Keyword Matching | On job detail, compare job description keywords vs resume keywords. Show match % and missing keywords | `src/app/(app)/(main)/jobs/[id]/page.tsx`, `src/lib/keyword-match.ts` | Job detail shows "Resume match: 65%" with missing skills listed | 1.5h |
| A1-5 | Interview Stage Schema | Add `interview_stage` ENUM and `interview_date` to jobs table. Add `interviewer_name` and `interview_notes` | `prisma/schema.prisma` | `prisma db push` succeeds, fields present | 0.5h |
| A1-6 | Interview Stage UI | Add dropdown/form on job detail to set interview stage, date, interviewer name, notes. Show in timeline | `src/app/(app)/(main)/jobs/[id]/page.tsx`, form component | Dropdown appears, save works, shows in detail | 1.5h |
| A1-7 | Interview Prep Questions API | Create `POST /api/ai/interview-prep` endpoint. Input: job description. Output: 5-10 questions using Claude. Pro-gated. | `src/app/api/ai/interview-prep/route.ts` | Call endpoint, returns array of questions | 2h |
| A1-8 | Interview Prep Questions UI | Add "Generate Prep Questions" button on job detail (only if Pro). Show modal with questions. Copy button | `src/app/(app)/(main)/jobs/[id]/page.tsx`, modal component | Button appears, generates questions, copy works | 1h |
| A1-9 | Post-Interview Reflection Modal | When interview_stage set to complete, show modal: "How did it go?", "Key takeaway?", "Follow-ups?". Save to notes | `src/components/post-interview-modal.tsx` | Set interview stage, modal shows, responses saved | 1.5h |
| A1-10 | Saved Job Searches API | Create `POST /api/saved-searches` endpoint. Input: status, company, role, location filters. Store as JSON in new `saved_searches` table | `src/app/api/saved-searches/route.ts`, schema migration | Save search, retrieve, list | 2h |
| A1-11 | Saved Job Searches UI | Add "Save Search" button on job search page. Show saved searches list. Load on click. Allow delete | `src/app/(app)/(main)/jobs/search/page.tsx`, component | Button works, searches saved/loaded/deleted | 1h |
| A1-12 | Guided Apply Flow Modal | When clicking "Apply" button, show confirmation modal with: resume selector, cover letter status, referral status check. Only then mark applied | `src/components/apply-confirmation-modal.tsx` | Click apply, modal shows, confirms before applying | 2h |
| A1-13 | Company Email Alert Form | Add field on job detail: "Company contact email". Optional. User provides their contact email at target company so they know when company reaches out | `src/app/(app)/(main)/jobs/[id]/page.tsx` | Field appears, saves to job, retrieves on load | 1h |
| A1-14 | Real-Time Alert Logic | In dashboard, detect: referral responded (status >= 3), company might contact (email alert setup), interview scheduled. Flag as urgent with color | `src/lib/next-action.ts` expansion, `src/app/(app)/(main)/dashboard/page.tsx` | Dashboard shows "Urgent" section with flagged items | 2h |

### Phase 2 Tasks

| Task ID | Name | Description | Files Created/Modified | Verification | Est. Time |
|---------|------|-------------|------------------------|--------------|-----------|
| A2-1 | Analytics Dashboard | Query all user data, aggregate: funnel by status, referral impact (% with referral that applied vs without), resume performance (which version got more interviews), timeline (days to interview). Use Matplotlib or Chart.js. | `src/app/(app)/(main)/dashboard/page.tsx` expansion, new analytics components | Dashboard shows 4 charts, data correct | 6h |
| A2-2 | Weekly Email Digest | Scheduled task (runs Monday 9am). Email template: pipeline summary, due soon actions, new matching jobs. Send via SendGrid | `src/app/api/email/weekly-digest/route.ts` (or scheduled function), email template | Test email sent, contains correct data | 3h |
| A2-3 | Email Preferences UI | New section in Settings: "Notifications". Checkboxes for: weekly digest, real-time alerts, company email responses. Save to user config | `src/app/(app)/(main)/settings/page.tsx`, notification preferences form | Toggles appear, save, persist on reload | 1.5h |
| A2-4 | Real-Time Alert Toast UI | On dashboard, show toast for urgent items (referral responded, etc). Dismiss button. Optional "Email me" link | Dashboard page, toast integration | Toast appears for urgent items, dismiss works | 1h |
| A2-5 | Responsive Design Polish | Test all pages on mobile (375px), tablet (768px), desktop. Fix layout issues, font sizes, button sizes. Use Tailwind responsive | All pages | Lighthouse mobile score > 85, no layout shifts | 4h |
| A2-6 | Accessibility Audit | Run axe-core or WAVE on all pages. Fix: contrast, alt text, ARIA labels, keyboard nav, form labels | All pages | axe-core reports zero violations | 2h |
| A2-7 | Performance Optimization | Optimize images, lazy load, code split. Target Lighthouse score > 90. Check bundle size. Use Next.js Image component | `next.config.ts`, image handling | Lighthouse score > 90 on desktop | 2h |
| A2-8 | E2E Test Suite (Full) | Comprehensive tests: all auth flows, all CRUD operations, Stripe test mode (successful, failed, cancel), edge cases (deleted contact, archived job) | `e2e/full.spec.ts` | All tests pass in CI/CD, coverage > 80% of flows | 8h |

### Phase 3 Tasks (Post-Launch)

| Task ID | Name | Description | Files | Verification | Est. Time |
|---------|------|-------------|-------|--------------|-----------|
| A3-1 | Apollo.io People Search API | Create `POST /api/people-search` endpoint. Input: company, school, keywords. Call Apollo API, return matches with email, phone, LinkedIn | `src/app/api/people-search/route.ts`, Apollo client | Call endpoint, returns contacts | 4h |
| A3-2 | People Search UI | Add "Find Contacts" panel in job detail. Input fields, search button, results list. "Add as Referral" action | `src/app/(app)/(main)/jobs/[id]/page.tsx`, people search component | Panel appears, search works, add referral works | 4h |
| A3-3 | LinkedIn Deep Linking | On contact card, add "View on LinkedIn" button. If contact has LinkedIn URL, open in new tab | `src/app/(app)/(main)/contacts/page.tsx`, contact card component | Button appears, opens correct LinkedIn URL | 1h |
| A3-4 | CSV Import API | Create `POST /api/jobs/import` endpoint. Accept CSV with columns: title, company, url, salary, location, notes. Validate, bulk insert | `src/app/api/jobs/import/route.ts`, CSV parser | Upload CSV, verify jobs created | 2h |
| A3-5 | CSV Import UI | Add "Import Jobs" button on jobs list. Modal with file uploader, preview, confirm. Show results | `src/app/(app)/(main)/jobs/page.tsx`, import modal | Upload works, preview shows, jobs imported | 1h |
| A3-6 | "Got the Job" Celebration | When marking job as Accepted, show celebration animation (confetti, modal, message). Offer to join Insider Program | `src/components/celebration-modal.tsx` | Mark job accepted, celebration shows | 2h |
| A3-7 | Insider Program Page | New page `/insider`: signup form, program description, benefits. Collect LinkedIn profile URL, track referrals | `src/app/(app)/(main)/insider/page.tsx`, form handling | Page loads, form submits, data saved | 3h |
| A3-8 | Community Analytics | Dashboard page `/community`: anonymous stats (success rate, avg days to offer, top roles). Aggregate and mask user data | `src/app/(app)/(main)/community/page.tsx` | Page loads, shows aggregated stats | 2h |

---

## User Gate Definitions

### G1: Legal Review

**What Decision:** Review and approve Privacy Policy and Terms of Service pages before launch.

**Options:**
- A) Use template from Termly, iubenda, or similar service (faster, $100-500 one-time)
- B) Have external counsel draft custom policies ($2000-5000, slower)
- C) Use public template from GDPR/CCPA sites and adapt (free, highest risk)

**Recommendation:** Option A. Use Termly to generate GDPR/CCPA-compliant policies in 30 minutes. Review internally, then legal team reviews. Fastest path.

**Blocked Until Resolved:**
- Privacy Policy page
- Terms of Service page
- Public launch

**Owner:** Product Manager + Legal (optional external counsel)

---

### G2: Email Service Selection

**What Decision:** Which email provider for sending digest emails and alerts?

**Options:**
- A) SendGrid ($0-40/month, 100 free emails/day, good API, good documentation)
- B) Mailgun ($0-35/month, unlimited free tier, good for dev)
- C) AWS SES (dirt cheap, but harder to set up)
- D) Brevo/Mailchimp (easier UX, but less API control)

**Recommendation:** Option A (SendGrid). Free tier covers initial users, excellent API docs, clean dashboard.

**Blocked Until Resolved:**
- Email digest feature
- Real-time email alerts
- Company contact response emails

**Owner:** Developer

**Action:**
1. Sign up for SendGrid free tier
2. Create API key, add to `.env.local` and Vercel
3. Test sending a transactional email from `/api/email/test`
4. Once working, implement digest and alert templates

---

### G3: PDF Parsing Library

**What Decision:** How to extract keywords from uploaded resume PDFs?

**Options:**
- A) pdfjs-dist (local, no API cost, 50KB library)
- B) Claude API (call Claude to extract, $0.003 per call, more intelligent)
- C) Adobe PDF Services API ($0.05/call, overkill for our use case)

**Recommendation:** Option A (pdfjs-dist). Local parsing means no API cost, faster, privacy-friendly. Text extraction is straightforward. If users upload images in PDFs (rare), fallback to manual entry.

**Blocked Until Resolved:**
- Resume keyword extraction
- Resume keyword matching feature

**Owner:** Developer

**Action:**
1. `npm install pdfjs-dist`
2. Write `src/lib/resume-parser.ts` to extract text
3. Parse text for keywords (simple regex + NLP library like `compromise`)
4. Store keywords in `resume_versions.keywords` JSONB field

---

### G4: Google OAuth Consent Screen

**What Decision:** Publish OAuth consent screen from Testing → Production in Google Cloud Console?

**Options:**
- A) Publish now (enable Google login for all users)
- B) Keep in Testing mode (only allow my email to test, but it won't work for users)

**Recommendation:** Option A, but only after Privacy Policy + Terms approved. Required for launch.

**Blocked Until Resolved:**
- Third-party login (Google OAuth)
- Public launch (users can't sign up via Google)

**Owner:** Product Manager

**Action:**
1. Open Google Cloud Console
2. Go to OAuth consent screen
3. Fill in app name, user support email, developer contact
4. Add Privacy Policy URL
5. Click "Publish"
6. Verify "Production" label shows in Google Cloud

---

### G5: External API Keys

**What Decision:** Are RapidAPI and Anthropic API keys configured in Vercel production?

**Options:**
- A) Yes, ready to launch (keys set, tested in staging)
- B) Not yet (still testing locally)

**Recommendation:** Option A. Must be complete before launch.

**Blocked Until Resolved:**
- Job search works in production
- AI drafting works in production
- Public launch

**Owner:** Developer

**Action:**
1. Get RapidAPI key from RapidAPI dashboard
2. Get Anthropic API key from console.anthropic.com
3. Add both to Vercel environment variables
4. Redeploy
5. Test job search and AI draft in production

---

### G6: Notification Settings UX

**What Decision:** Where do users configure notification preferences (digest frequency, alert opt-in)?

**Options:**
- A) New "Notifications" section in Settings page with checkboxes
- B) Inline on dashboard (show toggle for each notification type)
- C) Onboarding wizard (add to existing 4-step wizard)

**Recommendation:** Option A. Dedicated section is cleanest and most discoverable.

**Blocked Until Resolved:**
- Email digest feature
- Real-time alerts feature

**Owner:** Designer + Product

**Action:**
1. Add "Notifications" section to Settings page
2. Show: "Weekly digest" (checkbox), "Real-time alerts" (checkbox), "Email digest frequency" (dropdown: daily/weekly)
3. Save to `user.config.notifications` in DB
4. Reference in email and alert logic

---

### G7: Apollo.io Integration Decision

**What Decision:** Do we launch with Apollo.io people lookup, or defer to Phase 3?

**Options:**
- A) Launch without it (Phase 2), add in Phase 3 (1-2 weeks post-launch)
- B) Include in launch (Phase 2), but marks feature as "Beta"
- C) Include in launch as paid feature (Pro only)

**Recommendation:** Option A. Defer to week 2-3 post-launch. Gives time to test API, negotiate contract, avoid launch delays. Mark as "Coming Soon" on landing page to manage expectations.

**Blocked Until Resolved:**
- Apollo.io people search feature

**Owner:** Product Manager + Developer (if choosing Option B or C)

**Action:**
1. Sign up for Apollo.io free tier (50 credits/month)
2. Document API endpoints
3. Plan integration for week 2-3 (parallel track post-launch)

---

### G8: Community Features (Insider Program + Stats)

**What Decision:** Do we launch Insider Program and community stats, or defer to Phase 3?

**Options:**
- A) Defer both to Phase 3 (post-launch week 3+)
- B) Launch community stats as read-only (no user input needed)
- C) Launch both (requires legal review of program terms)

**Recommendation:** Option B. Launch community stats dashboard (shows anonymized success rates, etc.) in Phase 2. Defer Insider Program to Phase 3 (requires more setup: legal terms, referral tracking, payout system).

**Blocked Until Resolved:**
- Community analytics dashboard (can launch)
- Insider Program (defer)

**Owner:** Product Manager

**Action:**
1. Decide: build community stats in Phase 2 (do it)
2. Defer Insider Program to post-launch
3. Use "Coming Soon" banner on dashboard for Insider signup

---

## Risk & Dependencies

### Critical Path Dependencies

1. **Legal Review** → Privacy Policy & Terms pages → Launch
   - Risk: Legal review takes 1+ week, delays launch
   - Mitigation: Start legal review on Day 1, use template service

2. **Email Service Setup** → Email digest & alerts → Phase 2 QA
   - Risk: SendGrid API issues, email deliverability
   - Mitigation: Test in staging first, use sandbox mode

3. **External API Keys** → RapidAPI & Anthropic in Vercel → Launch QA
   - Risk: Keys expire, quota limits hit
   - Mitigation: Set up monitoring, test in staging before launch

4. **E2E Testing** → All flows pass → Launch approval
   - Risk: Tests are flaky, hard to maintain
   - Mitigation: Focus on smoke tests (happy path), defer edge cases to Phase 3

### Parallel Tracks (No Blocking)

- Privacy Policy + Terms can be drafted while dev is building features
- Resume upload can happen in parallel with interview tracker
- Analytics can be built while E2E tests run

### Known Issues

| Issue | Severity | Mitigation |
|-------|----------|-----------|
| Mobile responsiveness needs work | Medium | Allocate 4h in Phase 2 for responsive design polish |
| Stripe test mode not verified in Vercel | High | Test before launch, ensure webhook pointing is correct |
| Job search sometimes returns stale results (6h cache) | Low | Document in FAQ, users can refresh search |
| PDF parsing fails on image-heavy resumes | Medium | Fallback to manual keyword entry |
| Email deliverability depends on SendGrid reputation | Medium | Monitor bounce rates, adjust send schedule if needed |

---

## Launch Checklist

### Pre-Launch (Day 13)

**Legal & Compliance**
- [ ] Privacy Policy approved by legal counsel
- [ ] Terms of Service approved by legal counsel
- [ ] Privacy Policy + Terms pages live at `/legal/privacy` and `/legal/terms`
- [ ] GDPR/CCPA compliance verified (data export, account deletion working)
- [ ] Cookie banner shows and respects user choice

**Auth & Security**
- [ ] Google OAuth consent screen published (Production mode)
- [ ] All auth flows tested: login, register, OAuth, logout
- [ ] Demo mode tested and working
- [ ] Session management tested (expires correctly, no data leaks)

**External APIs & Services**
- [ ] RapidAPI key in Vercel, job search tested in production
- [ ] Anthropic API key in Vercel, AI draft tested for Pro users
- [ ] Stripe test mode verified: successful charge, failed charge, cancellation
- [ ] SendGrid (or chosen email service) configured, test email sent
- [ ] Supabase database backed up, connection pooler tested

**Features & Functionality**
- [ ] All Phase 0 + Phase 1 + Phase 2 features implemented
- [ ] Resume upload working (PDF accepted, keywords extracted)
- [ ] Job search working (returns results, filters work)
- [ ] Outreach lifecycle tested (add contact, update status, track time)
- [ ] Referral gating tested (can't apply without referral in referral-first mode)
- [ ] Email digest template tested (sends to test email)
- [ ] Real-time alerts working (toast shows for urgent items)

**Testing & QA**
- [ ] E2E smoke tests passing (auth, job CRUD, Stripe)
- [ ] E2E full suite passing (all flows, edge cases, error states)
- [ ] Manual QA on desktop (Chrome, Firefox, Safari)
- [ ] Manual QA on mobile (iOS Safari, Chrome mobile)
- [ ] Accessibility audit passed (WCAG 2.1 AA, axe-core zero violations)
- [ ] Performance audit passed (Lighthouse score > 90 on desktop)
- [ ] No console errors or warnings
- [ ] Error boundary tested (crash gracefully, show user-friendly message)

**Deployment & Infrastructure**
- [ ] Code on main branch, all tests passing
- [ ] Vercel deployment shows "Ready"
- [ ] Environment variables set (all .env vars in Vercel)
- [ ] Database migrations run (Prisma schema pushed to Supabase)
- [ ] DNS pointing to Vercel (if custom domain, else use vercel.app)
- [ ] CDN cache configured (Vercel default is fine)
- [ ] Monitoring set up (Sentry for errors, basic analytics)
- [ ] Backup strategy confirmed (Supabase auto-backups)

**Content & Marketing**
- [ ] Landing page finalized (hero, features, pricing, CTA)
- [ ] Product screenshot/demo recorded
- [ ] README.md updated with features + next steps
- [ ] FAQ page ready (if applicable)
- [ ] Social media posts drafted
- [ ] Email announcement ready to send

**Monitoring & Support**
- [ ] Sentry project configured for error tracking
- [ ] Basic analytics configured (GA4 or Plausible)
- [ ] Email support address configured
- [ ] Status page set up (optional, but recommended)
- [ ] On-call rotation for launch day (someone monitoring errors)

### Launch Day (Day 14)

- [ ] Final smoke test in production
- [ ] Deploy to main branch (if not already live)
- [ ] Verify Vercel build succeeds
- [ ] Test all core flows in production (login, job search, apply)
- [ ] Send launch announcement (email, social, etc.)
- [ ] Monitor Sentry/logs for errors
- [ ] Monitor email delivery (check bounce rates)
- [ ] Monitor Stripe webhooks (confirm charges processing)
- [ ] Check analytics for page views
- [ ] Be ready to hotfix if critical issues arise

### Post-Launch (Days 15+)

- [ ] Phase 3 planning: Apollo.io, CSV import, Insider Program
- [ ] Monitor user feedback (support email, product channel)
- [ ] Track key metrics: signups, jobs created, referrals tracked, applications
- [ ] Weekly retrospective on launch (what went well, what needs fixing)
- [ ] Plan first update (bug fixes, quick wins, user feedback features)

---

## Summary

**Timeline:**
- **Phase 0 (Blockers):** Days 1-3 (25-30h) — Legal, auth, external APIs
- **Phase 1 (V1 Core):** Days 4-10 (35-40h) — Resume, interview, email foundation
- **Phase 2 (Polish):** Days 11-14 (20-25h) — Analytics, digest, launch prep
- **Phase 3 (V2):** Post-launch (50-60h) — Apollo, CSV, Insider Program
- **Phase 4 (V3):** 3-6 months out — Chrome extension, cover letters, etc.

**Total Pre-Launch Effort:** 80-95 hours (2-3 developer weeks)

**Key Decisions Needed (User Gates):**
1. Legal review of Privacy Policy + Terms (start immediately)
2. Email service choice (SendGrid recommended)
3. PDF parsing (pdfjs-dist recommended)
4. Google OAuth publishing (required for launch)
5. External API keys (required for launch)
6. Notification settings UX (dedicate settings page)
7. Apollo.io timing (defer to week 2-3)
8. Community features (launch stats, defer program)

**Launch Blockers Resolved:**
1. Privacy Policy + Terms (legal gate)
2. Account deletion + data export (compliance)
3. Cookie consent (analytics)
4. Google OAuth published (third-party auth)
5. External API keys in Vercel (job search + AI)
6. End-to-end testing passing (QA)

**Maximum Parallelism:**
- Phase 0 tasks can run in parallel (legal drafting + coding + testing)
- Phase 1 tasks have no inter-dependencies (except email service choice)
- Phase 2 tasks are mostly independent (analytics, polish, testing)
- Phase 3 can start immediately post-launch (zero blocking)

---

**Document Owner:** Product Team
**Last Updated:** March 25, 2026
**Next Review:** After Phase 0 completion (Day 3)
