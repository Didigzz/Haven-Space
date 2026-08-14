import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';
import { Hero } from '../components/rooms/Hero';
import { getPopularLocations } from '../lib/api/public';

const loadLocations = createServerFn({ method: 'GET' }).handler(() =>
  getPopularLocations(6, env.API_BASE_URL)
);

export const Route = createFileRoute('/')({
  loader: () => loadLocations(),
  component: HomePage,
});

function HomePage() {
  const { data } = Route.useLoaderData();

  return (
    <main>
      <Hero />
      <section className="mx-auto max-w-6xl p-6">
        <h2 className="mb-4 text-xl font-bold">Popular locations</h2>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {data.locations.map((location) => (
            <li key={location.name} className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="font-semibold">{location.name}</p>
              <p className="text-sm text-gray-ink">{location.property_count} properties</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
