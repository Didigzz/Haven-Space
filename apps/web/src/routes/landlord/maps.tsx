import { createFileRoute } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { LANDLORD_NAV } from '../../lib/nav';

export const Route = createFileRoute('/landlord/maps')({
  component: () => (
    <Protected role="landlord">
      <RoleShell title="Maps" nav={LANDLORD_NAV}>
        <iframe
          title="Haven Space map"
          src="https://www.google.com/maps?q=boarding+house+Philippines&output=embed"
          className="h-[70vh] w-full rounded-lg border-0"
        />
      </RoleShell>
    </Protected>
  ),
});
