import { Link, createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Protected } from '../../../components/auth/Protected';
import { RoleShell } from '../../../components/layout/RoleShell';
import { DataTable } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Icon } from '../../../components/ui/Icon';
import { Spinner } from '../../../components/ui/Spinner';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { getApplications } from '../../../lib/api/boarder';
import { useAuth } from '../../../lib/auth-context';
import { BOARDER_NAV } from '../../../lib/nav';
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

  return (
    <Protected role="boarder">
      <RoleShell title="Applications" nav={BOARDER_NAV}>
        <div className="mb-6 flex items-center gap-3">
          <Icon name="application" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-ink">My applications</h2>
            <p className="text-sm text-gray-ink">Track the rooms you&apos;ve applied to.</p>
          </div>
        </div>
        {applications.isLoading ? (
          <Spinner />
        ) : applications.error ? (
          <ErrorState message={applications.error.message} />
        ) : !applications.data || applications.data.data.length === 0 ? (
          <EmptyState
            title="No applications yet"
            description="Browse rooms and apply to start your journey."
          />
        ) : (
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
                cell: (row) => <StatusBadge status={String(row.status)} />,
              },
              {
                header: 'Submitted',
                cell: (row) => formatDate(row.created_at),
              },
            ]}
          />
        )}
      </RoleShell>
    </Protected>
  );
}
