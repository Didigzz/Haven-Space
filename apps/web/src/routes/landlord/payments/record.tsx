import { createFileRoute } from '@tanstack/react-router';
import { PlaceholderPage } from '../../../components/ui/PlaceholderPage';

export const Route = createFileRoute('/landlord/payments/record')({
  component: () => (
    <PlaceholderPage
      icon="payment"
      title="Record a payment"
      subtitle={"Log a boarder's payment manually."}
      notice="Record a payment — coming soon"
      message="Recording boarder payments will be available once the payments backend is live."
    />
  ),
});
