import { createFileRoute } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Card } from '../../components/ui/Card';
import { LANDLORD_NAV } from '../../lib/nav';

export const Route = createFileRoute('/landlord/calendar')({
  component: () => (
    <Protected role="landlord">
      <RoleShell title="Calendar" nav={LANDLORD_NAV}>
        <Card className="mx-auto max-w-2xl">
          <h1 className="text-xl font-bold">Calendar</h1>
          <p className="mt-1 text-sm text-gray-ink">
            Track payments and tenancy events — move-ins, move-outs, and payment due dates.
          </p>
          <p className="mt-4 text-sm text-gray-ink">
            A full event calendar will be available here once the landlord calendar feature is
            finalized.
          </p>
        </Card>
      </RoleShell>
    </Protected>
  ),
});
