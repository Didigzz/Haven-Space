import { createFileRoute } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { BOARDER_NAV } from '../../lib/nav';

export const Route = createFileRoute('/boarder/messages')({
  component: () => (
    <Protected role="boarder">
      <RoleShell title="Messages" nav={BOARDER_NAV}>
        <div className="mb-5 flex items-center gap-3">
          <Icon name="chat" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-ink">Messages</h2>
            <p className="text-sm text-gray-ink">Chat with your landlord.</p>
          </div>
        </div>
        <EmptyState
          title="Messages coming soon"
          description="In-app messaging with landlords is on the roadmap."
        />
      </RoleShell>
    </Protected>
  ),
});
