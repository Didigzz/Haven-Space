import { createFileRoute } from '@tanstack/react-router';
import { FindARoomContent } from '../../../components/rooms/FindARoomContent';

export const Route = createFileRoute('/boarder/find-a-room/')({
  component: () => <FindARoomContent detailTo="/boarder/find-a-room/$id" />,
});
