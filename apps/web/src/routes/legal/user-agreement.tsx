import { createFileRoute } from '@tanstack/react-router';
import { LegalLayout } from '../../components/layout/LegalLayout';

export const Route = createFileRoute('/legal/user-agreement')({
  component: UserAgreementPage,
});

function UserAgreementPage() {
  return (
    <LegalLayout
      title="User Agreement"
      subtitle="The agreement governing your use of Haven Space as a boarder, landlord, or administrator."
      updated="April 11, 2026"
      sections={[
        {
          number: '1',
          title: 'Introduction',
          body: (
            <p>
              This agreement governs your use of Haven Space as a boarder, landlord, or
              administrator. Continued use of the platform constitutes acceptance of these terms.
            </p>
          ),
        },
        {
          number: '2',
          title: 'Account Creation',
          body: (
            <div className="space-y-2">
              <p>To use Haven Space you must create an account. You agree to:</p>
              <ul className="list-disc pl-5">
                <li>Provide true, accurate, and current information.</li>
                <li>Maintain the security of your password and login credentials.</li>
                <li>Promptly update your information to keep it current.</li>
                <li>Be at least 18 years old or have parental consent.</li>
              </ul>
            </div>
          ),
        },
        {
          number: '3',
          title: 'User Conduct',
          body: (
            <ul className="list-disc pl-5">
              <li>Do not post false, misleading, or fraudulent listings or applications.</li>
              <li>Do not harass, threaten, or discriminate against other users.</li>
              <li>Do not share another user&apos;s personal information without consent.</li>
              <li>Do not use the platform for any unlawful purpose.</li>
            </ul>
          ),
        },
        {
          number: '4',
          title: 'Content Guidelines',
          body: (
            <p>
              Content you post — listing photos, descriptions, reviews, and messages — must be
              accurate and appropriate. We may remove content that violates these guidelines or is
              reported by other users, and repeat violations may lead to account suspension.
            </p>
          ),
        },
        {
          number: '5',
          title: 'Landlord Obligations',
          body: (
            <ul className="list-disc pl-5">
              <li>Keep listing details, pricing, and availability accurate and up to date.</li>
              <li>Respond to boarder applications and messages in a timely manner.</li>
              <li>Honor accepted applications and booked tenancies.</li>
              <li>Maintain properties in a safe and habitable condition.</li>
            </ul>
          ),
        },
        {
          number: '6',
          title: 'Boarder Obligations',
          body: (
            <ul className="list-disc pl-5">
              <li>Provide truthful information in your applications.</li>
              <li>Pay agreed rent and deposits on time.</li>
              <li>Follow the house rules of the property you rent.</li>
              <li>Care for the property and report maintenance issues promptly.</li>
            </ul>
          ),
        },
        {
          number: '7',
          title: 'Dispute Resolution',
          body: (
            <p>
              If a dispute arises between users, we encourage you to resolve it directly first.
              Haven Space administrators can mediate listing, application, and payment disputes and
              may take action including refunds, status changes, or account suspension based on the
              evidence available.
            </p>
          ),
        },
        {
          number: '8',
          title: 'Modifications',
          body: (
            <p>
              We may update this agreement from time to time. When we make significant changes, we
              will notify you in the app. Your continued use of Haven Space after changes take
              effect means you accept the updated agreement.
            </p>
          ),
        },
      ]}
    />
  );
}
