import { createFileRoute } from '@tanstack/react-router';
import { LegalLayout } from '../../components/layout/LegalLayout';

export const Route = createFileRoute('/legal/privacy-policy')({
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="How Haven Space collects, uses, and protects your information."
      updated="April 11, 2026"
      sections={[
        {
          number: '1',
          title: 'Overview',
          body: (
            <p>
              Haven Space collects only the information needed to run the platform: your name,
              contact details, and the rental activity you perform here. We do not sell your
              personal data. This policy explains what we collect, why, and the choices you have.
            </p>
          ),
        },
        {
          number: '2',
          title: 'Information We Collect',
          body: (
            <div className="space-y-2">
              <p>
                <strong>(a) Information you provide:</strong>
              </p>
              <ul className="list-disc pl-5">
                <li>
                  Account details: name, email address, phone number, and password for boarders and
                  landlords.
                </li>
                <li>
                  Listing information: property details, photos, pricing, availability, and
                  descriptions for landlords.
                </li>
                <li>
                  Application information: rental preferences, employment details, and references
                  for boarders.
                </li>
                <li>Communications: messages, reviews, ratings, and support inquiries.</li>
              </ul>
              <p>
                <strong>(b) Information collected automatically:</strong>
              </p>
              <ul className="list-disc pl-5">
                <li>
                  Usage data: pages visited, features used, search queries, and interaction
                  patterns.
                </li>
                <li>
                  Device information: IP address, browser type, operating system, and device
                  identifiers.
                </li>
                <li>
                  Location data: approximate or precise location (with your consent) to show
                  relevant listings near you.
                </li>
                <li>Cookies and similar tracking technologies.</li>
              </ul>
            </div>
          ),
        },
        {
          number: '3',
          title: 'How We Use Your Information',
          body: (
            <ul className="list-disc pl-5">
              <li>
                Provide and improve our services: to facilitate property listings, bookings,
                payments, messaging, and other platform features.
              </li>
              <li>
                Personalize your experience: to show relevant listings, recommendations, and content
                based on your preferences and activity.
              </li>
              <li>
                Communicate with you: to send service updates, notifications, support responses, and
                marketing communications (with your consent).
              </li>
              <li>
                Verify identity and ensure safety: to confirm user identities, prevent fraud, and
                maintain a trusted community.
              </li>
              <li>
                Analyze and improve: to understand usage patterns, troubleshoot issues, and enhance
                the platform&apos;s functionality.
              </li>
            </ul>
          ),
        },
        {
          number: '4',
          title: 'Information Sharing and Disclosure',
          body: (
            <p>
              We share information only to operate the platform: landlords see the application
              details boarders submit, and administrators access limited data to moderate listings
              and resolve disputes. We never sell your personal data to third parties.
            </p>
          ),
        },
        {
          number: '5',
          title: 'Data Security',
          body: (
            <p>
              Your data and transactions are protected with industry-standard encryption. Access to
              personal information is restricted to team members who need it to run the platform,
              and we review our security practices regularly.
            </p>
          ),
        },
        {
          number: '6',
          title: 'Your Rights and Choices',
          body: (
            <p>
              You may access, correct, or delete the personal information you&apos;ve shared with
              Haven Space. Contact us from your account settings or via support and we will honor
              your request within a reasonable time.
            </p>
          ),
        },
        {
          number: '7',
          title: 'Cookies and Tracking Technologies',
          body: (
            <p>
              We use cookies to keep you signed in, remember your preferences, and understand how
              the platform is used. You can disable cookies in your browser, though some features
              may not work as well without them.
            </p>
          ),
        },
        {
          number: '8',
          title: "Children's Privacy",
          body: (
            <p>
              Haven Space is intended for users who are at least 18 years old. We do not knowingly
              collect personal information from children. If you believe a child has provided us
              information, contact us and we will delete it.
            </p>
          ),
        },
        {
          number: '9',
          title: 'Changes to This Privacy Policy',
          body: (
            <p>
              We may update this policy as the platform evolves. Significant changes will be
              communicated through the app or by email. Continued use of Haven Space after changes
              take effect constitutes acceptance of the updated policy.
            </p>
          ),
        },
      ]}
    />
  );
}
