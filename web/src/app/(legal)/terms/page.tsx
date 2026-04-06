import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "KnowSomeone terms of service, billing policies, and user responsibilities.",
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Container */}
      <div className="mx-auto max-w-3xl px-6 py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground md:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-4 text-sm text-muted">
            Last Updated: April 2026
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none space-y-8 text-foreground">
          {/* Section 1: Acceptance */}
          <section>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              1. Acceptance of Terms
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              By accessing, using, or registering for KnowSomeone (the "Service"),
              you agree to be bound by these Terms of Service ("Terms"). If you do
              not agree to these Terms, you may not use the Service. KnowSomeone
              reserves the right to modify these Terms at any time. Your continued
              use of the Service following the posting of updated Terms constitutes
              your acceptance of such modifications.
            </p>
          </section>

          {/* Section 2: Description of Service */}
          <section>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              2. Description of Service
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              KnowSomeone is a referral-first job search platform designed to help
              job seekers track their applications, manage their professional
              networks, and coordinate outreach to connection points at target
              companies. The Service includes:
            </p>
            <ul className="mt-4 space-y-2 text-muted">
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>Job tracking and application management</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>Contact and referral management</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>Message template drafting and customization</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>Pipeline analytics and insights</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>
                  Optional AI-powered message suggestions (Pro tier)
                </span>
              </li>
            </ul>
          </section>

          {/* Section 3: Account Registration & Security */}
          <section>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              3. Account Registration and Security
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              To use KnowSomeone, you must create an account with accurate, current,
              and complete information. You are responsible for:
            </p>
            <ul className="mt-4 space-y-2 text-muted">
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>Maintaining the confidentiality of your account credentials</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>Promptly notifying KnowSomeone of unauthorized access</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>
                  All activity that occurs under your account, whether authorized
                  or not
                </span>
              </li>
            </ul>
            <p className="mt-4 leading-relaxed text-muted">
              KnowSomeone will not be liable for loss or damage from your failure to
              safeguard your password.
            </p>
          </section>

          {/* Section 4: Billing & Pricing */}
          <section>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              4. Billing and Pricing
            </h2>
            <h3 className="mt-6 text-lg font-semibold text-foreground">
              4.1 Free Tier
            </h3>
            <p className="mt-2 leading-relaxed text-muted">
              KnowSomeone offers a free tier that includes tracking up to 25 jobs,
              full referral workflow, message templates, pipeline dashboard, and
              smart nudges. The free tier may be modified or discontinued at any
              time at KnowSomeone's sole discretion.
            </p>

            <h3 className="mt-6 text-lg font-semibold text-foreground">
              4.2 Pro Tier Pricing
            </h3>
            <p className="mt-2 leading-relaxed text-muted">
              Pro tier pricing options are:
            </p>
            <ul className="mt-3 space-y-2 text-muted">
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>$12 per month (recurring monthly subscription)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>$29 for three months (non-recurring)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>$49 for six months (non-recurring)</span>
              </li>
            </ul>
            <p className="mt-4 leading-relaxed text-muted">
              Prices are in USD and may be subject to applicable taxes and fees.
            </p>

            <h3 className="mt-6 text-lg font-semibold text-foreground">
              4.3 Payment and Billing
            </h3>
            <p className="mt-2 leading-relaxed text-muted">
              You authorize KnowSomeone to charge your selected payment method for
              the tier you choose. Billing occurs at the beginning of your billing
              cycle and continues unless you cancel your subscription. For monthly
              subscriptions, you may cancel anytime through your account settings;
              cancellation takes effect at the end of the current billing period.
              Non-recurring bundle purchases (3-month and 6-month plans) are final
              and non-refundable.
            </p>

            <h3 className="mt-6 text-lg font-semibold text-foreground">
              4.4 Refund Policy
            </h3>
            <p className="mt-2 leading-relaxed text-muted">
              Monthly subscriptions may be cancelled at any time, with no further
              charges after the cancellation date. Non-recurring bundle purchases
              (3-month and 6-month plans) are non-refundable. Refunds for
              unauthorized charges must be requested within 30 days of the charge
              date. KnowSomeone reserves the right to issue refunds at its sole
              discretion.
            </p>
          </section>

          {/* Section 5: Acceptable Use Policy */}
          <section>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              5. Acceptable Use Policy
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              You agree not to use KnowSomeone for any unlawful or prohibited
              purposes. Prohibited uses include, but are not limited to:
            </p>
            <ul className="mt-4 space-y-2 text-muted">
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>
                  Harassing, threatening, defaming, or discriminating against
                  others
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>
                  Accessing, probing, or testing the Service's security without
                  authorization
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>
                  Uploading viruses, malware, or malicious code
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>
                  Automating data scraping or bulk downloading of contact
                  information
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>
                  Impersonating another person or organization
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>
                  Using the Service to facilitate illegal activity, fraud, or
                  deception
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>
                  Violating the intellectual property rights of others
                </span>
              </li>
            </ul>
            <p className="mt-4 leading-relaxed text-muted">
              KnowSomeone reserves the right to suspend or terminate your account
              for violations of this policy.
            </p>
          </section>

          {/* Section 6: User Content and Data Ownership */}
          <section>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              6. User Content and Data Ownership
            </h2>
            <h3 className="mt-6 text-lg font-semibold text-foreground">
              6.1 Your Data
            </h3>
            <p className="mt-2 leading-relaxed text-muted">
              You retain all rights to data you upload or enter into KnowSomeone,
              including job details, personal notes, resume versions, and school
              information. You grant KnowSomeone a worldwide, non-exclusive license
              to use, reproduce, and display this data to provide the Service and
              improve our features.
            </p>

            <h3 className="mt-6 text-lg font-semibold text-foreground">
              6.2 Contact Information
            </h3>
            <p className="mt-2 leading-relaxed text-muted">
              You may add contact information about other individuals (referrals,
              professional connections) to your KnowSomeone account. You represent
              and warrant that:
            </p>
            <ul className="mt-3 space-y-2 text-muted">
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>
                  You have a legitimate basis for storing and processing this
                  information
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>
                  You have obtained consent or have a lawful basis to collect and
                  store personal data about these individuals, in compliance with
                  applicable privacy laws (GDPR, CCPA, etc.)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>
                  You will not add contact information about individuals without
                  their consent or a legitimate business purpose
                </span>
              </li>
            </ul>
            <p className="mt-4 leading-relaxed text-muted">
              You are solely responsible for ensuring compliance with privacy laws
              when adding contact information. KnowSomeone is not liable for any
              violations of privacy laws resulting from your misuse of contact data.
            </p>
          </section>

          {/* Section 7: Third-Party Contact Data Liability */}
          <section>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              7. Third-Party Contact Data Liability
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              KnowSomeone stores contact information about professionals at target
              companies. You acknowledge that:
            </p>
            <ul className="mt-4 space-y-2 text-muted">
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>
                  You are responsible for obtaining a lawful basis to collect and
                  store personal data about third parties
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>
                  KnowSomeone does not verify the accuracy, legitimacy, or
                  legality of contact information you add
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>
                  You indemnify and hold KnowSomeone harmless from any claims
                  arising from your misuse of third-party contact data, including
                  but not limited to GDPR violations, CAN-SPAM violations, or
                  unauthorized use of personal information
                </span>
              </li>
            </ul>
            <p className="mt-4 leading-relaxed text-muted">
              If a third party contacts KnowSomeone claiming unauthorized use of
              their personal data, we will cooperate with applicable legal processes
              and may delete contact information at our discretion.
            </p>
          </section>

          {/* Section 8: AI Features Disclaimer */}
          <section>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              8. AI Features Disclaimer
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              KnowSomeone offers optional AI-powered features (Pro tier) that suggest
              message rewrites and content drafts. You understand and agree that:
            </p>
            <ul className="mt-4 space-y-2 text-muted">
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>
                  AI-generated suggestions are not professional advice or legal
                  guidance
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>
                  You are responsible for reviewing, editing, and approving all
                  content before use
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>
                  AI-generated content may contain inaccuracies, biases, or
                  inappropriate language
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>
                  KnowSomeone is not liable for outcomes resulting from use of
                  AI-suggested content
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">•</span>
                <span>
                  You retain full responsibility for any messages or content you
                  send using the Service
                </span>
              </li>
            </ul>
            <p className="mt-4 leading-relaxed text-muted">
              AI features are provided "as is" without warranty of accuracy,
              completeness, or suitability for any particular purpose.
            </p>
          </section>

          {/* Section 9: Intellectual Property */}
          <section>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              9. Intellectual Property
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              KnowSomeone and all content within the Service (including text,
              graphics, logos, designs, code, and functionality) are owned by or
              licensed to KnowSomeone and protected by copyright, trademark, and
              other intellectual property laws. You may not reproduce, distribute,
              transmit, modify, or create derivative works of the Service or its
              content without our prior written consent.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              You retain all rights to content you create and upload (job notes,
              custom templates, personal data), subject to the license you grant
              KnowSomeone to provide the Service.
            </p>
          </section>

          {/* Section 10: Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              10. Limitation of Liability
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              To the fullest extent permitted by law, KnowSomeone shall not be
              liable for any indirect, incidental, special, consequential, or
              punitive damages arising from your use of or inability to use the
              Service, even if KnowSomeone has been advised of the possibility of
              such damages.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              In jurisdictions that do not allow limitation of liability, KnowSomeone's
              total liability to you for any claim arising from or related to this
              agreement shall not exceed the amount you paid for the Service in the
              12 months preceding the claim.
            </p>
          </section>

          {/* Section 11: Disclaimers */}
          <section>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              11. Disclaimers
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              <strong>No Professional Advice.</strong> KnowSomeone is not a recruitment
              agency, career counselor, or employment advisor. The Service is a tool
              for job tracking and networking. It does not provide professional,
              legal, tax, or financial advice. Consult with appropriate professionals
              before making career decisions.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              <strong>No Guarantee of Job Placement.</strong> KnowSomeone does not
              guarantee employment opportunities, job offers, interviews, or any
              specific outcome. Use of the Service does not guarantee results. Success
              in job search depends on many factors outside KnowSomeone's control.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              <strong>Service Availability.</strong> The Service is provided "as is"
              and "as available." KnowSomeone does not warrant that the Service will
              be uninterrupted, error-free, or free from viruses or harmful
              components. You use the Service at your own risk.
            </p>
          </section>

          {/* Section 12: Termination and Account Deletion */}
          <section>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              12. Termination and Account Deletion
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              You may terminate your account at any time by requesting deletion
              through your account settings. Upon deletion, your personal data will
              be permanently removed from KnowSomeone's active systems within 30
              days, subject to legal retention requirements.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              KnowSomeone may terminate or suspend your account immediately and
              without notice if you violate these Terms or engage in prohibited
              conduct.
            </p>
          </section>

          {/* Section 13: Governing Law */}
          <section>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              13. Governing Law
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              These Terms are governed by and construed in accordance with the laws
              of the State of California, without regard to its conflict of laws
              principles. You agree to submit to the exclusive jurisdiction of the
              courts located in California for any disputes arising from these Terms or
              the Service.
            </p>
          </section>

          {/* Section 14: Dispute Resolution */}
          <section>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              14. Dispute Resolution
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              Before initiating litigation, you agree to attempt to resolve any
              dispute by contacting KnowSomeone's support team at{" "}
              <a
                href="mailto:support@knowsomeone.com"
                className="text-accent hover:text-accent-hover"
              >
                support@knowsomeone.com
              </a>
              . If the dispute cannot be resolved informally within 30 days, either
              party may pursue legal remedies.
            </p>
          </section>

          {/* Section 15: Waiver of Jury Trial and Class Action (California Limitation) */}
          <section>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              15. Limitation on Dispute Resolution
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              While KnowSomeone prefers to resolve disputes informally, California law permits both parties to pursue legal remedies in court. Neither party waives its right to a jury trial or to pursue individual claims in California courts. Class actions and representative actions are permitted where allowed by law.
            </p>
          </section>

          {/* Section 16: Changes to Terms */}
          <section>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              16. Changes to Terms
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              KnowSomeone reserves the right to modify these Terms at any time.
              Changes will be effective when posted to the Service. Continued use of
              the Service following the posting of changes constitutes your
              acceptance of the revised Terms. For material changes, KnowSomeone will
              notify users via email or an in-app notification.
            </p>
          </section>

          {/* Section 17: California Consumer Rights Disclosure */}
          <section>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              17. California Consumer Rights Disclosure
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              <strong>For California Residents (Civil Code Section 1789.3):</strong> If you are a California resident and have a complaint or dispute related to this service, you may contact the California Attorney General's office at:
            </p>
            <div className="mt-4 space-y-2 text-muted">
              <p>California Attorney General's Consumer Complaint Hotline</p>
              <p>1-800-952-5225 (toll-free)</p>
              <p>
                Website:{" "}
                <a
                  href="https://oag.ca.gov/consumer"
                  className="text-accent hover:text-accent-hover"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  oag.ca.gov/consumer
                </a>
              </p>
            </div>
          </section>

          {/* Section 18: Contact Information */}
          <section>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              18. Contact Information
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              If you have questions about these Terms, privacy practices, or wish to
              exercise your rights, contact us at:
            </p>
            <div className="mt-4 space-y-2 text-muted">
              <p>
                <strong>KnowSomeone Support</strong>
              </p>
              <p>
                Email:{" "}
                <a
                  href="mailto:support@knowsomeone.com"
                  className="text-accent hover:text-accent-hover"
                >
                  support@knowsomeone.com
                </a>
              </p>
              <p>
                Legal Notices:{" "}
                <a
                  href="mailto:legal@knowsomeone.com"
                  className="text-accent hover:text-accent-hover"
                >
                  legal@knowsomeone.com
                </a>
              </p>
            </div>
          </section>

          {/* Final Note */}
          <div className="rounded-lg border border-border bg-surface/50 p-6">
            <p className="text-sm text-muted">
              These Terms of Service are binding and enforceable against you. If you
              do not agree to these Terms, you may not use KnowSomeone. By accessing
              or using the Service, you acknowledge that you have read, understood,
              and agree to be bound by these Terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
