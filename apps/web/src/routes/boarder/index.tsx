import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { getAcceptedApplications, getTenancy } from '../../lib/api/boarder';
import { useAuth } from '../../lib/auth-context';
import { BOARDER_NAV } from '../../lib/nav';

export const Route = createFileRoute('/boarder/')({
  component: () => (
    <Protected role="boarder">
      <BoarderDashboard />
    </Protected>
  ),
});

function BoarderDashboard() {
  const { token } = useAuth();
  const tenancy = useQuery({
    queryKey: ['tenancy'],
    queryFn: () => getTenancy(token!),
    enabled: Boolean(token),
  });
  const accepted = useQuery({
    queryKey: ['accepted'],
    queryFn: () => getAcceptedApplications(token!),
    enabled: Boolean(token),
  });

  return (
    <RoleShell title="Boarder dashboard" nav={BOARDER_NAV}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Your tenancy</h2>
          {tenancy.isLoading ? (
            <Spinner />
          ) : tenancy.data?.data ? (
            <div className="mt-2">
              <p className="font-medium">
                {String(tenancy.data.data.property_name ?? 'Active tenancy')}
              </p>
              <p className="text-sm text-gray-ink">
                {String(tenancy.data.data.room_number ?? '')}
              </p>
              <Link to="/boarder/tenancy" className="mt-2 inline-block text-sm text-primary hover:underline">
                View tenancy
              </Link>
            </div>
          ) : (
            <p className="mt-2 text-gray-ink">
              No active tenancy.{' '}
              <Link to="/boarder/find-a-room" className="text-primary hover:underline">
                Find a room
              </Link>
            </p>
          )}
        </Card>

        <Card>
          <h2 className="font-semibold">Accepted applications</h2>
          {accepted.isLoading ? (
            <Spinner />
          ) : (
            <p className="mt-2 text-gray-ink">
              {accepted.data?.data.length ?? 0} accepted
            </p>
          )}
          {accepted.data && accepted.data.data.length > 0 ? (
            <Link
              to="/boarder/confirm-booking"
              className="mt-2 inline-block text-sm text-primary hover:underline"
            >
              Confirm your booking
            </Link>
          ) : null}
        </Card>
      </div>
    </RoleShell>
  );
}
