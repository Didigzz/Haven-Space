import { createFileRoute } from '@tanstack/react-router';
import { EmptyState } from '../../components/ui/EmptyState';

// Placeholder so login redirects resolve. The real admin overview lands in Phase 5.
export const Route = createFileRoute('/admin/')({
  component: () => (
    <main className="p-6">
      <EmptyState title="Admin overview" description="Coming in Phase 5." />
    </main>
  ),
});
