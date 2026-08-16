import { createFileRoute } from '@tanstack/react-router';
import { EmptyState } from '../../../components/ui/EmptyState';

export const Route = createFileRoute('/landlord/payments/')({
  component: () => (
    <EmptyState
      title="Payments coming soon"
      description="Track boarder payments and history here once the payments backend is live."
    />
  ),
});
