import { Link, createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { buttonClasses } from '../../../components/ui/Button';
import { DataTable } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Spinner } from '../../../components/ui/Spinner';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { getProperties } from '../../../lib/api/landlord';
import { useAuth } from '../../../lib/auth-context';
import type { LandlordProperty } from '../../../lib/types';

export const Route = createFileRoute('/landlord/listings/')({
  component: ListingsPage,
});

function ListingsPage() {
  const { token } = useAuth();
  const properties = useQuery({
    queryKey: ['landlord-properties'],
    queryFn: () => getProperties(token!),
    enabled: Boolean(token),
  });

  const rows = properties.data?.data.properties ?? [];

  return (
    <div>
      <PageHeader
        icon="list"
        title="My listings"
        subtitle="Manage your properties and rooms."
        actions={
          <Link to="/landlord/listings/create" className={buttonClasses()}>
            + Create listing
          </Link>
        }
      />

      {properties.isLoading ? (
        <Spinner />
      ) : properties.error ? (
        <ErrorState message={properties.error.message} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="list"
          title="No listings yet"
          description="Create your first listing to start renting rooms."
          action={
            <Link to="/landlord/listings/create" className={buttonClasses()}>
              Create a listing
            </Link>
          }
        />
      ) : (
        <DataTable<LandlordProperty>
          rows={rows}
          keyFor={row => row.id}
          columns={[
            {
              header: 'Name',
              cell: row => (
                <Link
                  to="/landlord/listings/$id/edit"
                  params={{ id: String(row.id) }}
                  className="font-medium text-primary hover:underline"
                >
                  {row.name}
                </Link>
              ),
            },
            { header: 'Address', cell: row => `${row.address}, ${row.city}` },
            {
              header: 'Status',
              cell: row => <StatusBadge status={row.status} />,
            },
            {
              header: 'Rooms',
              cell: row => `${row.occupied_rooms}/${row.total_rooms}`,
            },
            {
              header: 'Monthly revenue',
              cell: row => `₱${row.monthly_revenue.toLocaleString()}`,
            },
          ]}
        />
      )}
    </div>
  );
}
