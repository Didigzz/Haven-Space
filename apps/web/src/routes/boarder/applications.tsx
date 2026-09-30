import { createFileRoute, Outlet } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { useBoarderNav } from '../../lib/useBoarderNav';

export const Route = createFileRoute('/boarder/applications')({
  component: ApplicationsLayout,
});

function ApplicationsLayout() {
  const nav = useBoarderNav();
  return (
    <Protected role="boarder">
      <RoleShell nav={nav}>
        <Outlet />
      </RoleShell>
    </Protected>
  );
}
