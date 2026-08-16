import { createFileRoute } from '@tanstack/react-router';
import { LegalLayout } from '../../components/layout/LegalLayout';

export const Route = createFileRoute('/legal/terms-of-service')({
  component: TermsOfServicePage,
});

function TermsOfServicePage() {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="The terms that govern your use of Haven Space."
      updated="April 11, 2026"
      sections={[
        {
          number: '1',
          title: 'Acceptance of Terms',
          body: (
            <p>
              By creating an account or using Haven Space, you agree to these Terms of Service and
              to use the platform lawfully and in good faith. If you do not agree, please do not use
              the service.
            </p>
          ),
        },
        {
          number: '2',
          title: 'Fees and Renewals',
          body: (
            <p>
              Listing on Haven Space is free during onboarding. Paid plans are billed monthly and
              renew automatically unless cancelled before the renewal date. All fees are shown
              before you commit to a plan, and we offer a 30-day money-back guarantee on paid plans.
            </p>
          ),
        },
        {
          number: '3',
          title: 'Your Responsibilities',
          body: (
            <div className="space-y-2">
              <p>You agree to:</p>
              <ul className="list-disc pl-5">
                <li>Provide accurate and complete information in your profile and listings.</li>
                <li>Keep your account credentials secure and notify us of unauthorized use.</li>
                <li>
                  Use the platform only for lawful purposes and not to harass, defraud, or harm
                  other users.
                </li>
                <li>Not attempt to disrupt, overload, or reverse-engineer the platform.</li>
              </ul>
            </div>
          ),
        },
        {
          number: '4',
          title: 'Termination',
          body: (
            <p>
              Either party may end the relationship at any time. We may suspend or terminate
              accounts that violate these terms, are flagged for fraudulent activity, or otherwise
              harm the community. You can close your account at any time from settings.
            </p>
          ),
        },
        {
          number: '5',
          title: 'Intellectual Property',
          body: (
            <p>
              Haven Space, its logo, and its content are owned by the Haven Space team. You retain
              ownership of the content you post, and you grant us a limited license to display it on
              the platform so the service can function.
            </p>
          ),
        },
        {
          number: '6',
          title: 'Disclaimer of Warranties',
          body: (
            <p>
              The platform is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; We work
              hard to keep Haven Space reliable, but we do not guarantee that the service will be
              uninterrupted, error-free, or that listings will always be accurate or available.
            </p>
          ),
        },
        {
          number: '7',
          title: 'Limitation of Liability',
          body: (
            <p>
              To the maximum extent permitted by law, Haven Space is not liable for indirect,
              incidental, or consequential damages arising from your use of the platform, including
              disputes between boarders and landlords.
            </p>
          ),
        },
        {
          number: '8',
          title: 'Governing Law',
          body: (
            <p>
              These terms are governed by the laws of the Republic of the Philippines. Any disputes
              arising from these terms or your use of the platform will be resolved in the courts of
              the Philippines.
            </p>
          ),
        },
      ]}
    />
  );
}
