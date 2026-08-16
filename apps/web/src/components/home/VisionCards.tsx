const CARDS = [
  {
    icon: '/assets/images/icons/seamless_discovery.png',
    title: 'Seamless Discovery',
    description:
      'Finding your perfect boarding house made effortless with our smart search and verified listings, where technology anticipates your every need.',
    accent: 'border-t-orange-400',
  },
  {
    icon: '/assets/images/icons/trusted_connection.png',
    title: 'Trusted Connections',
    description:
      'Building confidence through verified landlords, secure payments, and transparent communication between boarders and property owners.',
    accent: 'border-t-green-500',
  },
  {
    icon: '/assets/images/icons/community_first.png',
    title: 'Community First',
    description:
      'Bridging the gap between traditional property rentals and modern digital convenience, creating lasting community relationships.',
    accent: 'border-t-blue-500',
  },
];

export function VisionCards() {
  return (
    <section className="relative bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-10 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Vision</span>
          <h2 className="mt-2 text-3xl font-bold text-ink">Our Vision</h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-ink">
            Redefining the boarding house experience with modern technology and community-focused
            solutions.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {CARDS.map(card => (
            <div
              key={card.title}
              className={`rounded-xl border border-gray-100 border-t-4 bg-cream p-6 shadow-card ${card.accent}`}
            >
              <img src={card.icon} alt="" className="h-12 w-12 object-contain" />
              <h3 className="mt-4 flex items-center gap-2 text-lg font-semibold text-ink">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-ink">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
