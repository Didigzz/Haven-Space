import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '../../components/ui/PageHeader';

export const Route = createFileRoute('/legal/privacy-policy')({
  component: () => (
    <main className="mx-auto max-w-3xl p-6">
      <PageHeader title="Privacy policy" />
      <p>
        Haven Space collects only the information needed to run the platform: your name, contact
        details, and the rental activity you perform here. We do not sell your personal data.
      </p>
    </main>
  ),
});
