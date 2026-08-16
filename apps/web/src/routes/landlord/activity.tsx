import { createFileRoute } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Card } from '../../components/ui/Card';
import { LANDLORD_NAV } from '../../lib/nav';

export const Route = createFileRoute('/landlord/activity')({
  component: () => (
    <Protected role="landlord">
      <RoleShell title="Activity" nav={LANDLORD_NAV}>
        <Card className="mx-auto max-w-2xl">
          <h1 className="text-xl font-bold">Activity</h1>
          <p className="mt-1 text-sm text-gray-ink">
            Track all activity from your boarders and properties.
          </p>
          <p className="mt-4 text-sm text-gray-ink">
            An activity feed will appear here once the landlord activity endpoint is finalized.
          </p>
        </Card>
      </RoleShell>
    </Protected>
  ),
});
