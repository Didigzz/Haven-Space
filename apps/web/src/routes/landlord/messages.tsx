import { createFileRoute } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { EmptyState } from '../../components/ui/EmptyState';
import { LANDLORD_NAV } from '../../lib/nav';

export const Route = createFileRoute('/landlord/messages')({
  component: () => (
    <Protected role="landlord">
      <RoleShell title="Messages" nav={LANDLORD_NAV}>
        <EmptyState
          title="Messages coming soon"
          description="In-app messaging with boarders is on the roadmap."
        />
      </RoleShell>
    </Protected>
  ),
});
