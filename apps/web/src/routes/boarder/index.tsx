import { createFileRoute } from '@tanstack/react-router';
import { EmptyState } from '../../components/ui/EmptyState';

// Placeholder so login/signup redirects resolve. The real boarder dashboard
// (RoleShell + BOARDER_NAV + tenancy/applications cards) lands in Phase 3.
export const Route = createFileRoute('/boarder/')({
  component: () => (
    <main className="p-6">
      <EmptyState
        title="Boarder dashboard"
        description="Coming in Phase 3 — your tenancy, applications, and saved rooms will live here."
      />
    </main>
  ),
});
