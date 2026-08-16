import { createFileRoute, Outlet } from '@tanstack/react-router';
import { Protected } from '../../../components/auth/Protected';
import { RoleShell } from '../../../components/layout/RoleShell';
import { BOARDER_NAV } from '../../../lib/nav';

export const Route = createFileRoute('/boarder/find-a-room/$id')({
  component: () => (
    <Protected role="boarder">
      <RoleShell title="Room detail" nav={BOARDER_NAV}>
        <Outlet />
      </RoleShell>
    </Protected>
  ),
});
