import { Link, createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Spinner } from '../../../components/ui/Spinner';
import { getApplications } from '../../../lib/api/boarder';
import { useAuth } from '../../../lib/auth-context';
import type { ApplicationSummary } from '../../../lib/types';

export const Route = createFileRoute('/boarder/applications/')({
  component: ApplicationsPage,
});

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function ApplicationsPage() {
  const { token } = useAuth();
  const applications = useQuery({
    queryKey: ['applications'],
    queryFn: () => getApplications(token!),
    enabled: Boolean(token),
  });

  if (applications.isLoading) return <Spinner />;
  if (applications.error) return <ErrorState message={applications.error.message} />;
  if (!applications.data || applications.data.data.length === 0) {
    return (
      <EmptyState
        title="No applications yet"
        description="Browse rooms and apply to start your journey."
      />
    );
  }

  return (
    <DataTable<ApplicationSummary>
      rows={applications.data.data}
      keyFor={(row) => row.id}
      columns={[
        {
          header: 'Property',
          cell: (row) => (
            <Link
              to="/boarder/applications/$id"
              params={{ id: String(row.id) }}
              className="font-medium text-primary hover:underline"
            >
              {row.property_title ?? `Application #${row.id}`}
            </Link>
          ),
        },
        {
          header: 'Room',
          cell: (row) => row.room_title ?? '—',
        },
        {
          header: 'Status',
          cell: (row) => (
            <span className="capitalize">
              {String(row.status).replace(/_/g, ' ')}
            </span>
          ),
        },
        {
          header: 'Submitted',
          cell: (row) => formatDate(row.created_at),
        },
      ]}
    />
  );
}
