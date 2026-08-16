import { createFileRoute } from '@tanstack/react-router';
import { EmptyState } from '../../components/ui/EmptyState';

// Placeholder so landlord signup redirects resolve. The full verification
// (document uploads, status tracking) lands in Phase 4.
export const Route = createFileRoute('/landlord/verification')({
  component: () => (
    <main className="p-6">
      <EmptyState
        title="Verification"
        description="Your account is pending verification. Document upload and status tracking land in Phase 4."
      />
    </main>
  ),
});
