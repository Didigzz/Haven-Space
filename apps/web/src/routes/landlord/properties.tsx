import { Link, createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Spinner } from '../../components/ui/Spinner';
import { getProperties } from '../../lib/api/landlord';
import { useAuth } from '../../lib/auth-context';
import { LANDLORD_NAV } from '../../lib/nav';
import type { LandlordProperty } from '../../lib/types';

export const Route = createFileRoute('/landlord/properties')({
  component: () => (
    <Protected role="landlord">
      <PropertiesPage />
    </Protected>
  ),
});

function PropertiesPage() {
  const { token } = useAuth();
  const properties = useQuery({
    queryKey: ['landlord-properties'],
    queryFn: () => getProperties(token!),
    enabled: Boolean(token),
  });

  return (
    <RoleShell title="My properties" nav={LANDLORD_NAV}>
      {properties.isLoading ? (
        <Spinner />
      ) : properties.error ? (
        <ErrorState message={properties.error.message} />
      ) : properties.data && properties.data.data.properties.length > 0 ? (
        <DataTable<LandlordProperty>
          rows={properties.data.data.properties}
          keyFor={(row) => row.id}
          columns={[
            {
              header: 'Name',
              cell: (row) => (
                <Link
                  to="/landlord/listings/$id/edit"
                  params={{ id: String(row.id) }}
                  className="font-medium text-primary hover:underline"
                >
                  {row.name}
                </Link>
              ),
            },
            { header: 'Address', cell: (row) => `${row.address}, ${row.city}` },
            {
              header: 'Status',
              cell: (row) => <span className="capitalize">{row.status}</span>,
            },
            {
              header: 'Rooms',
              cell: (row) => `${row.occupied_rooms}/${row.total_rooms}`,
            },
          ]}
        />
      ) : (
        <EmptyState
          title="No properties yet"
          description={
            <>
              Create your first listing to start renting rooms.{' '}
              <Link to="/landlord/listings/create" className="text-primary hover:underline">
                Create a listing
              </Link>
            </>
          }
        />
      )}
    </RoleShell>
  );
}
