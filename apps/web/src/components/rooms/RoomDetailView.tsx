import { Link } from '@tanstack/react-router';
import type { ListingDetail } from '../../lib/types';
import { SaveButton } from './SaveButton';

export function RoomDetailView({
  listing,
  showSave = false,
  applyTo,
}: {
  listing: ListingDetail;
  showSave?: boolean;
  applyTo?: string;
}) {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold">{listing.title}</h1>
      <img
        src={listing.coverImage}
        alt={listing.title}
        className="my-4 h-80 w-full rounded-lg object-cover"
      />
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xl font-bold text-primary">₱{listing.price.toLocaleString()}</p>
        {showSave ? <SaveButton propertyId={listing.id} /> : null}
        {applyTo ? (
          <Link
            to={applyTo}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          >
            Apply to this room
          </Link>
        ) : null}
      </div>
      <p className="mt-2 text-gray-ink">
        {listing.address}, {listing.city}, {listing.province}
      </p>
      <p className="mt-2">{listing.description}</p>

      {listing.amenities.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Amenities</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {listing.amenities.map((amenity) => (
              <li key={amenity} className="rounded-full bg-mint px-3 py-1 text-sm">
                {amenity}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Rooms</h2>
        <ul className="mt-2 space-y-2">
          {listing.rooms.map((room) => (
            <li key={room.id} className="rounded-md border border-gray-200 p-3">
              <p className="font-medium">
                {room.roomNumber} — ₱{room.price.toLocaleString()}
              </p>
              <p className="text-sm text-gray-ink">
                {room.roomType} · {room.capacity} occupant(s) · {room.status}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-md border border-gray-200 p-4">
        <h2 className="text-lg font-semibold">Landlord</h2>
        <p className="mt-1">{listing.landlord.name}</p>
        <p className="text-sm text-gray-ink">
          {listing.landlord.properties} propert{listing.landlord.properties === 1 ? 'y' : 'ies'} ·{' '}
          {listing.landlord.rating.toFixed(1)} rating
        </p>
      </section>
    </div>
  );
}
