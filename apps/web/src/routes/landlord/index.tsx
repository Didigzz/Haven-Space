import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { Icon } from '../../components/ui/Icon';
import { Spinner } from '../../components/ui/Spinner';
import { getDashboardStats } from '../../lib/api/landlord';
import { useAuth } from '../../lib/auth-context';
import { LANDLORD_NAV } from '../../lib/nav';

export const Route = createFileRoute('/landlord/')({
  component: () => (
    <Protected role="landlord">
      <LandlordDashboard />
    </Protected>
  ),
});

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
}) {
  return (
    <Card className="flex items-start gap-3">
      <Icon name={icon} size={24} className="shrink-0" />
      <div className="min-w-0">
        <p className="text-sm text-gray-ink">{label}</p>
        <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
        {sub ? <p className="mt-1 text-sm text-gray-ink">{sub}</p> : null}
      </div>
    </Card>
  );
}

function LandlordDashboard() {
  const { token, user } = useAuth();
  const stats = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => getDashboardStats(token!),
    enabled: Boolean(token),
  });

  return (
    <RoleShell title="Landlord dashboard" nav={LANDLORD_NAV}>
      {/* Greeting */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink">
            {user?.first_name ? `Welcome back, ${user.first_name}` : 'Welcome back'}
          </h2>
          <p className="mt-1 text-sm text-gray-ink">
            Manage your properties, boarders, and applications.
          </p>
        </div>
        <Link
          to="/landlord/listings/create"
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          + Create listing
        </Link>
      </div>

      {stats.isLoading ? (
        <Spinner />
      ) : stats.error ? (
        <ErrorState message={stats.error.message} />
      ) : stats.data ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Occupancy"
            value={`${stats.data.data.occupancy.rate.toFixed(0)}%`}
            sub={`${stats.data.data.occupancy.occupied_rooms} of ${stats.data.data.occupancy.total_rooms} rooms`}
            icon="analytics"
          />
          <StatCard
            label="Monthly revenue"
            value={`₱${stats.data.data.revenue.monthly.toLocaleString()}`}
            sub={`${stats.data.data.revenue.trend >= 0 ? '+' : ''}${
              stats.data.data.revenue.trend
            }% vs last month`}
            icon="payment"
          />
          <StatCard
            label="Upcoming renewals"
            value={String(stats.data.data.renewals.upcoming_count)}
            sub={stats.data.data.renewals.period}
            icon="calendar"
          />
          <StatCard
            label="Payment alerts"
            value={String(
              stats.data.data.payment_alerts.due_soon + stats.data.data.payment_alerts.overdue
            )}
            sub={`${stats.data.data.payment_alerts.due_soon} due soon · ${stats.data.data.payment_alerts.overdue} overdue`}
            icon="flag"
          />
        </div>
      ) : null}

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-ink">My listings</p>
            <p className="text-sm text-gray-ink">Edit your properties and rooms</p>
          </div>
          <Link
            to="/landlord/listings"
            className="rounded-full border-2 border-primary px-4 py-1.5 text-sm font-semibold text-primary hover:bg-mint"
          >
            Manage
          </Link>
        </Card>
        <Card className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-ink">Applications</p>
            <p className="text-sm text-gray-ink">Review boarder applications</p>
          </div>
          <Link
            to="/landlord/applications"
            className="rounded-full border-2 border-primary px-4 py-1.5 text-sm font-semibold text-primary hover:bg-mint"
          >
            Review
          </Link>
        </Card>
        <Card className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-ink">Boarders</p>
            <p className="text-sm text-gray-ink">Manage your tenants</p>
          </div>
          <Link
            to="/landlord/boarders"
            className="rounded-full border-2 border-primary px-4 py-1.5 text-sm font-semibold text-primary hover:bg-mint"
          >
            Manage
          </Link>
        </Card>
      </div>
    </RoleShell>
  );
}
