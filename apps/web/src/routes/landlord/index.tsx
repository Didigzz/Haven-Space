import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
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

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <p className="text-sm text-gray-ink">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub ? <p className="mt-1 text-sm text-gray-ink">{sub}</p> : null}
    </Card>
  );
}

function LandlordDashboard() {
  const { token } = useAuth();
  const stats = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => getDashboardStats(token!),
    enabled: Boolean(token),
  });

  return (
    <RoleShell title="Landlord dashboard" nav={LANDLORD_NAV}>
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
          />
          <StatCard
            label="Monthly revenue"
            value={`₱${stats.data.data.revenue.monthly.toLocaleString()}`}
            sub={`${stats.data.data.revenue.trend >= 0 ? '+' : ''}${stats.data.data.revenue.trend}% vs last month`}
          />
          <StatCard
            label="Upcoming renewals"
            value={String(stats.data.data.renewals.upcoming_count)}
            sub={stats.data.data.renewals.period}
          />
          <StatCard
            label="Payment alerts"
            value={String(
              stats.data.data.payment_alerts.due_soon + stats.data.data.payment_alerts.overdue
            )}
            sub={`${stats.data.data.payment_alerts.due_soon} due soon · ${stats.data.data.payment_alerts.overdue} overdue`}
          />
        </div>
      ) : null}

      <div className="mt-6">
        <Link
          to="/landlord/listings"
          className="inline-block rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-dark"
        >
          Manage listings
        </Link>
      </div>
    </RoleShell>
  );
}
