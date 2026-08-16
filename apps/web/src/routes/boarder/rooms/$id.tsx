import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Protected } from '../../../components/auth/Protected';
import { RoleShell } from '../../../components/layout/RoleShell';
import { RoomDetailView } from '../../../components/rooms/RoomDetailView';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Spinner } from '../../../components/ui/Spinner';
import { getRoomDetail } from '../../../lib/api/public';
import { BOARDER_NAV } from '../../../lib/nav';

export const Route = createFileRoute('/boarder/rooms/$id')({
  component: () => (
    <Protected role="boarder">
      <RoomDetailPage />
    </Protected>
  ),
});

function RoomDetailPage() {
  const { id } = Route.useParams();
  const detail = useQuery({
    queryKey: ['listing', Number(id)],
    queryFn: () => getRoomDetail(Number(id)),
  });

  return (
    <RoleShell title="Your room" nav={BOARDER_NAV}>
      {detail.isLoading ? (
        <Spinner />
      ) : detail.error ? (
        <ErrorState message={detail.error.message} />
      ) : detail.data ? (
        <RoomDetailView listing={detail.data.data} />
      ) : null}
    </RoleShell>
  );
}
