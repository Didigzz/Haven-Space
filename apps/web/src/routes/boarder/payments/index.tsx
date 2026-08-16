import { createFileRoute } from '@tanstack/react-router';
import { EmptyState } from '../../../components/ui/EmptyState';

export const Route = createFileRoute('/boarder/payments/')({
  component: () => (
    <EmptyState
      title="Payments coming soon"
      description="Pay your rent and view payment history here once the payments backend is live."
    />
  ),
});
