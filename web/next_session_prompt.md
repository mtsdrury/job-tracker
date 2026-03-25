# Next Session Prompt — KnowSomeone

**Last updated:** 2026-03-26 (evening)

## Where We Left Off
Phase 0 COMPLETE. Phase 1 in progress — enhanced user profile and interview tracker are built and deployed. Working on guided apply flow next.

## What's Been Done This Session
- Deployed to Vercel at knowsomeone.vercel.app
- Google OAuth configured (needs consent screen published for public access)
- Stripe webhooks set up (3 events pointing to production)
- Google sign-in button added to login + register pages
- Three research docs produced: Legal Compliance Guide, LinkedIn Integration Research, Implementation Flowchart
- Deep planning interview completed — full feature inventory (33 features, 5 phases)
- **Phase 0 DONE:** Privacy Policy, Terms of Service, account deletion, data export
- **Phase 1 started:** Enhanced user profile (target roles, locations, remote pref, experience level), interview pipeline tracker (6 stages, timeline UI, reflection)
- API keys added to Vercel: RapidAPI (JSearch), Anthropic
- Prisma schema pushed with new User fields + Interview model

## What's In Progress
- Phase 1: Guided apply flow, saved searches, analytics suite

## Key Files
- `/web/IMPLEMENTATION_FLOWCHART.md` — Master plan with phases, tasks, user gates
- `/web/LEGAL_COMPLIANCE_GUIDE.md` — Legal requirements research
- `/web/LINKEDIN_INTEGRATION_RESEARCH.md` — LinkedIn API + people data research
- `/web/PROGRESS_LOG.md` — Running task log
- `/web/IMPLEMENTATION_GUIDE.md` — Architecture + progress tracking

## User Gates Still Needed
- G1: Review generated Privacy Policy + Terms of Service content
- G4: Publish Google OAuth consent screen (user must do in Google Cloud Console)
- G5: Add RapidAPI key + Anthropic API key to Vercel env vars

## Don't Forget
- Register email addresses for legal pages: privacy@knowsomeone.com, support@knowsomeone.com, legal@knowsomeone.com (needs custom domain first)
- These emails are referenced in the Privacy Policy and Terms of Service pages
- Options: set up with custom domain email (Google Workspace, Zoho, etc.) or use a forwarding service

## Active Repo
- Code: `/sessions/intelligent-magical-pasteur/mnt/alenzie--job-tracker` (maps to `C:\Users\kenz2\source\alenzie\job-tracker`)
- Git: `mtsdrury/job-tracker` on GitHub, branch `main`
- Vercel: `mtsdrurys-projects/knowsomeone`, root directory `web`
- Push from user's terminal (this environment can't push)

## Tech Notes
- `.npmrc` has `package-lock=false` for cross-platform Vercel builds
- `prisma.ts` uses `pool as any` cast to fix PrismaPg type mismatch
- Vercel install command override was removed (no longer needed)
- Git lock files tend to appear — user knows to delete them manually
