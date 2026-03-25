# Next Session Prompt — KnowSomeone

**Last updated:** 2026-03-25 (evening)

## Where We Left Off
Phase 0 and Phase 1 COMPLETE. All features built, deployed, and bug-fixed. Google OAuth working. Ready for Phase 2 or polish/launch prep.

## What's Been Done
- Deployed to Vercel at knowsomeone.vercel.app
- Google OAuth fully working (account linking for existing users)
- Stripe webhooks set up (3 events pointing to production)
- **Phase 0 DONE:** Privacy Policy, Terms of Service, account deletion, data export
- **Phase 1 DONE:** Enhanced user profile, interview pipeline tracker, guided apply flow, saved job searches, full analytics suite
- **12 bugs fixed** in E2E audit session (type errors, PATCH route, analytics calculations, free tier bypass, null crashes, em dashes)

## What's Next
- Phase 2 features: personality/tone quiz, Apollo.io integration, LinkedIn deep linking, celebration flow, CSV import
- Polish: landing page refinement, mobile responsiveness, loading states
- Launch prep: custom domain, email addresses, SEO

## Key Files
- `/web/IMPLEMENTATION_FLOWCHART.md` — Master plan with phases, tasks, user gates
- `/web/PROGRESS_LOG.md` — Running task log

## Don't Forget
- Register email addresses: privacy@knowsomeone.com, support@knowsomeone.com, legal@knowsomeone.com (needs custom domain)
- Publish Google OAuth consent screen if still in Testing mode
- Vercel Install Command override: `npm install --force`

## Active Repo
- Code: `/sessions/intelligent-magical-pasteur/mnt/alenzie--job-tracker`
- Git: `mtsdrury/job-tracker` on GitHub, branch `main`
- Vercel: `mtsdrurys-projects/knowsomeone`, root directory `web`
- Push from user's terminal (this environment can't push)

## Tech Notes
- `.npmrc` has `package-lock=false` for cross-platform Vercel builds
- `prisma.ts` uses `pool as any` cast to fix PrismaPg type mismatch
- Vercel Install Command override: `npm install --force`
