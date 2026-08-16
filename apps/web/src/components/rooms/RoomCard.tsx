import { Link } from '@tanstack/react-router';
import type { PublicProperty } from '../../lib/types';

export function RoomCard({
  property,
  detailTo = '/rooms/$id',
}: {
  property: PublicProperty;
  detailTo?: string;
}) {
  return (
    <li className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <Link to={detailTo} params={{ id: String(property.id) }}>
        <img src={property.image} alt={property.title} className="h-44 w-full object-cover" />
        <div className="p-3">
          <h3 className="font-semibold">{property.title}</h3>
          <p className="text-sm text-gray-ink">
            {property.address}, {property.city}
          </p>
          <p className="font-bold text-primary">₱{property.price.toLocaleString()}</p>
          <p className="text-sm text-gray-ink">
            {property.availableRooms} of {property.totalRooms} rooms available
          </p>
        </div>
      </Link>
    </li>
  );
}
