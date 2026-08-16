import { createFileRoute } from '@tanstack/react-router';
import { EmptyState } from '../../components/ui/EmptyState';

// Placeholder so login/signup redirects resolve. The real landlord dashboard
// (RoleShell + LANDLORD_NAV + stats cards) lands in Phase 4.
export const Route = createFileRoute('/landlord/')({
  component: () => (
    <main className="p-6">
      <EmptyState
        title="Landlord dashboard"
        description="Coming in Phase 4 — your listings, applications, and boarders will live here."
      />
    </main>
  ),
});
