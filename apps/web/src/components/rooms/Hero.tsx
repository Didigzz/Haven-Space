import { Link } from '@tanstack/react-router';

export function Hero() {
  return (
    <section className="bg-primary px-6 py-16 text-center text-white">
      <h1 className="text-4xl font-bold">Find your next home</h1>
      <p className="mx-auto mt-3 max-w-xl">
        Affordable boarding houses and rooms across the Philippines.
      </p>
      <Link
        to="/find-a-room"
        className="mt-6 inline-block rounded-md bg-white px-6 py-2 font-semibold text-primary"
      >
        Browse rooms
      </Link>
    </section>
  );
}
