import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { RoomDetailView } from '../../../../components/rooms/RoomDetailView';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { Spinner } from '../../../../components/ui/Spinner';
import { getRoomDetail } from '../../../../lib/api/public';

export const Route = createFileRoute('/boarder/find-a-room/$id/')({
  component: FindARoomDetailPage,
});

function FindARoomDetailPage() {
  const { id } = Route.useParams();
  const detail = useQuery({
    queryKey: ['listing', Number(id)],
    queryFn: () => getRoomDetail(Number(id)),
  });

  if (detail.isLoading) return <Spinner />;
  if (detail.error) return <ErrorState message={detail.error.message} />;
  if (!detail.data) return null;

  return (
    <RoomDetailView
      listing={detail.data.data}
      showSave
      applyTo={`/boarder/find-a-room/${id}/apply`}
    />
  );
}
