import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | KnowSomeone",
  description: "Privacy Policy for KnowSomeone - Learn how we collect, use, and protect your data.",
};

const APP_NAME = "KnowSomeone";

export default function PrivacyPolicy() {
  return (
    <article className="prose prose-invert max-w-none">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
        <p className="text-muted">
          Last Updated: March 2026
        </p>
      </div>

      {/* Introduction */}
      <section className="mb-12">
        <p className="text-lg text-muted leading-relaxed">
          At {APP_NAME}, we believe privacy is a fundamental right. This Privacy Policy explains how we collect,
          use, share, and protect your personal information when you use our job search platform. We're committed
          to being transparent about our data practices and giving you control over your information.
        </p>
        <p className="mt-4 text-muted">
          If you have questions about this policy or our privacy practices, you can reach us at{" "}
          <a href="mailto:privacy@knowsomeone.com" className="text-accent hover:text-accent-hover transition-colors">
            privacy@knowsomeone.com
          </a>
          .
        </p>
      </section>

      {/* Information We Collect */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-6">1. Information We Collect</h2>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-3">1.1 Information You Provide Directly</h3>
          <p className="text-muted mb-4">
            When you create an account and use {APP_NAME}, you provide us with:
          </p>
          <ul className="space-y-2 text-muted list-disc list-inside">
            <li><strong className="text-foreground">Account Information:</strong> Email address, name, password (hashed and salted)</li>
            <li><strong className="text-foreground">Job Search Data:</strong> Target companies, job titles, application status, interview notes, salary expectations</li>
            <li><strong className="text-foreground">School & Network Information:</strong> Schools and universities you attended, LinkedIn profile IDs for alumni searches</li>
            <li><strong className="text-foreground">Contact Data:</strong> Names, email addresses, LinkedIn URLs, company affiliations, and notes about professional contacts you add</li>
            <li><strong className="text-foreground">Resume Information:</strong> Resume versions, file uploads, and which version is associated with each application</li>
            <li><strong className="text-foreground">Message Templates:</strong> Custom outreach templates and drafts you create</li>
            <li><strong className="text-foreground">Payment Information:</strong> Billing address and subscription tier (payment card data is processed by Stripe; we never store raw card numbers)</li>
          </ul>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-3">1.2 Information Collected Automatically</h3>
          <p className="text-muted mb-4">
            When you use {APP_NAME}, we automatically collect:
          </p>
          <ul className="space-y-2 text-muted list-disc list-inside">
            <li><strong className="text-foreground">Usage Data:</strong> Pages visited, features used, time spent in the app, clicks, and interactions</li>
            <li><strong className="text-foreground">Technical Data:</strong> IP address, device type, operating system, browser type and version, unique device identifiers</li>
            <li><strong className="text-foreground">Session Data:</strong> Session IDs, cookies, and authentication tokens (essential for keeping you logged in)</li>
            <li><strong className="text-foreground">Timestamp Data:</strong> When you access features, create jobs, add contacts, and update statuses</li>
          </ul>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-3">1.3 Information from Third Parties</h3>
          <p className="text-muted mb-4">
            We receive limited information from third-party services:
          </p>
          <ul className="space-y-2 text-muted list-disc list-inside">
            <li><strong className="text-foreground">Google OAuth:</strong> When you sign in with Google, we receive your name, email address, and profile picture</li>
            <li><strong className="text-foreground">Analytics:</strong> Aggregated usage statistics from our hosting provider</li>
          </ul>
        </div>
      </section>

      {/* How We Use Your Data */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-6">2. How We Use Your Data</h2>

        <p className="text-muted mb-6">
          We use your information only for the following purposes:
        </p>

        <ul className="space-y-3 text-muted list-disc list-inside">
          <li><strong className="text-foreground">Account Management:</strong> Creating and managing your account, authenticating you securely, and resetting passwords</li>
          <li><strong className="text-foreground">Service Delivery:</strong> Providing the job tracker, storing your jobs and contacts, managing your subscription, sending you receipts</li>
          <li><strong className="text-foreground">Communication:</strong> Sending critical account notices (security alerts, billing information), feature updates, and promotional emails (you can opt out anytime)</li>
          <li><strong className="text-foreground">Service Improvement:</strong> Analyzing how you use the app to identify bugs, improve features, and create new functionality</li>
          <li><strong className="text-foreground">AI Features:</strong> If you enable the Chat feature, sending your prompts to Anthropic to generate AI-powered message drafts and insights</li>
          <li><strong className="text-foreground">Legal Compliance:</strong> Responding to legal requests, detecting fraud, and enforcing our Terms of Service</li>
          <li><strong className="text-foreground">Safety & Security:</strong> Protecting against unauthorized access, malicious activity, and data breaches</li>
        </ul>

        <p className="text-muted mt-6">
          We do NOT use your data for automated decision-making that significantly affects you (e.g., we won't deny you
          service based on an algorithm). We also do NOT sell your personal data to third parties.
        </p>
      </section>

      {/* Data Sharing & Third-Party Processors */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-6">3. Data Sharing & Third-Party Processors</h2>

        <p className="text-muted mb-6">
          {APP_NAME} works with the following service providers to deliver our platform. Each has signed a Data
          Processing Agreement committing to protect your data with security standards equal to or exceeding our own:
        </p>

        <div className="space-y-6">
          <div className="border-l-2 border-accent pl-4">
            <h3 className="font-semibold text-foreground mb-2">Supabase (Cloud Database)</h3>
            <p className="text-muted text-sm">
              Stores your account information, job tracker, contacts, and all user data. Supabase is GDPR-compliant,
              implements encryption at rest (AES-256) and in transit (TLS 1.2+), and maintains backups. Data is hosted
              in the US by default; EU data regions available upon request.
            </p>
          </div>

          <div className="border-l-2 border-accent pl-4">
            <h3 className="font-semibold text-foreground mb-2">Vercel (Application Hosting & CDN)</h3>
            <p className="text-muted text-sm">
              Hosts the {APP_NAME} web application, serves content globally, and maintains server logs. Vercel is
              ISO 27001 certified and GDPR-compliant.
            </p>
          </div>

          <div className="border-l-2 border-accent pl-4">
            <h3 className="font-semibold text-foreground mb-2">Stripe (Payment Processing)</h3>
            <p className="text-muted text-sm">
              Processes all subscription payments and billing. Stripe is PCI Level 1 certified (the highest security
              standard for payment processing). {APP_NAME} never touches your credit card data - it goes directly to Stripe's
              secure servers.
            </p>
          </div>

          <div className="border-l-2 border-accent pl-4">
            <h3 className="font-semibold text-foreground mb-2">Anthropic (AI Message Drafting)</h3>
            <p className="text-muted text-sm">
              If you enable the Chat feature, your prompts and job/contact details are sent to Anthropic's Claude API
              for AI-powered message generation and insights. Anthropic does not use your data for model training under
              their commercial terms. Data is encrypted in transit and at rest.
            </p>
          </div>

          <div className="border-l-2 border-accent pl-4">
            <h3 className="font-semibold text-foreground mb-2">Google (Authentication & OAuth)</h3>
            <p className="text-muted text-sm">
              If you sign in with Google, your authentication is handled directly by Google. {APP_NAME} only receives
              your name, email, and profile picture - we never see your password. Google is responsible for securing your
              credentials.
            </p>
          </div>
        </div>

        <p className="text-muted mt-6">
          We do not share your data with marketing companies, data brokers, or third parties for their direct benefit.
          We also do not sell your personal information.
        </p>
      </section>

      {/* Cookies & Tracking */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-6">4. Cookies & Tracking</h2>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-3">What Are Cookies?</h3>
          <p className="text-muted">
            Cookies are small files stored on your device that help us remember information about you, like keeping you
            logged in or remembering your theme preference.
          </p>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-3">Essential Cookies (No Consent Required)</h3>
          <p className="text-muted mb-4">
            These cookies are necessary for {APP_NAME} to function:
          </p>
          <ul className="space-y-2 text-muted list-disc list-inside">
            <li><strong className="text-foreground">Session Cookie:</strong> Keeps you logged in while you use the app; deleted when you close your browser</li>
            <li><strong className="text-foreground">CSRF Token:</strong> Prevents unauthorized requests from other websites; essential for security</li>
            <li><strong className="text-foreground">Preference Cookie:</strong> Remembers your chosen theme (light/dark mode)</li>
          </ul>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-3">Optional Cookies (Consent Required)</h3>
          <p className="text-muted">
            We may use analytics cookies to understand how you use {APP_NAME} and improve our features. You can accept
            or reject these cookies at any time using the cookie banner that appears when you first visit.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">How to Control Cookies</h3>
          <p className="text-muted">
            You can disable cookies in your browser settings, though this may affect {APP_NAME}'s functionality. Some
            cookies (like session and security cookies) cannot be disabled without breaking the app.
          </p>
        </div>
      </section>

      {/* Your Rights & Choices */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-6">5. Your Rights & Choices</h2>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-3">5.1 GDPR Rights (For Users in the EU)</h3>
          <p className="text-muted mb-4">
            If you're in the European Union, GDPR gives you the following rights:
          </p>
          <ul className="space-y-3 text-muted list-disc list-inside">
            <li><strong className="text-foreground">Right of Access:</strong> Request a copy of all personal data {APP_NAME} holds about you</li>
            <li><strong className="text-foreground">Right to Correction:</strong> Request corrections to inaccurate or incomplete data</li>
            <li><strong className="text-foreground">Right to Erasure ("Right to Be Forgotten"):</strong> Request deletion of your data (with some exceptions for legal or contractual obligations)</li>
            <li><strong className="text-foreground">Right to Data Portability:</strong> Request your data in a machine-readable format (JSON or CSV) that you can download or transfer to another service</li>
            <li><strong className="text-foreground">Right to Objection:</strong> Object to certain types of data processing, such as promotional emails</li>
            <li><strong className="text-foreground">Right to Restrict Processing:</strong> Request that we limit how we use your data while you investigate a concern</li>
          </ul>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-3">5.2 CCPA/CPRA Rights (For California Residents)</h3>
          <p className="text-muted mb-4">
            If you're a California resident, the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA)
            grant you these rights:
          </p>
          <ul className="space-y-3 text-muted list-disc list-inside">
            <li><strong className="text-foreground">Right to Know:</strong> Request what personal information {APP_NAME} collects, uses, and shares</li>
            <li><strong className="text-foreground">Right to Delete:</strong> Request deletion of personal information (with legal exceptions)</li>
            <li><strong className="text-foreground">Right to Correct:</strong> Request correction of inaccurate personal information</li>
            <li><strong className="text-foreground">Right to Opt-Out:</strong> Opt out of any "sale" or "sharing" of your personal information (note: {APP_NAME} does not sell or share your data)</li>
            <li><strong className="text-foreground">Right to Limit Use:</strong> Limit how we use your sensitive personal information</li>
            <li><strong className="text-foreground">Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your privacy rights</li>
          </ul>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-3">5.3 Email Communications & Opt-Out</h3>
          <p className="text-muted">
            We send promotional emails (feature updates, special offers) only with your permission. You can unsubscribe
            from promotional emails anytime by clicking the "Unsubscribe" link at the bottom of any email or by
            updating your preferences in your account settings. We will always send critical account emails (security
            alerts, billing information) regardless of your preferences.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">5.4 How to Exercise Your Rights</h3>
          <p className="text-muted">
            To exercise any of these rights, email us at{" "}
            <a href="mailto:privacy@knowsomeone.com" className="text-accent hover:text-accent-hover transition-colors">
              privacy@knowsomeone.com
            </a>
            {" "}with "Data Subject Request" in the subject line. Include:
          </p>
          <ul className="space-y-2 text-muted list-disc list-inside mt-4">
            <li>Your full name and email address</li>
            <li>The specific right you're exercising (access, deletion, correction, etc.)</li>
            <li>Any relevant details (e.g., which data you want to delete)</li>
          </ul>
          <p className="text-muted mt-4">
            We will respond within <strong className="text-foreground">30 days (GDPR)</strong> or{" "}
            <strong className="text-foreground">45 days (CCPA)</strong>, with a possible 30-day extension if your request
            is complex. You may designate an authorized agent to submit requests on your behalf, and we will ask for proof of authorization.
          </p>
        </div>
      </section>

      {/* Data Retention & Deletion */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-6">6. Data Retention & Deletion</h2>

        <p className="text-muted mb-6">
          We keep your data for as long as your account is active. Here's our retention schedule:
        </p>

        <ul className="space-y-3 text-muted list-disc list-inside">
          <li><strong className="text-foreground">Active Accounts:</strong> Your personal data, job tracker, and contacts are retained indefinitely while your account is active</li>
          <li><strong className="text-foreground">Deleted Accounts:</strong> When you delete your account, personal data is permanently deleted within 30 days</li>
          <li><strong className="text-foreground">Backup Copies:</strong> Due to backup systems, deleted data may persist in backups for up to 60 days after deletion</li>
          <li><strong className="text-foreground">Payment Records:</strong> Billing information is retained for 7 years to comply with tax and legal requirements</li>
          <li><strong className="text-foreground">Anonymized Analytics:</strong> Usage statistics are anonymized and retained indefinitely for product improvement</li>
        </ul>

        <p className="text-muted mt-6">
          If you want faster deletion (e.g., immediately after submitting a deletion request), contact us at{" "}
          <a href="mailto:privacy@knowsomeone.com" className="text-accent hover:text-accent-hover transition-colors">
            privacy@knowsomeone.com
          </a>
          .
        </p>
      </section>

      {/* Data Security */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-6">7. Data Security</h2>

        <p className="text-muted mb-6">
          Your data's security is critical to us. We implement industry-standard security measures:
        </p>

        <ul className="space-y-3 text-muted list-disc list-inside">
          <li><strong className="text-foreground">Encryption in Transit:</strong> All data traveling between your device and our servers is encrypted using TLS 1.2+ (HTTPS)</li>
          <li><strong className="text-foreground">Encryption at Rest:</strong> All databases are encrypted using AES-256 encryption</li>
          <li><strong className="text-foreground">Password Security:</strong> Passwords are hashed and salted using industry-standard algorithms (bcrypt); we never store passwords in plain text</li>
          <li><strong className="text-foreground">Access Controls:</strong> Only authorized employees with a legitimate business need can access user data; we implement role-based access controls and the principle of least privilege</li>
          <li><strong className="text-foreground">Regular Security Audits:</strong> We conduct third-party security audits and penetration testing annually</li>
          <li><strong className="text-foreground">Incident Response Plan:</strong> In the unlikely event of a data breach, we will notify affected users and regulatory authorities within the legally required timeframe (72 hours for GDPR, 30 days for CCPA)</li>
        </ul>

        <p className="text-muted mt-6">
          However, no security system is 100% secure. Please protect your password and notify us immediately if you suspect
          unauthorized access to your account.
        </p>
      </section>

      {/* International Data Transfers */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-6">8. International Data Transfers</h2>

        <p className="text-muted">
          {APP_NAME} is based in the United States. If you're in the EU or another jurisdiction, your data may be
          transferred to and stored in the US. We rely on Data Processing Agreements with our processors (Supabase, Vercel,
          Stripe, Anthropic) to ensure adequate protection under Standard Contractual Clauses or similar legal mechanisms.
          If you request an EU data region, Supabase can store your data in eu-west-1 (Ireland).
        </p>

        <p className="text-muted mt-4">
          By using {APP_NAME}, you consent to the transfer of your data to the US and other countries for processing and storage.
        </p>
      </section>

      {/* GDPR-Specific Disclosures */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-6">9. GDPR-Specific Disclosures</h2>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-3">9.1 Lawful Basis for Processing</h3>
          <p className="text-muted mb-4">
            Under GDPR, we process your data based on the following lawful bases:
          </p>
          <ul className="space-y-2 text-muted list-disc list-inside">
            <li><strong className="text-foreground">Contract:</strong> Processing is necessary to provide the {APP_NAME} service you've signed up for (account management, job tracking, contact storage)</li>
            <li><strong className="text-foreground">Legitimate Interest:</strong> We analyze how you use {APP_NAME} to improve features and prevent fraud</li>
            <li><strong className="text-foreground">Consent:</strong> For optional features (Chat, promotional emails), we obtain your explicit consent</li>
          </ul>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-3">9.2 Data Controller vs. Processor</h3>
          <ul className="space-y-3 text-muted list-disc list-inside">
            <li><strong className="text-foreground">KnowSomeone is the Data Controller:</strong> We decide what data to collect and how to use it</li>
            <li><strong className="text-foreground">Supabase, Vercel, Stripe, and Anthropic are Data Processors:</strong> They process data only on our instructions and have signed Data Processing Agreements</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">9.3 Automated Decision-Making</h3>
          <p className="text-muted">
            {APP_NAME} does not use automated decision-making (algorithms or AI) to make significant decisions about you that
            would have legal effects or similarly affect you. Our AI Chat feature generates suggestions only; you decide
            whether to use them.
          </p>
        </div>
      </section>

      {/* CCPA-Specific Disclosures */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-6">10. CCPA-Specific Disclosures</h2>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-3">10.1 Categories of Personal Information Disclosed to Service Providers</h3>
          <p className="text-muted mb-4">
            We disclose the following categories of personal information to service providers:
          </p>
          <ul className="space-y-2 text-muted list-disc list-inside">
            <li><strong className="text-foreground">Identifiers</strong> (name, email) → Supabase, Vercel, Stripe, Anthropic</li>
            <li><strong className="text-foreground">Commercial Information</strong> (job titles, target companies, salary expectations) → Supabase, Vercel, Anthropic</li>
            <li><strong className="text-foreground">Internet/Network Activity</strong> (IP address, device type, usage analytics) → Supabase, Vercel</li>
            <li><strong className="text-foreground">Professional Information</strong> (schools, resume versions) → Supabase, Vercel</li>
          </ul>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-3">10.2 Sales/Sharing of Personal Information</h3>
          <p className="text-muted">
            <strong className="text-foreground">KnowSomeone does not sell or share your personal information.</strong> We do not
            sell data to third parties for their direct marketing or other purposes. If you receive a "Do Not Sell/Share My
            Personal Information" request via Global Privacy Control (GPC), we honor it automatically.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">10.3 Automated Decision-Making Technology (ADMT)</h3>
          <p className="text-muted">
            {APP_NAME} does not use ADMT to make significant decisions about you that have legal effects or similarly affect you.
          </p>
        </div>
      </section>

      {/* Third-Party Contact Data Disclaimer */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-6">11. Third-Party Contact Data Disclaimer</h2>

        <p className="text-muted mb-4">
          When you add professional contacts (names, emails, LinkedIn URLs) to {APP_NAME}, you represent that:
        </p>

        <ul className="space-y-2 text-muted list-disc list-inside">
          <li>You have a lawful basis to collect and store this information (e.g., you met them at work, at a conference, or through a mutual connection)</li>
          <li>You comply with all applicable privacy laws (GDPR, CCPA, etc.) when collecting and using this data</li>
          <li>You will use this contact data only for legitimate networking purposes (job referrals, professional outreach)</li>
          <li>You have not collected this data without consent or through deceptive means</li>
        </ul>

        <p className="text-muted mt-4">
          <strong className="text-foreground">KnowSomeone is not responsible for your compliance with privacy laws in your own outreach.</strong>
          If a contact recipient files a complaint about your messages, you are solely liable. We recommend you follow best GDPR
          best practices: don't send more than one follow-up email to unresponsive contacts within 30 days, honor unsubscribe
          requests immediately, and keep records of consent.
        </p>
      </section>

      {/* Children's Privacy (COPPA) */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-6">12. Children's Privacy</h2>

        <p className="text-muted">
          {APP_NAME} is intended for adults and job seekers age 18 and older. We do not knowingly collect personal information
          from children under 13 (as required by the Children's Online Privacy Protection Act, COPPA). If we discover that a
          child under 13 has created an account, we will delete their account and all associated data immediately.
          Parents or guardians who believe their child has provided us with personal information should contact us at{" "}
          <a href="mailto:privacy@knowsomeone.com" className="text-accent hover:text-accent-hover transition-colors">
            privacy@knowsomeone.com
          </a>
          .
        </p>
      </section>

      {/* AI Features Disclosure */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-6">13. AI Features & Chat Disclosure</h2>

        <p className="text-muted mb-4">
          If you enable the Chat feature in {APP_NAME}, you authorize us to send your prompts and job/contact data to
          Anthropic's Claude API for AI processing. Here's what you should know:
        </p>

        <ul className="space-y-3 text-muted list-disc list-inside">
          <li><strong className="text-foreground">Data Sharing:</strong> Your Chat prompts and relevant context (job details, contact names) are encrypted and sent to Anthropic's servers</li>
          <li><strong className="text-foreground">No Training on Your Data:</strong> Under Anthropic's commercial terms, your conversations are not used to train future AI models</li>
          <li><strong className="text-foreground">Data Encryption:</strong> Data is encrypted in transit (TLS) and at rest by Anthropic</li>
          <li><strong className="text-foreground">Retention:</strong> Anthropic retains conversation data for a limited period to improve services; we recommend not sharing highly sensitive information in Chat</li>
          <li><strong className="text-foreground">Your Responsibility:</strong> Never share passwords, social security numbers, credit card numbers, or other highly sensitive data in Chat prompts</li>
        </ul>

        <p className="text-muted mt-4">
          You can disable Chat at any time in your account settings. All Chat suggestions are optional, and you remain in control
          of your outreach messages.
        </p>
      </section>

      {/* Contact Us */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-6">14. Contact Us</h2>

        <p className="text-muted mb-4">
          Have questions about this Privacy Policy or our data practices? Reach out:
        </p>

        <div className="bg-surface border border-border rounded-lg p-6 mb-6">
          <p className="text-foreground font-semibold mb-2">Privacy Officer</p>
          <p className="text-muted">
            Email:{" "}
            <a href="mailto:privacy@knowsomeone.com" className="text-accent hover:text-accent-hover transition-colors">
              privacy@knowsomeone.com
            </a>
          </p>
          <p className="text-muted mt-2">
            We'll respond to privacy requests within 30 days (GDPR) or 45 days (CCPA).
          </p>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-3">Dispute Resolution</h3>
          <p className="text-muted mb-4">
            If you have concerns about our privacy practices, please contact us first at{" "}
            <a href="mailto:privacy@knowsomeone.com" className="text-accent hover:text-accent-hover transition-colors">
              privacy@knowsomeone.com
            </a>
            . If you're not satisfied:
          </p>
          <ul className="space-y-2 text-muted list-disc list-inside">
            <li><strong className="text-foreground">GDPR (EU users):</strong> You have the right to lodge a complaint with your local data protection authority (DPA)</li>
            <li><strong className="text-foreground">CCPA (California users):</strong> You can contact the California Attorney General at{" "}
              <a href="https://www.ca.gov/about-ca/agencies-departments/attorney-general/" className="text-accent hover:text-accent-hover transition-colors" target="_blank">
                oag.ca.gov
              </a>
            </li>
          </ul>
        </div>
      </section>

      {/* Updates to This Policy */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-6">15. Updates to This Policy</h2>

        <p className="text-muted mb-4">
          We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal
          requirements, or other factors. When we make material changes, we will:
        </p>

        <ul className="space-y-2 text-muted list-disc list-inside">
          <li>Email you 30 days in advance of the changes</li>
          <li>Post the updated policy on this page with a new "Last Updated" date</li>
          <li>Require your explicit consent for significant changes (e.g., new types of data sharing)</li>
        </ul>

        <p className="text-muted mt-4">
          Your continued use of {APP_NAME} after changes take effect means you accept the updated Privacy Policy.
          If you disagree with changes, you can delete your account anytime.
        </p>
      </section>

      {/* Final Note */}
      <section className="border-t border-border pt-12">
        <p className="text-muted text-sm">
          <strong className="text-foreground">Last Updated:</strong> March 2026
        </p>
        <p className="text-muted text-sm mt-2">
          Thank you for trusting {APP_NAME} with your job search journey. We're committed to protecting your privacy
          and giving you control over your data.
        </p>
      </section>
    </article>
  );
}
