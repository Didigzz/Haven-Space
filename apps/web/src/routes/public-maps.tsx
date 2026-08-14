import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '../components/ui/PageHeader';

export const Route = createFileRoute('/public-maps')({
  component: () => (
    <main className="mx-auto max-w-6xl p-6">
      <PageHeader title="Public map" />
      <iframe
        title="Haven Space public map"
        src="https://www.google.com/maps?q=boarding+house+Philippines&output=embed"
        className="h-[60vh] w-full rounded-lg border-0"
      />
    </main>
  ),
});
