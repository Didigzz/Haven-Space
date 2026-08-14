import { createFileRoute, Link } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';
import { getRoomDetail, getSimilarRooms } from '../../lib/api/public';

const loadDetail = createServerFn({ method: 'GET' })
  .validator((id: number) => id)
  .handler(({ data }) => getRoomDetail(data, env.API_BASE_URL));

const loadSimilar = createServerFn({ method: 'GET' })
  .validator((id: number) => id)
  .handler(({ data }) => getSimilarRooms(data, 3, env.API_BASE_URL));

export const Route = createFileRoute('/rooms/$id')({
  loader: ({ params }) =>
    Promise.all([loadDetail({ data: Number(params.id) }), loadSimilar({ data: Number(params.id) })]),
  errorComponent: () => (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Room not found</h1>
    </main>
  ),
  component: RoomDetailPage,
});

function RoomDetailPage() {
  const [detail, similar] = Route.useLoaderData();
  const listing = detail.data;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold">{listing.title}</h1>
      <img
        src={listing.coverImage}
        alt={listing.title}
        className="my-4 h-80 w-full rounded-lg object-cover"
      />
      <p className="text-xl font-bold text-primary">₱{listing.price.toLocaleString()}</p>
      <p className="text-gray-ink">
        {listing.address}, {listing.city}, {listing.province}
      </p>
      <p className="mt-2">{listing.description}</p>
      <section className="mt-6">
        <h2 className="text-lg font-semibold">Rooms</h2>
        <ul className="mt-2 space-y-2">
          {listing.rooms.map((room) => (
            <li key={room.id} className="rounded-md border border-gray-200 p-3">
              {room.roomNumber} — ₱{room.price.toLocaleString()} · {room.capacity} occupant(s)
            </li>
          ))}
        </ul>
      </section>
      {similar.data.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Similar places</h2>
          <ul className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {similar.data.map((item) => (
              <li key={item.id} className="rounded-md border border-gray-200 p-3">
                <Link to="/rooms/$id" params={{ id: String(item.id) }}>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-gray-ink">{item.city}</p>
                  <p className="font-bold text-primary">₱{item.price.toLocaleString()}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
