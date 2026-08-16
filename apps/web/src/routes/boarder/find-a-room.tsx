import { createFileRoute, Outlet } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { BOARDER_NAV } from '../../lib/nav';

export const Route = createFileRoute('/boarder/find-a-room')({
  component: () => (
    <Protected role="boarder">
      <RoleShell title="Find a room" nav={BOARDER_NAV}>
        <Outlet />
      </RoleShell>
    </Protected>
  ),
});
