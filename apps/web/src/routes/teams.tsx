import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '../components/ui/PageHeader';

export const Route = createFileRoute('/teams')({
  component: () => (
    <main className="mx-auto max-w-3xl p-6">
      <PageHeader title="The team" subtitle="The people behind Haven Space." />
      <p>A small team of builders focused on making renting feel like home.</p>
    </main>
  ),
});
