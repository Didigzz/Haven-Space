import { Link } from '@tanstack/react-router';
import type { ListingDetail } from '../../lib/types';
import { Icon } from '../ui/Icon';
import { StatusBadge } from '../ui/StatusBadge';
import { SaveButton } from './SaveButton';

const AMENITY_ICONS: Record<string, string> = {
  kitchen: 'kitchen',
  'own kitchen': 'kitchen',
  toilet: 'toilet',
  'own bathroom': 'toilet',
  'own toilet': 'toilet',
  'private bathroom': 'toilet',
  laundry: 'laundry',
  'laundry room': 'laundry',
  aircon: 'aircon',
  'air conditioning': 'aircon',
  cctv: 'cctv',
  'cctv security': 'cctv',
  parking: 'parking',
  'parking space': 'parking',
  furnished: 'furnished',
  'fully furnished': 'furnished',
  wifi: 'wifi',
  'free wifi': 'wifi',
  'high-speed wifi': 'wifi',
};

function amenityIcon(name: string): string {
  const key = name.toLowerCase();
  for (const [match, icon] of Object.entries(AMENITY_ICONS)) {
    if (key.includes(match)) return icon;
  }
  return '';
}

export function RoomDetailView({
  listing,
  showSave = false,
  applyTo,
}: {
  listing: ListingDetail;
  showSave?: boolean;
  applyTo?: string;
}) {
  const coverImage = listing.coverImage || '/assets/images/placeholder-room.svg';

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="relative overflow-hidden rounded-xl border border-gray-200">
        <img src={coverImage} alt={listing.title} className="h-80 w-full object-cover" />
        <div className="absolute left-4 top-4">
          <StatusBadge status="available" />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">{listing.title}</h1>
          <p className="mt-1 flex items-center gap-1 text-gray-ink">
            <Icon name="location" size={16} className="shrink-0" />
            {listing.address}, {listing.city}, {listing.province}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-2xl font-bold text-primary">
            ₱{listing.price.toLocaleString()}
            <span className="text-base font-normal text-gray-ink">/mo</span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {showSave ? <SaveButton propertyId={listing.id} /> : null}
        {applyTo ? (
          <Link
            to={applyTo}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            Apply to this room
          </Link>
        ) : null}
      </div>

      <p className="mt-5 leading-relaxed text-gray-ink">{listing.description}</p>

      {listing.amenities.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-ink">Amenities</h2>
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {listing.amenities.map((amenity) => {
              const icon = amenityIcon(amenity);
              return (
                <li key={amenity} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white p-3 shadow-card">
                  {icon ? <Icon name={icon} size={20} className="shrink-0" /> : null}
                  <span className="text-sm font-medium text-ink">{amenity}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Rooms</h2>
        <ul className="mt-3 space-y-3">
          {listing.rooms.map((room) => (
            <li key={room.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-card">
              <div>
                <p className="font-medium text-ink">
                  {room.roomNumber} — ₱{room.price.toLocaleString()}
                </p>
                <p className="text-sm text-gray-ink">
                  {room.roomType} · {room.capacity} occupant(s)
                </p>
              </div>
              <StatusBadge status={room.status === 'Occupied' ? 'full' : 'available'} />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-xl border border-gray-100 bg-white p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
          <Icon name="users" size={20} />
          Landlord
        </h2>
        <p className="mt-2 font-medium text-ink">{listing.landlord.name}</p>
        <p className="text-sm text-gray-ink">
          {listing.landlord.properties} propert{listing.landlord.properties === 1 ? 'y' : 'ies'} ·{' '}
          {listing.landlord.rating.toFixed(1)} rating
        </p>
      </section>
    </div>
  );
}
