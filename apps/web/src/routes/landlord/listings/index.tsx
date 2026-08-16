import { Link, createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Icon } from '../../../components/ui/Icon';
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

  if (properties.isLoading) return <Spinner />;
  if (properties.error) return <ErrorState message={properties.error.message} />;
  if (!properties.data || properties.data.data.properties.length === 0) {
    return (
      <EmptyState
        title="No listings yet"
        description={
          <>
            Create your first listing to start renting rooms.{' '}
            <Link to="/landlord/listings/create" className="text-primary hover:underline">
              Create a listing
            </Link>
          </>
        }
      />
    );
  }

  const rows = properties.data.data.properties;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon name="list" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-ink">My listings</h2>
            <p className="text-sm text-gray-ink">Manage your properties and rooms.</p>
          </div>
        </div>
        <Link
          to="/landlord/listings/create"
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          + Create listing
        </Link>
      </div>
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
    </div>
  );
}
