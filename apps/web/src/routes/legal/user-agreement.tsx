import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '../../components/ui/PageHeader';

export const Route = createFileRoute('/legal/user-agreement')({
  component: () => (
    <main className="mx-auto max-w-3xl p-6">
      <PageHeader title="User agreement" />
      <p>
        This agreement governs your use of Haven Space as a boarder, landlord, or administrator.
        Continued use of the platform constitutes acceptance of these terms.
      </p>
    </main>
  ),
});
