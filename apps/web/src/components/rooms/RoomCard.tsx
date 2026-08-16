import { Link } from '@tanstack/react-router';
import type { PublicProperty } from '../../lib/types';
import { Icon } from '../ui/Icon';
import { StatusBadge } from '../ui/StatusBadge';

export function RoomCard({
  property,
  detailTo = '/rooms/$id',
}: {
  property: PublicProperty;
  detailTo?: string;
}) {
  const image = property.image || '/assets/images/placeholder-room.svg';
  const available = property.availableRooms > 0;

  return (
    <li className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card transition-shadow hover:shadow-pop">
      <Link to={detailTo} params={{ id: String(property.id) }} className="block">
        <div className="relative h-44 w-full overflow-hidden bg-mint/40">
          <img src={image} alt={property.title} className="h-full w-full object-cover" />
          <div className="absolute right-2 top-2">
            <StatusBadge status={available ? 'available' : 'full'} />
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-ink">{property.title}</h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-gray-ink">
            <Icon name="location" size={14} className="shrink-0" />
            <span className="truncate">
              {property.address}, {property.city}
            </span>
          </p>
          <div className="mt-3 flex items-end justify-between">
            <p className="text-lg font-bold text-primary">
              ₱{property.price.toLocaleString()}
              <span className="text-sm font-normal text-gray-ink">/mo</span>
            </p>
            <p className="text-sm text-gray-ink">
              {property.availableRooms} of {property.totalRooms} rooms
            </p>
          </div>
        </div>
      </Link>
    </li>
  );
}
