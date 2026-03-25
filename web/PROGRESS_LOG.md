# KnowSomeone — Progress Log

This document tracks every task completed during implementation sessions. Updated in real-time.

---

## Phase 0: Launch Blockers

### Task: Privacy Policy Page ✅ DONE
- [x] Created `(legal)` route group layout with back-to-home link, centered max-w-4xl
- [x] Created `/privacy` page — 15 sections covering all GDPR/CCPA requirements
- [x] Covers: data collection, third-party sharing (Supabase/Vercel/Stripe/Anthropic/Google), cookies, user rights, data retention, children's privacy, contact data disclaimer, AI features, security

### Task: Terms of Service Page ✅ DONE
- [x] Created `/terms` page — 16 sections covering all ToS requirements
- [x] Covers: acceptance, service description, accounts, billing ($12/mo/$29/3mo/$49/6mo), acceptable use, user content ownership, third-party contact liability, AI disclaimer, IP, limitation of liability, disclaimers, termination, governing law (Delaware), dispute resolution

### Task: Account Deletion ✅ DONE
- [x] Created `/api/account/delete` DELETE endpoint with cascading Prisma transaction
- [x] Added "Danger Zone" section to settings page
- [x] Confirmation modal requiring user to type "DELETE"
- [x] Signs out user and redirects to landing page after deletion

### Task: Data Export ✅ DONE
- [x] Created `/api/account/export` GET endpoint
- [x] Exports all user data: profile, jobs+outreach, contacts, resumes, templates, summary
- [x] JSON download with Content-Disposition header (`knowsomeone-export-{date}.json`)
- [x] "Export My Data" button added to settings page

### Task: Footer Links ✅ DONE (already existed)
- [x] Privacy and Terms links already in landing page footer
- [ ] Add links to in-app nav/footer (deferred — not blocking)

### Task: E2E Testing
- [ ] Test full user flow: register → onboard → add job → add contact → create outreach → draft message → apply
- [ ] Fix any bugs found

---

## Session Log

### Session: 2026-03-26

**Completed:**
- ✅ Deployed to Vercel (knowsomeone.vercel.app)
- ✅ Google OAuth configured (Client ID + Secret in Vercel)
- ✅ Google sign-in button added to login + register pages
- ✅ Stripe webhooks configured (3 events → production endpoint)
- ✅ Legal Compliance Guide produced (LEGAL_COMPLIANCE_GUIDE.md)
- ✅ LinkedIn Integration Research produced (LINKEDIN_INTEGRATION_RESEARCH.md)
- ✅ Implementation Flowchart produced (IMPLEMENTATION_FLOWCHART.md)
- ✅ Deep planning interview completed (33 features inventoried)
- ✅ IMPLEMENTATION_GUIDE.md updated with current progress

**Phase 0 autonomous build:**
- ✅ Privacy Policy page created (`(legal)/privacy/page.tsx`) — 15 sections, all compliance requirements
- ✅ Terms of Service page created (`(legal)/terms/page.tsx`) — 16 sections, billing/liability/AI covered
- ✅ Legal layout created (`(legal)/layout.tsx`) — centered, back-to-home, no nav
- ✅ Account deletion API (`/api/account/delete`) — cascading Prisma transaction
- ✅ Data export API (`/api/account/export`) — full JSON download
- ✅ Settings page updated — Danger Zone with export + delete buttons + confirmation modal
- ✅ Footer links already existed (Privacy + Terms in landing page footer)

**Remaining Phase 0:**
- ⏳ E2E testing and bug fixes
- ⏳ User gates: Google OAuth consent screen publishing, API keys in Vercel

---

## Phase 1: V1 Core Features

### Task: Enhanced User Profile ✅ DONE
- [x] Added 4 new User fields to Prisma schema: `targetRoles`, `preferredLocations`, `remotePreference`, `experienceLevel`
- [x] New "Profile" section in settings page with tag-style inputs for roles/locations, dropdowns for remote pref/experience
- [x] Settings API updated to handle new fields (GET + PUT)
- [x] New "About You" step added as Step 1 in onboarding wizard (target roles + experience level)
- [x] Onboarding API updated to persist new fields
- [x] **DONE:** `prisma db push` applied

### Task: Interview Pipeline Tracker ✅ DONE
- [x] Added `Interview` model to Prisma schema (17 fields: stage, scheduledAt, interviewer, notes, prepNotes, reflection, outcome)
- [x] Created `/api/interviews` POST route (create interview for a job)
- [x] Created `/api/interviews/[id]` GET/PATCH/DELETE routes
- [x] Interview Pipeline section in job detail page (appears only for applied jobs)
- [x] Timeline view with color-coded stage dots (phone screen, technical, behavioral, onsite, final, other)
- [x] Add Interview inline form (stage, date/time, interviewer, notes)
- [x] Post-interview reflection form (outcome + reflection text, appears after scheduled time passes)
- [x] Outcome badges: Passed (green), Failed (red), Pending (yellow), Cancelled (gray)
- [x] **DONE:** `prisma db push` applied

### Task: Guided Apply Flow ✅ DONE
- [x] Created `ApplyChecklist` component (`components/ui/apply-checklist.tsx`)
- [x] Visual progress indicator (green checkmarks for completed, gray circles for empty)
- [x] Resume version selection dropdown (loads from user's configured resumes)
- [x] Application method dropdown (Company Website, LinkedIn Easy Apply, Email, Recruiter, Other)
- [x] Application URL field (optional)
- [x] Application notes textarea (optional)
- [x] Referral-first mode warning (shows if no outreach, allows override)
- [x] Progress counter ("X of Y steps completed")
- [x] Confirm + Cancel buttons
- [x] Added `applicationMethod` and `applicationUrl` fields to Job schema
- [x] Updated PATCH `/api/jobs/[id]` to handle new fields
- [x] Integrated into job detail page — replaces simple "Mark as Applied" button
- [ ] **NEEDS:** `prisma db push` for new Job fields

### Task: Saved Job Searches ✅ DONE
- [x] Added `SavedSearch` model to Prisma schema (name, query, location, remoteOnly, resultCount)
- [x] Created `/api/saved-searches` GET/POST routes (with free tier limit: 5 searches)
- [x] Created `/api/saved-searches/[id]` DELETE route
- [x] "Save This Search" button on job search page (appears after search, auto-fills criteria)
- [x] Saved Searches sidebar on job search page (click to apply, hover to delete)
- [x] Saved Searches section on dashboard (cards with query info, click to navigate to search)
- [x] Free tier: 5 saved searches, Pro: unlimited
- [ ] **NEEDS:** `prisma db push` for SavedSearch model
