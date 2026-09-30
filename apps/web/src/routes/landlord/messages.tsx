import { createFileRoute } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { PlaceholderPage } from '../../components/ui/PlaceholderPage';
import { LANDLORD_NAV } from '../../lib/nav';

export const Route = createFileRoute('/landlord/messages')({
  component: () => (
    <Protected role="landlord">
      <RoleShell nav={LANDLORD_NAV}>
        <PlaceholderPage
          icon="chat"
          title="Messages"
          subtitle="Chat with your boarders."
          notice="Messages coming soon"
          message="In-app messaging with boarders is on the roadmap."
        />
      </RoleShell>
    </Protected>
  ),
});
