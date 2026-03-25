# KnowSomeone App: Legal Compliance & Implementation Guide

**Last Updated:** March 2026
**Target Launch Audience:** US-based job seekers, with potential EU users
**Critical Compliance Deadline:** Phase 1 must be complete before launch

---

## Executive Summary

KnowSomeone is a SaaS job search platform that collects and processes personal data of three categories:
1. **User data** (account holders): names, emails, job search data, schools, resumes, payment info
2. **Contact data** (non-users): names, emails, LinkedIn URLs, companies (people users are networking with)
3. **Third-party data** shared with: Supabase (data storage), Vercel (hosting), Stripe (payments), Anthropic (AI API), Google (OAuth)

This guide identifies legal compliance obligations across jurisdictions and provides an implementation roadmap.

---

## Part 1: Applicable Laws & Regulations

### 1.1 GDPR (EU General Data Protection Regulation)

**Applicability:** Any EU/EEA resident user data requires GDPR compliance, regardless of company location.

**Key Requirements:**
- Lawful basis for processing (consent, contract, legitimate interest)
- Data Processing Agreements (DPA) with all third-party processors
- User rights: access, correction, deletion, portability, objection (30-day response time)
- Data minimization: collect only necessary data
- Security: encryption at rest/transit, role-based access, regular audits
- Breach notification: within 72 hours to regulatory authority, without undue delay to users
- Privacy by Design: incorporate privacy into system architecture from the start

**Penalties:** Up to €20 million or 4% of global revenue

**Relevant Resources:**
- [GDPR Compliance for SaaS: 2026 Action Plan](https://www.feroot.com/blog/gdpr-saas-compliance-2025/)
- [GDPR for US SaaS Companies: The Complete 2026 Guide](https://www.nwlextech.com/compliance/gdpr-for-us-saas-companies-the-complete-2026-guide/)

---

### 1.2 CCPA & CPRA (California Consumer Privacy Act & California Privacy Rights Act)

**Applicability:** Applies to for-profit companies doing business in California that:
- Collect personal information from California residents AND
- Have annual gross revenues > $25M, OR buy/receive personal information from 100k+ consumers, OR derive 50%+ of revenue from selling/sharing personal info

**2026 Updates (Effective January 1, 2026):**
- Extended historical data access: consumers can request records back to Jan 1, 2022 (or further if you maintain older data)
- Enhanced vendor disclosure: explicitly identify which categories of personal information go to which service providers
- Automated Decision-Making Technology (ADMT): if your app uses AI to make significant decisions, additional compliance rules apply (January 1, 2027 deadline)
- Risk assessments required; cybersecurity audits and annual certifications required
- GPC (Global Privacy Control) signals must be honored: if user browser sends GPC "opt-out" signal, respect it

**Key Consumer Rights:**
- Right to know (access): what data is collected, categories, purposes (45-day response, extendable to 90 days)
- Right to delete: with exceptions for legal/contractual obligations
- Right to correct: inaccurate personal information
- Right to opt-out: of sales or sharing of personal information
- Right to limit: use of sensitive personal information

**Penalties:** Up to $2,500 per violation, $7,500 per intentional violation (CCPA); CPRA adds private right of action

**Relevant Resources:**
- [California Finalizes Regulations to Strengthen Consumers' Privacy](https://cppa.ca.gov/announcements/2025/20250923.html)
- [2026 CCPA Amendments: New Privacy Rules in California](https://www.osano.com/articles/2026-ccpa-amendments)

---

### 1.3 State-Specific Privacy Laws (2026)

**Indiana:** INCDPA effective January 1, 2026

**Key Pattern Across States:** Most state laws grant similar consumer rights (access, delete, opt-out, correction) with similar timelines (30-45 days).

---

### 1.4 Data Breach Notification Laws

**Applicability:** All 50 US states have breach notification laws.

**2026 Key Updates:**
- **California:** 30 calendar days to notify affected residents + 15 days to notify CA Attorney General
- **Oklahoma:** 60 days to notify AG if 500+ residents affected; expanded "personal information" definition to include biometric data

**General Requirements Across States:**
- Notify affected individuals without undue delay
- Maintain documented breach response plan
- Know your state's specific timeline (varies 30-60 days)
- Document discovery date clearly
- Provide credit monitoring offer (recommended)

**Relevant Resources:**
- [Data Breach Notification Laws: A 50-State Survey (2026 Edition)](https://privacyrights.org/resources-tools/reports/data-breach-notification-laws-50-state-survey-2026-edition)
- [Key Breach Notification Updates in California and Oklahoma for 2026](https://www.alstonprivacy.com/key-breach-notification-updates-in-california-and-oklahoma-for-2026)

---

### 1.5 COPPA (Children's Online Privacy Protection Act)

**Applicability:** Only applies if you knowingly collect data from users under 13.

**Status:** Not applicable to KnowSomeone (job search app targeting adult job seekers). **No action needed.**

**Note:** If future features target younger audiences, COPPA applies with:
- Verifiable parental consent required
- Data retention only as long as necessary
- Prohibition on targeted advertising without consent

---

### 1.6 CAN-SPAM Act

**Applicability:** If KnowSomeone sends promotional emails to users (e.g., "upgrade to Pro", "new features").

**Requirements:**
- Accurate subject lines and headers
- Clear identification as advertisement
- Valid physical return address
- Functional unsubscribe mechanism
- Honor opt-out within 10 business days

**Penalties:** Up to $43,280 per violation

**Note:** Transactional emails (password reset, receipt) are exempt.

**Relevant Resources:**
- [CAN-SPAM Act: A Compliance Guide for Business](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)

---

### 1.7 GDPR for B2B Cold Outreach

**Applicability:** Users will draft outreach messages to professional contacts. App should support GDPR-compliant outreach.

**Key Rules:**
- B2B emails are GDPR-subject if they include personal data (name, job title, email with individual identifier)
- Lawful basis: legitimate interest if recipient wouldn't find it unexpected (e.g., recruiter reaching out to other recruiters)
- Data minimization: collect only name, email, job title, company
- Transparency: user must document how they obtained contact info and why outreach is relevant
- 30-day follow-up limit: remove contacts who don't respond within 30 days from first email

**App Implication:** Privacy policy should clarify that users, not KnowSomeone, are responsible for GDPR compliance in their outreach.

**Relevant Resources:**
- [GDPR and B2B Email Marketing: What You Need to Know](https://stripo.email/blog/gdpr-and-b2b-email-marketing-what-you-need-to-know-to-stay-compliant/)
- [GDPR Rules for Cold Email Outreach](https://www.mailforge.ai/blog/gdpr-rules-for-cold-email-outreach)

---

### 1.8 Google OAuth Requirements

**Applicability:** KnowSomeone uses Google OAuth for authentication.

**Key Compliance Requirements:**
- **Brand verification required** before production launch
- **Privacy policy and Terms of Service** must be published and linked in OAuth consent screen
- **Restricted scope verification:** if using sensitive scopes (beyond basic profile), annual security assessment required
- **Secure credential storage:** client secret must be protected like a password
- **HTTPS-only redirect URIs:** all OAuth callbacks must use HTTPS
- **Token security:** never transmit tokens in plaintext; store encrypted at rest
- **Revoke tokens** when no longer needed

**Process:** Register OAuth client in Google Cloud Console → Configure consent screen with verified domain → Add privacy policy/ToS links → Pass brand verification → Test redirect URIs

**Relevant Resources:**
- [OAuth 2.0 Policies](https://developers.google.com/identity/protocols/oauth2/policies)
- [Comply with OAuth 2.0 Policies - Brand Verification](https://developers.google.com/identity/verification/authentication-policy-compliance)

---

### 1.9 Stripe Payment Processing & PCI DSS

**Applicability:** KnowSomeone uses Stripe for subscription billing.

**Key Points:**
- **Stripe is PCI Level 1 certified**, so KnowSomeone doesn't directly handle credit cards
- **Shared responsibility:** KnowSomeone must validate PCI compliance annually
- **Best practice:** Use Stripe Checkout or Elements (tokenized) to avoid handling card data
- **Do NOT store** card data on your servers; redirect to Stripe for payment
- **Annual attestation:** document and confirm PCI compliance each year

**PCI DSS Requirements (from your perspective):**
- Encrypt data in transit (HTTPS)
- Role-based access controls
- Regular security audits
- Incident response plan
- Log access to payment data

**Relevant Resources:**
- [What is PCI DSS Compliance?](https://stripe.com/guides/pci-compliance)
- [PCI Compliance Validation Requirements](https://support.stripe.com/questions/pci-compliance-validation-requirements-depending-on-transaction-volume)

---

### 1.10 ADA Web Accessibility (Title II, not applicable to private SaaS; Title III applies)

**Applicability:** Private businesses must comply with ADA Title III for web accessibility (not just public entities).

**Standard:** WCAG 2.1 Level AA (de facto standard)

**Key Requirements:**
- Alt text for images
- Captions for video/audio
- Text contrast ratio 4.5:1 (minimum)
- Keyboard navigability (all functions accessible via keyboard)
- Screen reader compatibility
- Form labels and error messages

**Timeline:** While government entities have April 2026 deadline, private businesses should begin compliance now; lawsuits are ongoing.

**Relevant Resources:**
- [New Digital Accessibility Requirements in 2026](https://bbklaw.com/resources/new-digital-accessibility-requirements-in-2026)

---

## Part 2: Third-Party Compliance & Data Processing Agreements

### 2.1 Overview: Your Data Processors

KnowSomeone sends user data to these third parties:

| Processor | Data Sent | GDPR DPA | Status | Action |
|-----------|-----------|---------|--------|--------|
| **Supabase** | All user/contact data | Available | Must sign | [Sign DPA before launch](#supabase-dpa) |
| **Vercel** | App logs, analytics (if enabled) | Available | Must sign | [Sign DPA before launch](#vercel-dpa) |
| **Stripe** | Payment info (tokenized, not raw cards) | Available | Must sign | [Confirm Stripe agreement](#stripe-dpa) |
| **Anthropic Claude API** | User prompts/AI requests (optional feature) | Available | Conditional | [Sign if Chat feature enabled](#anthropic-dpa) |
| **Google OAuth** | User identity claims only | N/A (controller) | Must comply | [Verify OAuth compliance](#google-oauth-dpa) |

### 2.2 Supabase Data Processing Agreement

**Status:** Signed DPA required for GDPR compliance

**Steps:**
1. Open ticket in Supabase dashboard or email support@supabase.io requesting DPA
2. Complete PandaDoc signing process to make DPA legally binding
3. **Choose EU data region** (eu-west-1) if any users are EU-based
4. Retain signed copy for audit purposes

**What You're Responsible For:**
- Supabase provides encryption in transit/at rest and breach response
- **You must implement:** user deletion requests, data export, access logging

**Relevant Resources:**
- [Supabase SOC 2 Compliance & DPA](https://supabase.com/docs/guides/security/soc-2-compliance)
- [Supabase Data Processing Addendum](https://supabase.com/legal/dpa)

### 2.3 Vercel Data Processing Agreement

**Status:** Signed DPA required for GDPR compliance

**Steps:**
1. Navigate to https://vercel.com/legal/dpa
2. Execute DPA (digital signature acceptable)
3. Ensure deployment logs don't capture sensitive user data
4. Verify Vercel subprocessors list (automatically updated)

**What Vercel Handles:**
- ISO 27001 certified
- GDPR-compliant data handling
- Supports Data Subject Access Requests (DSARs)
- Maintains subprocessor list

**Your Responsibility:** Disable analytics collection or ensure analytics are GDPR-compliant

**Relevant Resources:**
- [Vercel Data Processing Addendum](https://vercel.com/legal/dpa)
- [Vercel Security & Compliance](https://vercel.com/docs/security/compliance)

### 2.4 Stripe Payment Processing Agreement

**Status:** Review existing Stripe agreement; DPA may be available

**Key Points:**
- Stripe's Service Agreement already includes GDPR compliance language
- Request Data Processing Addendum if processing EU customer data at scale
- Never send raw card data to KnowSomeone servers
- Always use Stripe Checkout or Elements

**Your Responsibility:**
- Annual PCI compliance attestation
- Secure API key management
- Monitor for suspicious transactions

**Relevant Resources:**
- [Stripe Security](https://docs.stripe.com/security)
- [Stripe Integration Security Guide](https://docs.stripe.com/security/guide)

### 2.5 Anthropic Claude API Data Processing (Conditional)

**Status:** Required only if Chat feature is enabled

**Important:** By default, Anthropic can use API prompts for model training unless you have an explicit Data Processing Agreement.

**Steps to Comply:**
1. **Verify API tier:** Only Claude API (not free tier) has data privacy options
2. **Request DPA:** Contact Anthropic if handling EU user data
3. **Zero Data Retention Option:** For healthcare/finance customers, negotiate Zero Data Retention (ZDR) agreement where chats aren't stored
4. **Encrypt prompts:** Never send unencrypted personal data to Anthropic (re-identify sensitive fields)

**What Anthropic Does:**
- Encrypts data in transit and at rest
- Can't access conversations by default (employees restricted)
- Does not sell data to third parties
- Employees can't use conversations for training (with Commercial/Enterprise terms)

**Your Responsibility:**
- Add disclosure to privacy policy: "AI-powered features send prompts to Anthropic for processing"
- Get user consent before using Chat feature (optional feature)
- Recommend users don't share sensitive data in prompts

**Relevant Resources:**
- [Anthropic Privacy Center](https://privacy.claude.com/en/)
- [Claude API Privacy Policy](https://platform.claude.com/docs/en/legal-center/privacy)

### 2.6 Google OAuth (Not a Data Processor, But Still Requires Compliance)

**Status:** Compliance required; no DPA needed (Google is controller for OAuth data)

**Key Compliance Steps:**
1. **Register OAuth Client** in Google Cloud Console
2. **Verify your domain** (required before production)
3. **Set up OAuth Consent Screen** with:
   - App name and logo
   - Links to Privacy Policy and Terms of Service
   - Data disclosure: "We will access your name, email, and profile picture"
4. **Configure redirect URIs** (HTTPS only)
5. **Request brand verification** (Google will review)
6. **Annual security assessment** if using restricted scopes

**Your Privacy Policy Must State:**
- "We use Google OAuth to authenticate users"
- "Google handles your sign-in credentials; we don't see your password"
- Link to Google's privacy policy

**Relevant Resources:**
- [Google OAuth 2.0 Policies](https://developers.google.com/identity/protocols/oauth2/policies)
- [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)

---

## Part 3: Privacy Policy & Data Disclosure

### 3.1 Privacy Policy: What It Must Contain

**Legal Requirement:** Every SaaS app must have a published Privacy Policy linked in the footer and from the login page.

**Required Sections:**

#### 3.1.1 Information Collected
List all data collected and how:
- **Direct from users:** account email, name, password (hashed), job search preferences, school affiliations, resume versions, payment method (Stripe token, not raw card)
- **Third-party identities:** contact names, emails, LinkedIn URLs, company names (user-provided)
- **Automatic collection:** IP address, device type, browser, cookies, page visit logs, feature usage analytics
- **From third parties:** profile data via Google OAuth (name, email, profile picture)

**Example Wording:**
> "We collect the following personal information: (1) Account Information: email address, name, password (hashed and salted), job search stage, target companies; (2) Contact Information: names, email addresses, LinkedIn profile URLs of professional contacts you add; (3) Behavioral Data: pages visited, features used, time spent in app; (4) Technical Data: IP address, device type, browser, cookies, session IDs; (5) Payment Information: Stripe token and billing address (Stripe handles payment processing; we do not store raw card data)."

#### 3.1.2 How Data Is Used
Purpose must align with collection:
- **Account management:** sign in, password reset, profile updates
- **Service delivery:** displaying your job tracker, storing your contacts, managing subscriptions
- **Communication:** important account notices (e.g., security alerts), feature updates, promotional emails (with opt-out)
- **Improvement:** analyzing feature usage, fixing bugs, A/B testing
- **AI features:** generating message drafts via Claude API (only if Chat feature enabled; user consent required)
- **Legal/safety:** complying with subpoenas, investigating fraud

#### 3.1.3 Third-Party Sharing
Disclose all third-party processors:
- **Supabase:** database hosting and backups (encrypted)
- **Vercel:** application hosting and CDN
- **Stripe:** payment processing (PCI Level 1 certified)
- **Anthropic:** AI message drafting (only if user enables Chat feature)
- **Google:** authentication (via OAuth)
- **Monitoring/Analytics:** (if used) e.g., Sentry, DataDog, PostHog (optional; choose privacy-respecting option)

**Example Wording:**
> "We share user data with the following service providers: (1) Supabase (cloud database, GDPR-compliant); (2) Vercel (application hosting, ISO 27001 certified); (3) Stripe (payment processing, PCI Level 1); (4) Anthropic (AI message drafting, only when you enable Chat feature); (5) Google (authentication via OAuth). Each processor has signed a Data Processing Agreement and implements appropriate security measures. We do not sell user data to third parties."

#### 3.1.4 User Rights
Explain how users can exercise their data rights:

**GDPR Rights (for EU users):**
- Right of access: request a copy of all data we hold
- Right to correction: request corrections to inaccurate data
- Right to deletion ("right to be forgotten"): request deletion under certain conditions
- Right to data portability: request export of data in machine-readable format
- Right to objection: opt-out of certain processing

**CCPA/CPRA Rights (for California users):**
- Right to know: what data is collected and how it's used
- Right to delete: request deletion of data
- Right to correct: update inaccurate information
- Right to opt-out: of sales or sharing of data
- Right to limit: use of sensitive personal information

**How to Exercise:**
> "You can exercise your data rights by emailing privacy@knowsomeone.com with 'Data Subject Request' in the subject line. We will respond within 30 days (GDPR) or 45 days (CCPA), with possible 30-day extension. You may designate an authorized agent to submit requests on your behalf."

#### 3.1.5 Data Retention & Deletion
Be specific about how long you keep data:
- **Active accounts:** indefinitely while account is active
- **Deleted accounts:** deleted within 30 days of user request
- **Backups:** may persist for up to 60 days after deletion (due to backup lag)
- **Logs/analytics:** deleted after 12 months
- **Payment records:** retained for 7 years (legal/tax compliance)

**Example Wording:**
> "We retain user data as long as your account is active. Upon account deletion, personal data is deleted within 30 days, except: (1) backup copies may persist for up to 60 days; (2) payment records are retained for 7 years for tax compliance; (3) anonymized analytics are retained indefinitely. Contact us if you need faster deletion."

#### 3.1.6 Data Security
Describe security measures:
- Encryption in transit (HTTPS/TLS)
- Encryption at rest (database encryption)
- Access controls (role-based, least privilege)
- Regular security audits
- Incident response plan

**Example Wording:**
> "We implement industry-standard security measures: (1) Encryption in transit using TLS 1.2+; (2) Encryption at rest using AES-256 for all databases; (3) Role-based access controls limiting employee access; (4) Regular third-party security audits; (5) Annual penetration testing; (6) Incident response plan with breach notification within 72 hours (GDPR) or 30 days (CCPA)."

#### 3.1.7 GDPR-Specific Sections (if any EU users expected)

**Lawful Basis for Processing:**
- **Contract:** processing is necessary to provide the service you signed up for
- **Legitimate interest:** analyzing feature usage to improve the app
- **Consent:** for optional features like Chat and promotional emails

**Data Controller vs. Processor:**
- KnowSomeone = data controller (responsible for your data)
- Supabase, Vercel, Stripe, Anthropic = data processors (act on our instructions)

**Automated Decision-Making (if applicable):**
- If KnowSomeone uses AI/algorithms to make significant decisions about users, disclose this

**Data Transfers:**
- "User data may be stored in US (Supabase default) or EU (if you select EU region). For international transfers, we rely on [Standard Contractual Clauses / Data Processing Agreements]."

#### 3.1.8 CCPA-Specific Sections (if any California users expected)

**Categories of Personal Information Collected:**
- Identifiers (email, name)
- Commercial information (job title, companies, applications)
- Internet/network activity (IP, device, browser, analytics)
- Geolocation data (if IP-based)
- Biometric data (none collected)
- Professional information (job search data)

**Categories of Personal Information Disclosed to Service Providers:**
- Identifiers → Supabase, Vercel, Stripe
- Commercial information → Supabase, Vercel, Anthropic
- Internet activity → Vercel, analytics platform
- Geolocation → (none disclosed)

**Opt-Out of Sales/Sharing:**
If you don't sell/share data, state: "KnowSomeone does not sell or share personal information. If you receive a 'Do Not Sell/Share My Personal Information' request via GPC (Global Privacy Control), we honor it automatically."

**Contact Information:**
- Privacy inquiries: privacy@knowsomeone.com
- California Attorney General: [state that users can contact CA AG about privacy violations]

#### 3.1.9 Contact & Changes
- **Privacy contact:** privacy@knowsomeone.com
- **Dispute resolution:** "If you have concerns, please contact us first. If unsatisfied, GDPR users can complain to their local DPA; CCPA users can contact the California Attorney General."
- **Updates:** "We may update this policy. Material changes will be emailed to you 30 days in advance of taking effect. Continued use after changes = acceptance."
- **Last updated:** [date]

### 3.2 Privacy Policy Template Structure (Implement in Order)

```
1. Introduction / Contact
2. Information We Collect
   2.1 Information You Provide
   2.2 Information Collected Automatically
   2.3 Information from Third Parties
3. How We Use Your Data
4. Data Sharing & Third-Party Processors
5. Your Rights & Choices
   5.1 GDPR Rights (if EU users)
   5.2 CCPA Rights (if CA users)
   5.3 Email Opt-Out & Communications
   5.4 Cookie Preferences
6. Data Retention & Deletion
7. Data Security
8. International Data Transfers
9. GDPR-Specific Disclosures (if applicable)
   9.1 Lawful Basis
   9.2 Data Controller/Processor Roles
10. CCPA-Specific Disclosures (if applicable)
   10.1 Consumer Rights Summary
   10.2 Sales/Sharing Disclosures
   10.3 Automated Decision-Making (if applicable)
11. Children's Privacy (COPPA - state not applicable)
12. Contact Us / Privacy Inquiries
13. Updates & Changes
14. Last Updated
```

**Tool:** Use TermsFeed, Termly, or Iubenda to generate a template; customize for your specific data flows.

---

## Part 4: Terms of Service & Data Protection

### 4.1 Terms of Service: What It Must Contain

**Legal Requirement:** Every SaaS app needs Terms of Service (ToS) that users agree to before creating an account.

**Key Sections:**

#### 4.1.1 Grant of License
Explain what users are allowed to do:
- "You may use KnowSomeone for personal job search only. Unauthorized access, automated scraping, or commercial redistribution is prohibited."

#### 4.1.2 User Responsibilities
- Use only your own email and data
- Don't upload malware, illegal content, or copyrighted material
- Don't attempt to breach security or impersonate others
- Responsible for keeping password confidential

#### 4.1.3 Limitation of Liability
Standard clause:
- "KnowSomeone is provided 'as-is' without warranties"
- "We are not liable for indirect/consequential damages"
- "Our liability is capped at amounts you paid us in the last 12 months"

#### 4.1.4 Indemnification
Users indemnify you against claims arising from their data/use:
- "You agree to indemnify KnowSomeone against claims resulting from your violation of these terms or your use of the service"

#### 4.1.5 Termination
- "You may delete your account anytime"
- "We may terminate accounts violating these terms"
- "Upon termination, your data is deleted within 30 days (GDPR-compliant)"

#### 4.1.6 Governing Law & Dispute Resolution
- "These terms are governed by [your state] law"
- "Disputes shall be resolved by [arbitration / litigation in your state courts]"

#### 4.1.7 Privacy & Data Protection
- Reference your Privacy Policy
- Clarify that KnowSomeone is not responsible for users' GDPR/CCPA compliance in their own outreach

#### 4.1.8 Third-Party Contacts & Liability
**Critical for KnowSomeone:**
- "You represent that you have lawful basis to collect and store the contact data you upload. You are solely responsible for ensuring compliance with privacy laws (GDPR, CCPA, etc.) regarding contacts you've collected."
- "KnowSomeone is not liable for your use of contact data or your outreach messages."
- "You agree not to upload contact data of individuals under 18 or without their consent."

#### 4.1.9 AI Features (if Chat enabled)
- "By using the Chat feature, you authorize us to send your prompts to Anthropic for AI processing"
- "Do not share sensitive data (passwords, SSNs, credit cards) in Chat"
- "You are responsible for ensuring your Chat prompts comply with applicable laws"

#### 4.1.10 Changes to Terms
- "We may update these terms; continued use = acceptance"
- "Material changes will be emailed 30 days in advance"

### 4.2 Data Processing Addendum (DPA) for Enterprise

**When Needed:** If you have enterprise customers in the EU or large California customers.

**What to Include:**
- Roles (you = controller, Supabase/Vercel = processors)
- Processing scope (what data, for how long, where)
- Data subject rights (how you'll handle DSARs)
- Sub-processors list (Supabase, Vercel, Stripe, Anthropic)
- Security obligations
- Data breach notification
- Audit/compliance certification rights

**Tool:** Use a template from Termly or Iubenda; customize with your subprocessor list.

---

## Part 5: Cookie Policy & Consent Banner

### 5.1 Cookie Policy Requirements

**Applicable If:** KnowSomeone uses any cookies or tracking technologies.

**Types of Cookies:**

| Type | Purpose | Requires Consent? |
|------|---------|-------------------|
| **Session cookie** | Keep user logged in | No (essential) |
| **CSRF token** | Prevent cross-site attacks | No (essential) |
| **Preferences** | Remember user theme choice | Recommended (implied consent) |
| **Analytics** (Google Analytics, Posthog) | Track feature usage | **Yes (optional)** |
| **Marketing** (Facebook Pixel, etc.) | Retargeting ads | **Yes (optional)** |

**GDPR Rule:** No non-essential cookies until user explicitly opts in (prior consent model).

**CPA Rule:** Respect GPC (Global Privacy Control) signals if sent by user browser.

### 5.2 Cookie Consent Banner Implementation

**MUST-HAVE Features:**
1. **Display before any non-essential cookies are set**
2. **Three equally prominent options:**
   - "Accept All"
   - "Reject All" (must be single-click, equally prominent)
   - "Customize" (to select specific cookie types)
3. **Granular consent:** users should be able to accept analytics while rejecting marketing

**Example Banner Structure:**
```
[KnowSomeone] uses cookies to enhance your experience.

Essential cookies (always on):
  - Session cookie (keep you logged in)
  - Security token

Optional cookies:
  [X] Analytics (Google Analytics - understand feature usage)
  [ ] Marketing (Retargeting ads)

[Customize]  [Reject All]  [Accept All]

Privacy Policy link
```

**Consent Duration:** Re-ask consent every 6 months (GDPR standard).

**Log Management:** Maintain immutable logs of:
- Timestamp
- User ID (if available)
- Consent choices (which cookies accepted/rejected)
- Banner version shown
- Policy version shown

### 5.3 Essential Cookies (No Consent Needed, But Explain)

Your Privacy Policy must explain why these are necessary:
- **Session cookie:** "Keeps you logged in; deleted when you close browser"
- **CSRF token:** "Prevents unauthorized requests; security-critical"
- **Preference cookie (optional):** "Remembers your theme choice (light/dark mode)"

**Example Disclosure:**
> "Essential cookies are necessary for the service to function and do not require consent. You can disable them in your browser, but KnowSomeone may not work properly. These cookies are deleted when you log out or close your browser."

---

## Part 6: Required Features & Implementation Checklist

### 6.1 User Rights Implementation (GDPR/CCPA Mandatory)

#### 6.1.1 Account Deletion (Right to Erasure)

**Requirement:** Users must be able to delete their account and all associated data.

**Implementation Checklist:**
- [ ] Delete user account form/button in Settings
- [ ] Confirmation prompt: "Are you sure? This is permanent and cannot be undone."
- [ ] Delete all user data from Supabase (name, email, job tracker, contacts)
- [ ] Delete associated payment records after legal retention period (7 years)
- [ ] Delete from email lists (unsubscribe)
- [ ] Delete from third-party processors (Supabase backups deleted within 60 days)
- [ ] Send confirmation email: "Your account has been deleted. Your data will be removed from backups within 60 days."
- [ ] Log deletion event (for audit purposes)

**Timeline:** Complete within 30 days of request (GDPR); automate for instant deletion.

#### 6.1.2 Data Access/Export (Right to Know/Portability)

**Requirement:** Users can download all data they've provided in machine-readable format.

**Implementation Checklist:**
- [ ] "Download My Data" button in Settings
- [ ] Export includes:
  - Account info (name, email, schools, resumes)
  - Job tracker entries (company, role, status, notes)
  - Contact data (names, emails, LinkedIn URLs)
  - Message templates
  - All referral data
- [ ] Format: JSON or CSV (machine-readable, portable)
- [ ] Send as email attachment or prompt download
- [ ] Timeline: Deliver within 30 days (automate for instant)

**Example Response:**
```
/user/export/data_2026_03_25.json
{
  "user": {
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2025-01-01",
    "schools": [...]
  },
  "jobs": [...],
  "contacts": [...],
  "templates": [...]
}
```

#### 6.1.3 Data Correction (Right to Correct/Update)

**Requirement:** Users can update their personal information.

**Implementation Checklist:**
- [ ] Edit profile form (name, email, schools)
- [ ] Save changes immediately to database
- [ ] Confirmation: "Changes saved"
- [ ] No special request process needed (users self-serve)

#### 6.1.4 Opt-Out of Marketing Emails (Right to Object)

**Requirement:** Users can unsubscribe from promotional emails.

**Implementation Checklist:**
- [ ] Email unsubscribe link (in every promotional email)
- [ ] In-app "Email Preferences" toggle (Marketing emails yes/no)
- [ ] Honor unsubscribe within 10 business days
- [ ] Maintain suppression list to prevent re-mailing

#### 6.1.5 Data Subject Access Request (DSAR) System

**Requirement:** Formal process for users to request data (beyond self-service).

**Implementation Checklist:**
- [ ] Email inbox: privacy@knowsomeone.com
- [ ] Automated response: "We received your request and will respond within 30 days"
- [ ] Verify requester identity (match email address, ask security question)
- [ ] Gather data from all sources (Supabase, logs, backups if needed)
- [ ] Compile into machine-readable format
- [ ] Encrypt and send securely (encrypted email or secure download link)
- [ ] Log request, response, and timeline
- [ ] Document rejection reasons if applicable (cannot identify user, frivolous request)

---

### 6.2 Data Security & Breach Response

#### 6.2.1 Encryption Implementation

**Checklist:**
- [ ] HTTPS/TLS 1.2+ for all traffic (enforced)
- [ ] Database encryption at rest (Supabase AES-256)
- [ ] Password hashing (bcrypt, Argon2, NOT MD5/SHA1)
- [ ] API keys/secrets never logged in plaintext
- [ ] Sensitive fields masked in logs (emails, phone numbers)

#### 6.2.2 Access Controls

**Checklist:**
- [ ] Role-based access control (RBAC) for employees
- [ ] Least privilege: employees only see data needed for job
- [ ] API key rotation quarterly
- [ ] Multi-factor authentication (MFA) for admin accounts
- [ ] Session timeout (15-30 min of inactivity)

#### 6.2.3 Breach Response Plan

**Checklist:**
- [ ] Identify breach (monitor for unauthorized access, SQL injection, etc.)
- [ ] Notify Supabase/hosting provider
- [ ] Assess scope (which users affected, what data compromised)
- [ ] Contain breach (reset passwords, revoke API keys)
- [ ] Notify affected users within 30 days (CCPA) or 72 hours (GDPR)
- [ ] Notify regulatory authorities (CA Attorney General if CA users, EU DPA if EU users)
- [ ] Document root cause and remediation
- [ ] Communicate transparency: "We had a breach. Here's what happened, what we're doing, what you should do."

**Breach Notification Template:**
```
Subject: Security Incident Affecting Your KnowSomeone Account

Dear [User],

On [DATE], we discovered a security incident. [BRIEF DESCRIPTION: e.g., "unauthorized access to our database"].

WHAT DATA WAS AFFECTED:
- Names and email addresses
- Job search data
- [List specifically]

WHAT WAS NOT AFFECTED:
- Passwords (they're hashed)
- Payment card data (Stripe handles this, not affected)

WHAT YOU SHOULD DO:
1. Change your KnowSomeone password immediately
2. Consider changing passwords on other sites if you reused the same password
3. Monitor your accounts for suspicious activity

WHAT WE'RE DOING:
1. We've isolated the vulnerability and patched it
2. We're offering 12 months of free credit monitoring
3. We're conducting a third-party security audit

FOR MORE INFO:
Contact privacy@knowsomeone.com or call [support number]

Sincerely,
[Your Name], CEO
```

---

### 6.3 Consent & Disclosure Features

#### 6.3.1 Cookie Consent Banner

**Checklist:**
- [ ] Banner displayed before non-essential cookies set
- [ ] Three options: Accept All, Reject All, Customize
- [ ] Granular consent (analytics yes/no, marketing yes/no)
- [ ] Banner persists every 6 months (re-ask consent)
- [ ] Respect GPC (Global Privacy Control) signals automatically
- [ ] Log user consent choices (timestamp, selections, banner version)

**Tool Recommendation:** Cookiebot, OneTrust, or Termly

#### 6.3.2 Consent for Optional Features

**Chat Feature (AI Drafting):**
- [ ] Before enabling Chat: "By using Chat, you authorize us to send prompts to Anthropic for AI processing. Do not share passwords or sensitive data."
- [ ] Explicit opt-in checkbox
- [ ] Can disable anytime in preferences

**Analytics/Tracking (if you use Google Analytics, PostHog, etc.):**
- [ ] Opt-in to analytics via cookie consent banner
- [ ] Respect user choice
- [ ] No cross-site tracking (unless explicitly disclosed)

#### 6.3.3 Promotional Email Consent

**Checklist:**
- [ ] Sign-up: "I want marketing emails" checkbox (unchecked by default)
- [ ] Every email has unsubscribe link
- [ ] Email preferences page in account settings
- [ ] Honor opt-out within 10 days (CAN-SPAM)

---

### 6.4 Third-Party Disclosures

#### 6.4.1 OAuth Permissions Disclosure

**Checklist:**
- [ ] OAuth consent screen displays: "KnowSomeone will access: name, email, profile picture"
- [ ] Tested that only these scopes are requested
- [ ] Privacy policy mentions: "We use Google OAuth for sign-in"

#### 6.4.2 AI Feature Disclosure

**Checklist:**
- [ ] Chat feature clearly labeled as "AI-powered"
- [ ] Privacy policy: "Chat prompts are sent to Anthropic Claude API for processing"
- [ ] User can see: "Anthropic's privacy policy"
- [ ] Warning: "Do not share sensitive data (SSN, passwords, credit cards)"

#### 6.4.3 Third-Party Processor List

**Checklist:**
- [ ] Privacy policy lists all processors
- [ ] Links to their privacy policies
- [ ] Briefly explains what data each receives

---

## Part 7: Priority Implementation Roadmap

### Phase 1: MVP Compliance (Before Launch) — CRITICAL

**Must be complete before any users sign up:**

1. **Privacy Policy**
   - [ ] Draft and publish at /privacy
   - [ ] Include all sections from Part 3
   - [ ] GDPR sections (if any EU users expected)
   - [ ] CCPA sections (if any CA users expected)

2. **Terms of Service**
   - [ ] Draft and publish at /terms
   - [ ] Include third-party contact liability clause (Part 4.1.8)
   - [ ] Add AI feature disclaimers (if Chat enabled)
   - [ ] Reference Privacy Policy

3. **Cookie Consent Banner**
   - [ ] Implement tool (Cookiebot, OneTrust, or Termly)
   - [ ] Display before any non-essential cookies
   - [ ] Three options: Accept, Reject, Customize
   - [ ] Log consent choices

4. **Account Deletion**
   - [ ] "Delete Account" button in Settings
   - [ ] Confirmation modal
   - [ ] Actually delete from Supabase
   - [ ] Confirmation email

5. **Data Export Feature**
   - [ ] "Download My Data" button in Settings
   - [ ] JSON or CSV export
   - [ ] Email or immediate download
   - [ ] Include all user data

6. **Google OAuth Compliance**
   - [ ] Register OAuth client in Google Cloud
   - [ ] Verify domain
   - [ ] Add privacy policy + ToS to OAuth consent screen
   - [ ] Request brand verification
   - [ ] Test OAuth flow

7. **Supabase DPA**
   - [ ] Request DPA from Supabase
   - [ ] Sign PandaDoc
   - [ ] Retain signed copy
   - [ ] If EU users: select EU-west-1 region

8. **Vercel DPA**
   - [ ] Navigate to Vercel DPA page
   - [ ] Execute DPA
   - [ ] Verify analytics settings (GDPR-compliant or disabled)
   - [ ] Retain signed copy

9. **Stripe Compliance Check**
   - [ ] Use Stripe Checkout (don't handle raw card data)
   - [ ] Verify Stripe agreement includes GDPR clauses
   - [ ] Plan for annual PCI attestation

10. **Breach Response Plan**
    - [ ] Document incident response process
    - [ ] Create breach notification template
    - [ ] Identify notification channels (email, phone)
    - [ ] Know your state's deadline (e.g., 30 days CA, varies by state)

---

### Phase 2: Enhanced Compliance (Post-Launch, Next 90 Days)

1. **Analytics Consent**
   - [ ] If using analytics: implement cookie consent
   - [ ] Or use privacy-respecting analytics (Plausible, Fathom, PostHog GDPR mode)

2. **Anthropic DPA (if Chat enabled)**
   - [ ] Contact Anthropic for DPA
   - [ ] Update privacy policy with Chat data handling
   - [ ] Add warning in Chat UI about sensitive data

3. **Email Suppression List**
   - [ ] Build unsubscribe system
   - [ ] Maintain suppression list
   - [ ] Enforce 10-day CAN-SPAM deadline

4. **Data Subject Access Request (DSAR) System**
   - [ ] Set up privacy@knowsomeone.com inbox
   - [ ] Create DSAR response workflow
   - [ ] Train support team on 30-day deadline
   - [ ] Log all DSARs and responses

5. **Automated Compliance Logging**
   - [ ] Log user deletions (timestamp, user ID)
   - [ ] Log data exports (timestamp, user ID, what was exported)
   - [ ] Log consent changes (timestamp, what changed)
   - [ ] Retain logs for 3 years (audit trail)

6. **Security Audit**
   - [ ] Third-party penetration test
   - [ ] Fix any vulnerabilities
   - [ ] Document security measures for privacy policy

7. **Accessibility Audit (WCAG 2.1 Level AA)**
   - [ ] Test keyboard navigation
   - [ ] Add alt text to images
   - [ ] Ensure 4.5:1 contrast ratio
   - [ ] Test with screen reader

---

### Phase 3: Enterprise Compliance (Later)

1. **Data Processing Addendum (DPA) Template**
   - [ ] Create template for enterprise customers
   - [ ] Include sub-processor list
   - [ ] Define data retention/deletion procedures
   - [ ] Enable for enterprise tier

2. **Vendor Risk Management**
   - [ ] Annual review of Supabase, Vercel, Stripe, Anthropic DPAs
   - [ ] Track any subprocessor changes
   - [ ] Update privacy policy if subprocessors change

3. **GDPR Data Transfer Mechanism**
   - [ ] If EU users in EU-west-1 region: already compliant (data stays in EU)
   - [ ] If US region: use Standard Contractual Clauses (SCCs) in Supabase DPA

4. **Cybersecurity Audit & Annual Certification**
   - [ ] If California users + >$50M revenue: submit attestation to CPPA by April 1, 2030
   - [ ] If California users + >$100M revenue: submit by April 1, 2028
   - [ ] Document audit details and remediation

---

## Part 8: Legal Risks & Mitigation Strategies

### 8.1 Top 5 Legal Risks for KnowSomeone

#### Risk 1: Third-Party Contact Data Liability
**Issue:** Users upload contact information of non-users (LinkedIn contacts, colleagues, etc.). Those contacts may sue if their data is misused.

**Severity:** Medium-High

**Mitigation:**
1. **Terms of Service:** Require users to represent they have lawful basis to collect contact data
2. **Privacy Policy:** Clarify that users, not KnowSomeone, are responsible for GDPR/CCPA compliance in their outreach
3. **Feature Limitation:** Don't auto-upload LinkedIn contacts; require manual entry (shows deliberate action)
4. **In-App Guidance:** "Ensure all contacts have consented to you storing their email. KnowSomeone is not responsible for your use of contact data."
5. **Indemnification Clause:** Users indemnify you against claims from third-party contacts

**Example ToS Language:**
> "You represent and warrant that you have lawfully obtained all contact information you upload and have obtained any necessary consents. You are solely responsible for compliance with privacy laws (GDPR, CCPA, etc.) in your collection and use of contact data. KnowSomeone is not liable for claims arising from your contact data or outreach messages."

---

#### Risk 2: GDPR Right to Erasure (Right to Be Forgotten) Not Properly Implemented
**Issue:** A user requests deletion; you delete from main database but not from backups or third-party processors. GDPR requires "complete" deletion.

**Severity:** High (€20M or 4% global revenue fine)

**Mitigation:**
1. **Supabase Backup Policy:** Request that deleted data is removed from backups within 60 days
2. **Vercel Logs:** Ensure analytics logs don't persist indefinitely
3. **Anthropic Chat History:** If Chat feature enabled, confirm chats are deleted when user deletes account
4. **Process:** When user requests deletion, immediately delete from production database AND notify processors to delete from their systems
5. **Confirmation:** Send user email: "Your data has been deleted. Backup copies will be purged within 60 days."

---

#### Risk 3: Anthropic API Data Training (If Chat Feature Enabled)
**Issue:** If you don't have explicit agreement with Anthropic, they can train their models on your users' prompts.

**Severity:** High (privacy breach, user trust)

**Mitigation:**
1. **Get DPA:** Contact Anthropic before enabling Chat feature; request DPA prohibiting training
2. **Disclose in Privacy Policy:** "Chat prompts are sent to Anthropic for processing. Anthropic does not train models on your prompts (Commercial tier agreement)."
3. **User Consent:** Before Chat is enabled, show: "Chat feature will send your prompts to Anthropic. Do not share sensitive data."
4. **Zero Data Retention (Optional):** For highly sensitive users, offer ZDR option where chats aren't stored

---

#### Risk 4: Missed Breach Notification Deadline
**Issue:** You're breached but don't notify users within the deadline (30 days CA, 72 hours GDPR, varies by state).

**Severity:** Critical (significant fines + class-action exposure)

**Mitigation:**
1. **Breach Response Plan:** Document exact steps from discovery to notification
2. **Set Reminders:** Automated alerts if breach discovered (day 1 = email drafted, day 5 = legal review, day 7 = send notifications)
3. **Pre-Written Templates:** Have breach notification email ready (Part 6.2.3)
4. **Legal Review:** Have lawyer review notification before sending
5. **Multi-Channel:** Email primary, phone/SMS backup
6. **Documentation:** Log everything: discovery date, notification dates, affected users, regulatory notifications

---

#### Risk 5: Inadequate Cookie Consent (GDPR Violation)
**Issue:** Cookies are set before consent, or consent banner doesn't provide genuine choice ("Accept All" more prominent than "Reject All").

**Severity:** High (millions in CNIL fines; see Facebook/Google examples)

**Mitigation:**
1. **Pre-Consent Testing:** Verify no non-essential cookies set before user consents
2. **Equal Prominence:** "Accept All" and "Reject All" buttons must be identical in size, color, prominence
3. **Granular Consent:** User must be able to accept analytics while rejecting marketing
4. **Respect GPC:** Automatically honor Global Privacy Control signals
5. **Immutable Logs:** Document every consent interaction (timestamp, user ID, choices, banner version)

---

### 8.2 Compliance Gaps & Edge Cases

#### Edge Case 1: EU User with US Account
**Scenario:** KnowSomeone is US-based, but an EU resident creates an account.

**Answer:** GDPR applies. You must:
- Offer data in machine-readable format
- Honor deletion within 30 days
- Implement DPA with processors
- Respect user rights globally (not just US users)

**Mitigation:** Default to GDPR compliance for all users (it's stricter anyway). If you're GDPR-compliant, you're CCPA-compliant by default.

---

#### Edge Case 2: Contact Files CSV Upload
**Scenario:** User uploads a CSV of contacts from LinkedIn or email. Those contacts are non-users.

**Answer:** Those contacts have privacy rights under GDPR/CCPA, but they're not your users. You're a "data processor" on behalf of the user (who is the "data controller").

**Mitigation:**
1. **Privacy Policy:** "Users are responsible for lawful collection of contact data. KnowSomeone processes this data only on users' behalf."
2. **ToS:** Users represent they have consent from contacts to store their data
3. **No Direct Marketing:** KnowSomeone doesn't contact those people directly; only users do
4. **Data Minimization:** Only collect name, email, company (not resume, salary, etc.)

---

#### Edge Case 3: Payment Info & PCI DSS
**Scenario:** User pays via Stripe. Who handles compliance?

**Answer:** Stripe is PCI Level 1 certified. You're not handling credit card data if you use Stripe Checkout.

**Mitigation:**
1. **Never store raw card data** (use Stripe Checkout)
2. **Annual PCI attestation:** Self-assess your own security (encryption, access controls, logs)
3. **Use Stripe Checkout:** Recommended; Stripe handles compliance
4. **Avoid Stripe Elements + custom forms:** More PCI burden on you

---

#### Edge Case 4: Demo Mode with Fake Data
**Scenario:** Demo account created with fake user data to show features.

**Answer:** As long as it's truly fake (no real person's data), no privacy law applies. But be careful.

**Mitigation:**
1. **Mark Demo Data Clearly:** "This is a demo account with fake data"
2. **Don't Show Real Names:** Use "Jane Doe", "Acme Corp", not real names
3. **Delete Demo Data:** When user creates real account, delete demo data
4. **No Sharing of Demo Data:** Don't analyze demo data in aggregate reporting

---

#### Edge Case 5: California "Do Not Sell My Personal Information" Button
**Scenario:** CCPA requires a "Do Not Sell My Personal Information" button if you sell/share data.

**Answer:** If KnowSomeone doesn't sell data to third parties, you don't need a button. BUT:
- Explain in privacy policy clearly
- Provide an opt-out mechanism for GPC signals (automatic)

**Mitigation:**
1. **Privacy Policy:** "KnowSomeone does not sell or share personal information with third parties. We use processors (Supabase, Vercel, Stripe) only to deliver the service, not for their own use."
2. **GPC Support:** Automatically detect and honor GPC signals (no opt-in banner needed if you don't track/sell)

---

## Part 9: Must-Fix-Before-Launch Checklist

These are non-negotiable; **do not launch without these:**

- [ ] **Privacy Policy** published at /privacy (not just in ToS)
  - Includes all data types
  - Includes all processors
  - GDPR sections (if any EU users expected)
  - CCPA sections (if any CA users expected)

- [ ] **Terms of Service** published at /terms
  - References Privacy Policy
  - Includes third-party contact liability (users responsible for GDPR compliance)
  - Includes AI feature disclaimers (if Chat enabled)

- [ ] **Account Deletion** feature
  - Users can delete their account
  - Actually deletes data from Supabase
  - Sends confirmation email
  - Timeline: within 30 days (can be instant)

- [ ] **Data Export** feature
  - Users can download their data
  - Format: JSON or CSV
  - Includes all user-provided data
  - Timeline: within 30 days (can be instant)

- [ ] **Cookie Consent Banner**
  - Displays before any non-essential cookies
  - Three options: Accept, Reject, Customize
  - Respects user choice
  - Logs consent

- [ ] **Google OAuth Compliance**
  - OAuth client registered in Google Cloud
  - Domain verified
  - Privacy Policy + ToS linked in OAuth consent screen
  - Brand verification requested
  - HTTPS-only redirect URIs

- [ ] **Supabase DPA Signed**
  - DPA requested and executed
  - Signed copy retained
  - If EU users: EU-west-1 region selected

- [ ] **Vercel DPA Signed**
  - DPA executed
  - Signed copy retained

- [ ] **Stripe Compliance Confirmed**
  - Using Stripe Checkout (no raw card data)
  - Stripe agreement reviewed for GDPR language

- [ ] **Anthropic DPA (if Chat enabled)**
  - DPA signed with Anthropic
  - Chat feature has opt-in consent
  - Warning about sensitive data

- [ ] **Breach Response Plan**
  - Documented incident response process
  - Notification templates drafted
  - Legal review completed
  - Team trained on notification deadlines

- [ ] **HTTPS Enforced**
  - All traffic is HTTPS/TLS 1.2+
  - No HTTP fallback

- [ ] **Passwords Hashed**
  - Bcrypt or Argon2 (not MD5, SHA1, SHA256 without salt)

- [ ] **Unsubscribe Links in Emails**
  - Every marketing email has unsubscribe link
  - Unsubscribe actually works (removes from mailing list)

---

## Part 10: Legal Compliance Beyond Phase 1

### Ongoing (Quarterly)

- [ ] Review and update third-party processor list
- [ ] Check for Supabase, Vercel, Stripe, Anthropic DPA updates
- [ ] Audit cookie consent logs
- [ ] Review any data subject access requests
- [ ] Monitor for security vulnerabilities

### Annual

- [ ] Update Privacy Policy (review for accuracy)
- [ ] PCI DSS self-assessment (Stripe compliance)
- [ ] Security audit / penetration test
- [ ] Review data retention policy (delete as per schedule)
- [ ] Verify GDPR/CCPA compliance (test DSAR, data export, deletion)
- [ ] Re-request brand verification (Google OAuth)

### As Features Change

- [ ] **New AI feature?** Get Anthropic DPA
- [ ] **New analytics tool?** Update Privacy Policy and cookie consent
- [ ] **New email campaigns?** Add unsubscribe links
- [ ] **New processor (Twilio, AWS, etc.)?** Get DPA and update Privacy Policy

---

## Part 11: Recommended Tools & Services

### Privacy & Compliance Platforms
- **Termly:** Privacy Policy/Cookie Policy/ToS generator + consent management
- **OneTrust:** Cookie consent + vendor management + DSAR workflow
- **Cookiebot:** Cookie consent + GPC support (Recommended for GDPR)
- **iubenda:** Privacy policy + cookie consent + audit trail

### Security & Monitoring
- **Sentry:** Error tracking (be careful not to log sensitive data)
- **Vercel Analytics:** Built-in, GDPR-compliant (no third-party cookies)
- **Plausible Analytics:** Privacy-respecting alternative to Google Analytics
- **PostHog:** Product analytics with GDPR mode enabled

### Legal Documents
- **TermsFeed:** Templates for SaaS Privacy Policy, ToS, DPA
- **LegalZoom:** Custom DPA review (hire lawyer for enterprise DPA)
- **Geniusee:** GDPR compliance consulting

### Vendor Management
- **OneTrust:** Subprocessor tracking
- **Vendorful:** Vendor risk assessment
- **Bisk:** Audit trail for compliance (SOC 2, ISO 27001 tracking)

---

## Part 12: Final Checklist Before Launch

### Legal Documents
- [ ] Privacy Policy (comprehensive, all sections, all processors)
- [ ] Terms of Service (third-party contact liability, AI disclaimers)
- [ ] Cookie Policy (if using cookies)
- [ ] Supabase DPA (signed)
- [ ] Vercel DPA (signed)
- [ ] Anthropic DPA (signed, if Chat enabled)

### User Features
- [ ] Account deletion (Settings > Delete Account)
- [ ] Data export (Settings > Download My Data)
- [ ] Email preferences (opt-out of marketing)
- [ ] Cookie consent banner (before non-essential cookies)
- [ ] Password reset (uses email)
- [ ] MFA (for admin accounts)

### Technical Compliance
- [ ] HTTPS/TLS 1.2+ enforced
- [ ] Passwords hashed (bcrypt/Argon2)
- [ ] No sensitive data in logs
- [ ] API keys secure (rotated quarterly)
- [ ] Database encrypted at rest
- [ ] Backups encrypted

### Privacy & Security
- [ ] Google OAuth configured (domain verified, privacy policy linked)
- [ ] Stripe Checkout (no raw card data)
- [ ] Breach response plan documented
- [ ] Security audit completed (or scheduled)
- [ ] ADA accessibility tested (WCAG 2.1 Level AA)

### Monitoring & Response
- [ ] Privacy contact email (privacy@knowsomeone.com)
- [ ] Incident response team identified
- [ ] Breach notification template drafted
- [ ] DSAR workflow documented
- [ ] Data retention schedule (delete old data per policy)

---

## Summary: Phase 1 Hard Deadline

**All items in Part 9 (Must-Fix-Before-Launch Checklist) must be complete before you accept your first paid user. Launch with incomplete legal infrastructure is a significant liability.**

**Estimated Effort:**
- Privacy Policy: 4-6 hours (with Termly template)
- Terms of Service: 3-4 hours
- Account deletion & data export: 8-12 hours
- Cookie consent: 2-3 hours (using OneTrust/Cookiebot)
- DPA reviews & signing: 2-3 hours
- Testing & documentation: 4-6 hours

**Total Phase 1: ~30-40 hours over 2-3 weeks**

---

## References & Resources

### GDPR & International Privacy
- [GDPR Compliance for SaaS: 2026 Action Plan](https://www.feroot.com/blog/gdpr-saas-compliance-2025/)
- [GDPR for US SaaS Companies: The Complete 2026 Guide](https://www.nwlextech.com/compliance/gdpr-for-us-saas-companies-the-complete-2026-guide/)
- [Right to Be Forgotten - GDPR Article 17](https://gdpr-info.eu/art-17-gdpr/)

### CCPA & California Privacy
- [California Finalizes Regulations to Strengthen Consumers' Privacy](https://cppa.ca.gov/announcements/2025/20250923.html)
- [2026 CCPA Amendments: New Privacy Rules in California](https://www.osano.com/articles/2026-ccpa-amendments)
- [CCPA Requirements 2026: Complete Compliance Guide](https://secureprivacy.ai/blog/ccpa-requirements-2026-complete-compliance-guide)

### Privacy Policy & Terms
- [Legal Requirements for SaaS](https://www.termsfeed.com/blog/legal-requirements-saas/)
- [SaaS Privacy Policy Requirements](https://www.cookieyes.com/blog/saas-privacy-policy/)

### Payment & Security
- [What is PCI DSS Compliance?](https://stripe.com/guides/pci-compliance)
- [Stripe Security & Compliance](https://docs.stripe.com/security)

### Third-Party Data & Processors
- [What You Must Know About 'Third Parties' Under GDPR and CCPA](https://iapp.org/news/a/what-you-must-know-about-third-parties-under-the-gdpr-ccpa)
- [Supabase SOC 2 Compliance & DPA](https://supabase.com/docs/guides/security/soc-2-compliance)
- [Vercel Data Processing Addendum](https://vercel.com/legal/dpa)

### Data Breach & Notification
- [Data Breach Notification Laws: A 50-State Survey (2026)](https://privacyrights.org/resources-tools/reports/data-breach-notification-laws-50-state-survey-2026-edition)
- [Key Breach Notification Updates in California and Oklahoma for 2026](https://www.alstonprivacy.com/key-breach-notification-updates-in-california-and-oklahoma-for-2026)

### Cookie Consent
- [What Are the GDPR Cookie Consent Requirements?](https://cookiechimp.com/guides/regulations/eu_gdpr_eprivacy)
- [Cookie Consent Implementation: 2026 Guide](https://secureprivacy.ai/blog/cookie-consent-implementation/)

### Google OAuth
- [OAuth 2.0 Policies](https://developers.google.com/identity/protocols/oauth2/policies)
- [Comply with OAuth 2.0 Policies](https://developers.google.com/identity/verification/authentication-policy-compliance)

### Anthropic & AI APIs
- [Anthropic Privacy Center](https://privacy.claude.com/en/)
- [Claude API Privacy Policy](https://platform.claude.com/docs/en/legal-center/privacy)

### Email Marketing Compliance
- [GDPR and B2B Email Marketing](https://stripo.email/blog/gdpr-and-b2b-email-marketing-what-you-need-to-know-to-stay-compliant/)
- [CAN-SPAM Act: Compliance Guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)

### Accessibility
- [New Digital Accessibility Requirements in 2026](https://bbklaw.com/resources/new-digital-accessibility-requirements-in-2026)

---

**End of Legal Compliance Guide**

**Document Version:** 1.0
**Last Updated:** March 2026
**Next Review:** June 2026 (quarterly review recommended)
