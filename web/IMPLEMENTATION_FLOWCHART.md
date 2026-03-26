# KnowSomeone Implementation Flowchart & Roadmap

**Version:** 2.0
**Updated:** March 26, 2026
**Target Launch:** Within 1-2 weeks
**Audience:** Product team (developer + designer + product)

---

## Table of Contents

1. [Feature Inventory Table](#feature-inventory-table)
2. [Phased Roadmap](#phased-roadmap)
3. [Visual Implementation Flowchart](#visual-implementation-flowchart)
4. [Risk & Dependencies](#risk--dependencies)
5. [Launch Checklist](#launch-checklist)

---

## Feature Inventory Table

| # | Feature | Priority | Status |
|---|---------|----------|--------|
| **PHASE 0: LAUNCH BLOCKERS** |
| 1 | Privacy Policy Page | P0 | DONE |
| 2 | Terms of Service Page | P0 | DONE |
| 3 | Account Deletion (API + UI) | P0 | DONE |
| 4 | Data Export (JSON) | P0 | DONE |
| 5 | Google OAuth Consent Screen | P0 | DONE |
| 6 | RapidAPI Key in Vercel | P0 | DONE |
| 7 | Anthropic API Key in Vercel | P0 | DONE |
| 8 | Deployed to Vercel | P0 | DONE |
| 9 | Stripe Webhooks Configured | P0 | DONE |
| **PHASE 1: V1 CORE FEATURES** |
| 10 | Enhanced User Profile (target roles, location, experience) | P1 | DONE |
| 11 | Interview Pipeline Tracker (full CRUD, stages, timeline) | P1 | DONE |
| 12 | Guided Apply Flow (checklist, resume selector, referral check) | P1 | DONE |
| 13 | Saved Job Searches (API + UI, free tier limit) | P1 | DONE |
| 14 | Full Analytics Suite (8 visualization sections) | P1 | DONE |
| 15 | Resume Upload + Keyword Extraction | P1 | DONE |
| 16 | Interview Prep Questions (Claude-powered, Pro) | P1 | DONE |
| 17 | Post-Interview Reflection | P1 | DONE |
| 18 | Company Email Alert Form | P1 | DONE |
| 19 | Notification System (generation + bell + mark read) | P1 | DONE |
| **PHASE 2: V1 POLISH + V2 FEATURES** |
| 20 | Tone Quiz (15 MC + 3 writing samples, 7 archetypes) | P1 | DONE |
| 21 | AI Message Drafting (tone-aware, writing sample-informed) | P1 | DONE |
| 22 | AI Match Scoring (job vs resume) | P1 | DONE |
| 23 | Apollo.io Contact Enrichment (Pro) | P2 | DONE |
| 24 | CSV/XLSX Job Import (PapaParse + SheetJS) | P2 | DONE |
| 25 | "Got the Job" Celebration (confetti) | P2 | DONE |
| 26 | Unified Jobs Page (My Jobs + Search + Import tabs) | P2 | DONE |
| 27 | Demo Mode (seeded data, reset button) | P2 | DONE |
| 28 | Onboarding Wizard | P2 | DONE |
| 29 | Message Templates (CRUD + placeholders) | P2 | DONE |
| 30 | Strategy Modes (referral-first vs speed-first) | P2 | DONE |
| 31 | Direct Company URL Resolution (follow job board redirects) | P2 | DONE |
| 32 | Find Connections Popup (LinkedIn + popup side by side) | P2 | DONE |
| **PHASE 3: V2 REMAINING (Current Sprint)** |
| 33 | Cover Letter Generation (AI, tone-aware, writing samples) | P1 | DONE |
| 34 | Email Finder Integration (find recruiter/HM emails) | P1 | DONE |
| 35 | Referral Exchange (community opt-in referral network) | P2 | DONE |
| 36 | Community Stats (anonymous aggregated success metrics) | P2 | DONE |
| 37 | Bug Squashing & Manual QA | P1 | IN PROGRESS |
| 38 | E2E Testing (Playwright) | P1 | NOT STARTED |
| **PHASE 4: V3 POWER FEATURES (Post-Launch, 3-6 Months)** |
| 39 | Chrome Extension (side panel for LinkedIn) | P2 | NOT STARTED |
| 40 | Warm Intro Chains (multi-hop connection mapping) | P2 | NOT STARTED |
| 41 | Company Referral Culture Scores (crowdsourced) | P2 | NOT STARTED |
| 42 | Outreach Timing Intelligence (ML on community data) | P3 | NOT STARTED |
| 43 | "Referral Ready" Score (per-job readiness indicator) | P2 | NOT STARTED |
| 44 | Custom Domain (Pro feature) | P3 | NOT STARTED |
| 45 | Advanced Email Integration (send from app, track opens) | P3 | NOT STARTED |

---

## Phased Roadmap

### Phase 0: Launch Blockers -- COMPLETE

All legal, auth, deployment, and external dependency blockers resolved.

- [x] Privacy Policy + Terms of Service pages
- [x] Account deletion API + UI
- [x] Data export (JSON)
- [x] Google OAuth consent screen published + working
- [x] RapidAPI key in Vercel
- [x] Anthropic API key in Vercel
- [x] Stripe webhooks configured
- [x] Deployed to Vercel (knowsomeone.vercel.app)

---

### Phase 1: V1 Core Features -- COMPLETE

All high-impact features that improve the core referral workflow.

- [x] Enhanced user profile (target roles, locations, experience, remote pref)
- [x] Interview pipeline tracker (full CRUD, stages, timeline, reflection)
- [x] Guided apply flow (checklist with resume selector + referral check)
- [x] Saved job searches with free tier limit
- [x] Full analytics suite (8 sections, pure CSS charts)
- [x] Resume upload + keyword extraction
- [x] Interview prep questions (Claude, Pro-gated)
- [x] Company email alert form on job detail
- [x] Notification system (generate + bell + mark read)

---

### Phase 2: V1 Polish + V2 Features -- COMPLETE

Deeper integrations, AI features, UX improvements.

- [x] Tone quiz (15 MC + 3 writing samples, 7 archetypes, 5 tone dimensions)
- [x] AI message drafting (tone-aware, uses writing samples, no em dashes)
- [x] AI match scoring (job description vs resume)
- [x] Apollo.io contact enrichment (Pro, user provides API key)
- [x] CSV/XLSX job import (PapaParse + SheetJS, column mapping)
- [x] "Got the Job" celebration (confetti animation)
- [x] Unified jobs page (My Jobs + Search + Import as tabs)
- [x] Demo mode with seeded data
- [x] Onboarding wizard
- [x] Message templates with CRUD + placeholder substitution
- [x] Strategy modes (referral-first vs speed-first, configurable stalled threshold)
- [x] Direct company URL resolution (follow job board redirect chains)
- [x] Find Connections popup (opens LinkedIn + popup window simultaneously)

---

### Phase 3: V2 Remaining Features (Current Sprint)

**Goal:** Add cover letter generation, email finding, community features, and thorough QA.

#### 3A. Cover Letter Generation -- COMPLETE
- [x] `POST /api/ai/cover-letter` endpoint
- [x] Input: job description + resume keywords + tone profile + writing samples
- [x] Output: full cover letter in the user's natural writing style
- [x] Uses professional format and info-flow but prompted with excerpts from user's writing (excluding typos/slang/unprofessional language)
- [x] Pro-gated feature
- [x] UI: "Generate Cover Letter" button on job detail page with copy + edit
- [x] Saves to job record for later retrieval

#### 3B. Email Finder Integration -- COMPLETE
- [x] Selected Hunter.io (free tier: 25 searches/month, API accessible)
- [x] `POST /api/contacts/find-email` endpoint
- [x] Input: contact name + company domain (auto-guessed if not provided)
- [x] Output: email address with confidence score, auto-saves at >= 50%
- [x] UI: "Find Email" button on contact cards (hidden when email exists)
- [x] Pro-gated feature, user provides own Hunter.io API key in Settings
- [x] Hunter API key field added to Settings page

#### 3C. Referral Exchange (Community) -- COMPLETE
- [x] InsiderProfile model: company, role, department, bio, LinkedIn, max requests, active flag
- [x] ReferralRequest model: requester, insider, target role, message, status, insider note
- [x] Browse insiders with company search + pagination
- [x] Request flow with capacity limits, duplicate prevention, self-referral check
- [x] Insider management: accept/decline requests, add notes
- [x] Privacy: only public profile data exposed until request accepted
- [x] Community nav link added

#### 3D. Community Stats (Anonymous) -- COMPLETE
- [x] Aggregate dashboard: total users, jobs, outreach, insiders, referral requests, completed referrals
- [x] Referral impact comparison: interview rate with vs without referral, multiplier
- [x] Top companies with insiders
- [x] Pipeline stats (applied, interviewing, offers)
- [x] Average days from job add to apply
- [x] UI: dedicated `/community` page with Stats tab

#### 3E. Bug Squashing & QA
- [ ] Manual testing of all flows (auth, jobs, contacts, outreach, billing, AI features)
- [ ] Bug tracker agent logging issues to `bugs/BUG_TRACKER.md`
- [ ] Fix all P0/P1 bugs before launch
- [ ] Mobile responsiveness check
- [ ] Accessibility audit

#### 3F. E2E Testing
- [ ] Playwright test suite for critical paths
- [ ] Auth flows (register, login, Google OAuth, logout)
- [ ] Job CRUD + apply flow
- [ ] Contact + outreach lifecycle
- [ ] Stripe test mode (charge, cancel)
- [ ] Edge cases (deleted contact, demo limits)

---

### Phase 4: V3 Power Features (3-6 Months Post-Launch)

**Goal:** Features that make KnowSomeone the definitive referral platform. These take longer but create massive differentiation.

#### Chrome Extension
- Side panel for LinkedIn browsing
- Add contacts, draft messages, track outreach without leaving LinkedIn
- Syncs with KnowSomeone web app in real time

#### Warm Intro Chains
- Multi-hop connection mapping: "You know Sarah at Stripe, Sarah knows Mike at Google"
- Visualize paths to target companies through existing network
- Suggest optimal intro routes
- Requires community data + LinkedIn connection data

#### Company Referral Culture Scores
- Crowdsourced from community data
- Score companies on: do they actually act on referrals? How fast? What's the success rate?
- "Referral-friendly" badges on job listings
- Helps users prioritize where to invest outreach effort

#### Outreach Timing Intelligence
- ML on aggregated community data
- Best day/time to send outreach messages
- Optimal follow-up intervals
- Which message templates get highest response rates by industry/role
- Requires significant community data volume

#### "Referral Ready" Score
- Per-job readiness indicator
- Factors: do you have connections? Have you messaged them? Is your resume tailored? Cover letter done?
- Visual progress bar on job cards
- Nudges to close gaps before applying

#### Advanced Email Integration
- Send outreach directly from app (Gmail OAuth or Resend)
- Track opens/clicks
- Auto-log email conversations as outreach events
- Thread view within KnowSomeone

#### Custom Domain
- Pro feature: `username.knowsomeone.io`
- Public profile page showing referral availability
- Useful for Insider Program participants

---

## Visual Implementation Flowchart

```
[PHASE 0: BLOCKERS] =================== COMPLETE
     |
[PHASE 1: V1 CORE] ==================== COMPLETE
     |
[PHASE 2: POLISH + V2] ================ COMPLETE
     |
     v
[PHASE 3: V2 REMAINING] =============== CURRENT
     |
     +-- Cover Letter Generation (AI + tone + writing samples)
     |
     +-- Email Finder Integration (Hunter.io or similar)
     |
     +-- Referral Exchange (opt-in community network)
     |
     +-- Community Stats (anonymous aggregated metrics)
     |
     +-- Bug Squashing & Manual QA
     |
     +-- E2E Testing (Playwright)
     |
     +=====[All Phase 3 Complete + QA Pass?]=====
                     |
                     YES --> LAUNCH v2!
                     |
                     v
[PHASE 4: V3 POWER FEATURES] ========== 3-6 MONTHS
     |
     +-- Chrome Extension (LinkedIn side panel)
     |
     +-- Warm Intro Chains (multi-hop connections)
     |
     +-- Company Referral Culture Scores
     |
     +-- Outreach Timing Intelligence (ML)
     |
     +-- "Referral Ready" Score
     |
     +-- Advanced Email Integration (send + track)
     |
     +-- Custom Domain (Pro)
     |
     v
[SCALE & SUSTAIN]
```

---

## Risk & Dependencies

| Risk | Impact | Mitigation |
|------|--------|------------|
| Email finder API free tier limits | Could bottleneck Pro feature | Research multiple providers, implement fallback |
| Community features need critical mass | Stats meaningless with <100 users | Seed with anonymous data, launch Insider Program early |
| Cover letter quality concerns | Users may not trust AI output | Show "edit before using" workflow, let users refine |
| Warm intro chains need LinkedIn data | Can't scrape LinkedIn | Build from user-provided connections only |
| Outreach timing ML needs volume | Not enough data early on | Start with industry benchmarks, switch to community data later |

---

## Launch Checklist

### Pre-Launch (Before v2 launch)
- [ ] All Phase 3 features implemented
- [ ] All P0/P1 bugs fixed (tracked in `bugs/BUG_TRACKER.md`)
- [ ] Manual QA pass on all flows
- [ ] Mobile responsiveness verified
- [ ] E2E tests passing
- [ ] Stripe test mode verified
- [ ] All env vars set in Vercel production

### Launch Day
- [ ] Deploy main branch to Vercel
- [ ] Verify all pages accessible
- [ ] Monitor for errors in logs
- [ ] Test one full user flow in production
- [ ] Send launch announcement

### Post-Launch (Week 1)
- [ ] Monitor error rates
- [ ] Collect user feedback
- [ ] Prioritize Phase 4 features based on demand
- [ ] Begin Chrome extension development
