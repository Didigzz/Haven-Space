import { Hono, type Context } from 'hono';

import type { Env } from '../env';
import { requireD1 } from '../lib/d1';
import { jsonResponse } from '../lib/http';
import {
  listAllMapProperties,
  type MapPropertyRow,
  type PropertyPhotoRow,
} from '../repositories/listings';

const propertiesRoutes = new Hono<{ Bindings: Env }>();

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMapProperty(
  property: MapPropertyRow,
  amenities: string[],
  photos: PropertyPhotoRow[]
) {
  const totalRooms = Number(property.rooms_count ?? 0);
  const occupiedRooms = Number(property.occupied_rooms ?? 0);
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const landlordName = property.landlord_business_name
    ? property.landlord_business_name
    : `${property.landlord_first_name ?? ''} ${property.landlord_last_name ?? ''}`.trim();

  return {
    id: Number(property.id),
    name: escapeHtml(property.name),
    type: 'boarding-house',
    description: escapeHtml(property.description),
    address: escapeHtml(property.address),
    latitude: Number(property.latitude),
    longitude: Number(property.longitude),
    city: escapeHtml(property.city),
    province: escapeHtml(property.province),
    price: Number(property.price),
    status: occupancyRate === 100 && totalRooms > 0 ? 'full' : 'active',
    total_rooms: totalRooms,
    occupied_rooms: occupiedRooms,
    occupancy_rate: occupancyRate,
    landlord_id: Number(property.landlord_id),
    landlord_name: escapeHtml(landlordName),
    created_at: property.created_at,
    amenities,
    photos: photos.map(photo => photo.photo_url),
  };
}

async function listAllProperties(c: Context<{ Bindings: Env }>) {
  const result = await listAllMapProperties(requireD1(c.env));

  return jsonResponse({
    data: {
      properties: result.properties.map(property =>
        formatMapProperty(
          property,
          result.amenities.get(Number(property.id)) ?? [],
          result.propertyPhotos.get(Number(property.id)) ?? []
        )
      ),
      total_count: result.properties.length,
    },
  });
}

propertiesRoutes.get('/api/properties/all', listAllProperties);

export default propertiesRoutes;
