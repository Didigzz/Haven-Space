import { createFileRoute } from '@tanstack/react-router';
import { PublicLayout } from '../components/layout/PublicLayout';
import { PageHeader } from '../components/ui/PageHeader';

export const Route = createFileRoute('/maps')({
  component: () => (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <PageHeader
          title="Explore the map"
          subtitle="Browse boarding houses across the Philippines."
        />
        <iframe
          title="Haven Space map"
          src="https://www.google.com/maps?q=boarding+house+Philippines&output=embed"
          className="h-[60vh] w-full rounded-lg border-0 shadow-card"
        />
      </div>
    </PublicLayout>
  ),
});
