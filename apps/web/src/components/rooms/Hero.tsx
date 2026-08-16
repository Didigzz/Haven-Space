import { Link } from '@tanstack/react-router';
import { Icon } from '../ui/Icon';

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-16 text-center sm:pt-20">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(at 25% -12%, rgba(255, 226, 178, 0.8) 0%, transparent 50%), radial-gradient(at 75% -1%, rgba(78, 237, 80, 0.39) 0%, transparent 50%)',
        }}
      />
      <div className="relative mx-auto max-w-4xl">
        <Link
          to="/haven-ai"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/60 px-3 py-1.5 text-sm backdrop-blur transition-transform hover:-translate-y-0.5"
        >
          <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
            New
          </span>
          <span className="font-medium text-ink">Introducing Haven AI</span>
          <Icon name="arrowRight" size={16} className="text-gray-ink" />
        </Link>
        <h1 className="text-4xl font-extrabold leading-tight text-ink sm:text-6xl">
          Find your haven,
          <br />
          right next door.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-gray-ink sm:text-lg">
          Haven Space connects you with verified boarding houses near your location, managed by
          trusted landlords. Search, book, and settle in.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            to="/public-maps"
            className="rounded-full border-2 border-primary bg-white px-6 py-3 font-semibold text-primary transition-colors hover:bg-mint"
          >
            View Map
          </Link>
          <Link
            to="/find-a-room"
            className="rounded-full bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            Find a Room
          </Link>
        </div>
      </div>
    </section>
  );
}
