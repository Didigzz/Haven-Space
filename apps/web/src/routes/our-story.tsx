import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '../components/ui/PageHeader';

export const Route = createFileRoute('/our-story')({
  component: () => (
    <main className="mx-auto max-w-3xl p-6">
      <PageHeader title="Our story" subtitle="Why Haven Space exists." />
      <p>
        Haven Space started to make finding and renting a boarding house in the Philippines
        simpler — connecting boarders with trustworthy landlords and clear, transparent listings.
      </p>
    </main>
  ),
});
