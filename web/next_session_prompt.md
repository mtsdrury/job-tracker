# Next Session Prompt — KnowSomeone

**Last updated:** 2026-04-06

## Where We Left Off
Phases 0 through 3 are ALL COMPLETE (38 features built). E2E tests passing (Playwright, March 30). Currently working through the **launch checklist** to get to a shippable state.

## What's Been Done
- **Phase 0 DONE:** Privacy Policy, Terms of Service, account deletion, data export, Google OAuth, Stripe webhooks, deployed to Vercel
- **Phase 1 DONE:** Enhanced user profile, interview pipeline tracker, guided apply flow, saved job searches, full analytics suite, resume upload, interview prep, notifications
- **Phase 2 DONE:** Tone quiz, AI message drafting, AI match scoring, Apollo.io enrichment, CSV/XLSX import, confetti, unified jobs page, demo mode, onboarding wizard, message templates, strategy modes, find connections popup
- **Phase 3 DONE:** Cover letter generation, email finder (Hunter.io), referral exchange community, community stats, bug squashing, E2E testing
- **12+ bugs fixed** across multiple sessions
- **E2E tests:** 7 spec files, all passing as of March 30

## Launch Blocklist (discovered April 6 audit)
- [ ] `STRIPE_WEBHOOK_SECRET` is empty in local .env files — check if it's set in Vercel production. Without it, billing webhooks silently fail.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is placeholder ("your-service-role-key-here") in .env.local — resume file storage won't work locally without the real key
- [ ] Google OAuth consent screen — may still be in "Testing" mode (100 user limit). Needs to be published for public launch.
- [ ] Custom domain + email addresses — legal pages reference privacy@knowsomeone.com, support@knowsomeone.com, legal@knowsomeone.com, and noreply@knowsomeone.com (in resend.ts). These need a real domain to function.
- [ ] Stripe is in test mode (sk_test_/pk_test_ keys). Needs production keys for real billing.
- [ ] Manual QA pass on all flows (user's responsibility)
- [ ] Mobile responsiveness looks good in code (responsive breakpoints everywhere, hamburger menu) but needs real-device testing

## What's Next (if launch blockers are cleared)
- Phase 4 power features (post-launch, 3-6 months): Chrome extension, warm intro chains, referral culture scores, outreach timing ML, "Referral Ready" score, advanced email integration, custom domain
- Prioritize Phase 4 based on user feedback after launch

## Key Files
- `/web/IMPLEMENTATION_FLOWCHART.md` — Master plan with phases and feature inventory (v2.0)
- `/web/PROGRESS_LOG.md` — Running task log
- `/web/IMPLEMENTATION_GUIDE.md` — Original vision + technical architecture (NOTE: progress sections are stale past Phase D, but architecture/schema docs are still accurate)
- `/web/bugs/BUG_TRACKER.md` — Bug tracker (0 open bugs)

## Don't Forget
- Register email addresses: privacy@knowsomeone.com, support@knowsomeone.com, legal@knowsomeone.com (needs custom domain)
- noreply@knowsomeone.com is the transactional email "from" address in resend.ts
- Publish Google OAuth consent screen if still in Testing mode
- Vercel Install Command override: `npm install --force`
- `.env.example` updated April 6 with Stripe, Anthropic, Resend, and app URL vars

## Active Repo
- Code: `mtsdrury/job-tracker` on GitHub, branch `main`
- Vercel: `mtsdrurys-projects/knowsomeone`, root directory `web`
- Deployed at: knowsomeone.vercel.app
- Push from user's terminal (sandboxed environments can't push)

## Tech Notes
- `.npmrc` has `package-lock=false` for cross-platform Vercel builds
- `prisma.ts` uses `pool as any` cast to fix PrismaPg type mismatch
- Vercel Install Command override: `npm install --force`
- Node 20 via `.nvmrc`
- Prisma migrations must run via Windows Node (WSL can't reach Supabase direct connection)
