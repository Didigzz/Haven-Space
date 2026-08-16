import { createFileRoute } from '@tanstack/react-router';
import { EmptyState } from '../../../components/ui/EmptyState';

export const Route = createFileRoute('/boarder/payments/pay')({
  component: () => (
    <EmptyState
      title="Payments coming soon"
      description="Online rent payments will be available here once the payments backend is live."
    />
  ),
});
