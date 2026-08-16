import { createFileRoute } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { EmptyState } from '../../components/ui/EmptyState';
import { BOARDER_NAV } from '../../lib/nav';

export const Route = createFileRoute('/boarder/messages')({
  component: () => (
    <Protected role="boarder">
      <RoleShell title="Messages" nav={BOARDER_NAV}>
        <EmptyState
          title="Messages coming soon"
          description="In-app messaging with landlords is on the roadmap."
        />
      </RoleShell>
    </Protected>
  ),
});
