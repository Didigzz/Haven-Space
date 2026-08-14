import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '../../components/ui/PageHeader';

export const Route = createFileRoute('/legal/terms-of-service')({
  component: () => (
    <main className="mx-auto max-w-3xl p-6">
      <PageHeader title="Terms of service" />
      <p>
        By using Haven Space you agree to use the platform lawfully and to provide accurate listing
        and application information.
      </p>
    </main>
  ),
});
