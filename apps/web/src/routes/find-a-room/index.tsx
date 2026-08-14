import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';
import { FindARoomContent } from '../../components/rooms/FindARoomContent';
import { listPublicRooms } from '../../lib/api/public';
import type { PublicListingsFilters } from '../../lib/types';

const loadRooms = createServerFn({ method: 'GET' })
  .validator((data: PublicListingsFilters) => data)
  .handler(({ data }) => listPublicRooms(data, env.API_BASE_URL));

export const Route = createFileRoute('/find-a-room/')({
  loader: () => loadRooms({ data: { sort_by: 'newest', limit: 20, offset: 0 } }),
  component: () => {
    const initialData = Route.useLoaderData();
    return <FindARoomContent initialData={initialData} />;
  },
});
