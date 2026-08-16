import { createFileRoute } from '@tanstack/react-router';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Icon } from '../../../components/ui/Icon';

export const Route = createFileRoute('/boarder/payments/')({
  component: () => (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <Icon name="payment" size={28} />
        <div>
          <h2 className="text-2xl font-bold text-ink">Payments</h2>
          <p className="text-sm text-gray-ink">Your rent and billing history.</p>
        </div>
      </div>
      <EmptyState
        title="Payments coming soon"
        description="Pay your rent and view payment history here once the payments backend is live."
      />
    </div>
  ),
});
