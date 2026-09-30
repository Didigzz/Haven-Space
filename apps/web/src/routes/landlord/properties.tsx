import { Link, createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { buttonClasses } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LandlordRoomList } from '../../components/rooms/LandlordRoomList';
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

  const rows = properties.data?.data.properties ?? [];

  return (
    <RoleShell nav={LANDLORD_NAV}>
      <PageHeader
        icon="buildingOffice"
        title="My properties"
        subtitle="All the properties you manage."
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
          icon="buildingOffice"
          title="No properties yet"
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
          expandable={row => <LandlordRoomList token={token!} propertyId={row.id} />}
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
              header: 'Access',
              // Was a hand-rolled pill pair; one pill language now (R23).
              cell: row => <StatusBadge status={row.role === 'shared' ? 'shared' : 'owned'} />,
            },
            {
              header: 'Status',
              cell: row => <StatusBadge status={row.status} />,
            },
            {
              header: 'Rooms',
              cell: row => `${row.occupied_rooms}/${row.total_rooms}`,
            },
          ]}
        />
      )}
    </RoleShell>
  );
}
