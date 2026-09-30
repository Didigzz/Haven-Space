import { createFileRoute } from '@tanstack/react-router';
import { RequireTenancy } from '../../components/boarder/FeatureGate';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { PlaceholderPage } from '../../components/ui/PlaceholderPage';
import { useBoarderNav } from '../../lib/useBoarderNav';

export const Route = createFileRoute('/boarder/messages')({
  component: MessagesPage,
});

function MessagesPage() {
  const nav = useBoarderNav();
  return (
    <Protected role="boarder">
      <RoleShell nav={nav}>
        <RequireTenancy>
          <PlaceholderPage
            icon="chat"
            title="Messages"
            subtitle="Chat with your landlord."
            notice="Messages coming soon"
            message="In-app messaging with landlords is on the roadmap."
          />
        </RequireTenancy>
      </RoleShell>
    </Protected>
  );
}
