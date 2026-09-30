import { createFileRoute } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { PlaceholderPage } from '../../components/ui/PlaceholderPage';
import { LANDLORD_NAV } from '../../lib/nav';

export const Route = createFileRoute('/landlord/calendar')({
  component: () => (
    <Protected role="landlord">
      <RoleShell nav={LANDLORD_NAV}>
        <PlaceholderPage
          icon="calendar"
          title="Calendar"
          subtitle="Track payments and tenancy events — move-ins, move-outs, and payment due dates."
          message="A full event calendar will be available here once the landlord calendar feature is finalized."
        />
      </RoleShell>
    </Protected>
  ),
});
