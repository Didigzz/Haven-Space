import { createFileRoute } from '@tanstack/react-router';
import { Protected } from '../../../components/auth/Protected';
import { RoleShell } from '../../../components/layout/RoleShell';
import { FindARoomContent } from '../../../components/rooms/FindARoomContent';
import { BOARDER_NAV } from '../../../lib/nav';

export const Route = createFileRoute('/boarder/find-a-room/')({
  component: () => (
    <Protected role="boarder">
      <RoleShell title="Find a room" nav={BOARDER_NAV}>
        <FindARoomContent detailTo="/boarder/find-a-room/$id" />
      </RoleShell>
    </Protected>
  ),
});
