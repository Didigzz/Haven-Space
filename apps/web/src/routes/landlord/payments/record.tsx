import { createFileRoute } from '@tanstack/react-router';
import { EmptyState } from '../../../components/ui/EmptyState';

export const Route = createFileRoute('/landlord/payments/record')({
  component: () => (
    <EmptyState
      title="Record a payment — coming soon"
      description="Recording boarder payments will be available once the payments backend is live."
    />
  ),
});
