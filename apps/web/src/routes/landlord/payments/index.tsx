import { createFileRoute } from '@tanstack/react-router';
import { PlaceholderPage } from '../../../components/ui/PlaceholderPage';

export const Route = createFileRoute('/landlord/payments/')({
  component: () => (
    <PlaceholderPage
      icon="payment"
      title="Payments"
      subtitle="Track boarder payments and history."
      notice="Payments coming soon"
      message="Track boarder payments and history here once the payments backend is live."
    />
  ),
});
