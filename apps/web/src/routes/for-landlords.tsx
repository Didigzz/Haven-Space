import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '../components/ui/PageHeader';

export const Route = createFileRoute('/for-landlords')({
  component: () => (
    <main className="mx-auto max-w-3xl p-6">
      <PageHeader title="List with Haven Space" subtitle="Reach boarders looking for a room." />
      <p>
        Manage listings, rooms, applications, boarders, and announcements from one dashboard.
        Publish a property, review applications, and track occupancy without leaving the app.
      </p>
      <a
        href="/auth/signup/landlord"
        className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-white"
      >
        Create a landlord account
      </a>
    </main>
  ),
});
