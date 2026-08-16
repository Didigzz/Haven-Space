import { createFileRoute, Link } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';
import { FAQSection } from '../components/home/FAQSection';
import { LogoCloud } from '../components/home/LogoCloud';
import { VisionCards } from '../components/home/VisionCards';
import { PublicLayout } from '../components/layout/PublicLayout';
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
    <PublicLayout>
      <Hero />

      {/* App preview image overlapping the hero */}
      <section className="relative z-10 mx-auto -mt-16 max-w-5xl px-4">
        <img
          src="/assets/images/public/main.png"
          alt="Haven Space app dashboard preview"
          className="mx-auto w-full rounded-xl"
        />
      </section>

      {/* Popular locations (live data) */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-8 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            Explore
          </span>
          <h2 className="mt-2 text-3xl font-bold text-ink">Popular locations</h2>
          <p className="mx-auto mt-3 max-w-xl text-gray-ink">
            Start your search in the cities boarders love most.
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {data.locations.map((location) => (
            <li key={location.name}>
              <Link
                to="/find-a-room"
                className="block rounded-xl border border-gray-200 bg-white p-5 shadow-card transition-shadow hover:shadow-pop"
              >
                <p className="font-semibold text-ink">{location.name}</p>
                <p className="mt-1 text-sm text-gray-ink">
                  {location.property_count} {location.property_count === 1 ? 'property' : 'properties'}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <LogoCloud />

      {/* What is Haven Space */}
      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            What is Haven Space
          </span>
          <p className="mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-gray-ink">
            <strong className="font-semibold text-ink">
              Haven Space is a next-gen boarding house platform
            </strong>{' '}
            bridging traditional property rentals with modern digital convenience. We provide a
            seamless, verified experience for boarders by integrating smart search, secure
            payments, and trusted landlord connections.
          </p>
          <img
            src="/assets/images/public/find_illustratin.png"
            alt="Students finding boarding houses in a neighborhood"
            className="mx-auto mt-10 w-full max-w-3xl rounded-xl"
          />
        </div>
      </section>

      <VisionCards />
      <FAQSection />
    </PublicLayout>
  );
}
