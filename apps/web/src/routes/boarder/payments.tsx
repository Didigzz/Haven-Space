import { createFileRoute, Outlet } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { BOARDER_NAV } from '../../lib/nav';

export const Route = createFileRoute('/boarder/payments')({
  component: () => (
    <Protected role="boarder">
      <RoleShell title="Payments" nav={BOARDER_NAV}>
        <Outlet />
      </RoleShell>
    </Protected>
  ),
});
