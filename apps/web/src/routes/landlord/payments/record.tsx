import { createFileRoute } from '@tanstack/react-router';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Icon } from '../../../components/ui/Icon';

export const Route = createFileRoute('/landlord/payments/record')({
  component: () => (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <Icon name="payment" size={28} />
        <div>
          <h2 className="text-2xl font-bold text-ink">Record a payment</h2>
          <p className="text-sm text-gray-ink">Log a boarder&apos;s payment manually.</p>
        </div>
      </div>
      <EmptyState
        title="Record a payment — coming soon"
        description="Recording boarder payments will be available once the payments backend is live."
      />
    </div>
  ),
});
