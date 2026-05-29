import { Hono, type Context } from 'hono';

import type { Env } from '../env';
import { authenticateUser, type AuthenticatedUser } from '../lib/auth';
import { requireD1 } from '../lib/d1';
import { errorResponse, jsonResponse } from '../lib/http';
import { readJsonObject, type JsonRecord } from '../lib/validation';
import {
  createLandlordAddress,
  createLandlordAmenity,
  createLandlordProperty,
  createLandlordRoom,
  getLandlordPropertyDetail,
  listLandlordProperties,
  type LandlordPropertyDetailResult,
  type LandlordPropertyListRow,
} from '../repositories/landlord-properties';

const landlordRoutes = new Hono<{ Bindings: Env }>();
const createListingRequiredFields = [
  'propertyName',
  'propertyType',
  'genderPreference',
  'propertyDescription',
  'propertyPrice',
  'propertyDeposit',
  'propertyRooms',
  'propertyCapacity',
  'propertyAddress',
  'propertyCity',
  'propertyProvince',
] as const;

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function requireLandlord(
  c: Context<{ Bindings: Env }>
): Promise<AuthenticatedUser | Response> {
  const user = await authenticateUser(requireD1(c.env), c.req.raw, c.env.JWT_SECRET);

  if (user.role !== 'landlord') {
    return errorResponse(403, 'Forbidden: You do not have permission to access this resource');
  }

  return user;
}

function mapPropertyType(value: string | null | undefined): string {
  const typeMapping: Record<string, string> = {
    'Single unit': 'boarding-house',
    'Multi-unit': 'boarding-house',
    Apartment: 'apartment',
    Dormitory: 'dormitory',
  };

  if (!value) {
    return 'boarding-house';
  }

  return typeMapping[value] ?? value;
}

function mapListStatus(property: LandlordPropertyListRow): string {
  const totalRooms = Number(property.rooms_count);
  const occupiedRooms = Number(property.occupied_rooms);

  if (property.listing_moderation_status === 'rejected') {
    return 'inactive';
  }

  if (totalRooms > 0 && occupiedRooms >= totalRooms) {
    return 'full';
  }

  return 'active';
}

function mapDetailStatus(status: string): string {
  if (status === 'available') {
    return 'active';
  }

  if (status === 'hidden') {
    return 'inactive';
  }

  return status;
}

function isPhpEmpty(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    value === 0 ||
    value === '0' ||
    value === false
  );
}

function requiredFieldErrors(body: JsonRecord): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of createListingRequiredFields) {
    if (isPhpEmpty(body[field])) {
      const message = `${field.replace('property', '') || field} is required`;
      errors[field] = message.charAt(0).toUpperCase() + message.slice(1);
    }
  }

  return errors;
}

function stringValue(body: JsonRecord, field: string, fallback = ''): string {
  const value = body[field];

  if (value === undefined || value === null) {
    return fallback;
  }

  return String(value).trim();
}

function numberValue(body: JsonRecord, field: string, fallback = 0): number {
  const parsed = Number.parseFloat(String(body[field] ?? ''));

  return Number.isFinite(parsed) ? parsed : fallback;
}

function intValue(value: unknown, fallback = 0): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function listingRooms(body: JsonRecord) {
  const customRooms = Array.isArray(body.rooms) ? body.rooms : [];

  if (customRooms.length > 0) {
    return customRooms.map((room, index) => {
      const roomRecord =
        room && typeof room === 'object' && !Array.isArray(room) ? (room as JsonRecord) : {};
      const roomName = String(roomRecord.name ?? '').trim() || `Room ${index + 1}`;
      const capacity = intValue(roomRecord.capacity, 1);
      const roomTypeValue = String(roomRecord.roomType ?? '').trim();
      const roomType = roomTypeValue || (capacity === 1 ? 'single' : 'shared');

      return {
        title: roomName,
        roomNumber: roomName,
        roomType,
        capacity,
      };
    });
  }

  const roomsCount = intValue(body.propertyRooms);
  const capacity = intValue(body.propertyCapacity, 1);
  const roomType = capacity === 1 ? 'single' : 'shared';
  const roomTypeDisplay = capacity === 1 ? 'Single Room' : `Shared Room (${capacity} persons)`;

  return Array.from({ length: Math.max(roomsCount, 0) }, (_, index) => {
    const roomNumber = `Room ${index + 1}`;

    return {
      title: `${roomTypeDisplay} - ${roomNumber}`,
      roomNumber,
      roomType,
      capacity,
    };
  });
}

function formatLandlordPropertyListItem(
  property: LandlordPropertyListRow,
  amenities: string[],
  photos: string[]
) {
  const totalRooms = Number(property.rooms_count);
  const occupiedRooms = Number(property.occupied_rooms);

  return {
    id: Number(property.id),
    name: property.title,
    type: mapPropertyType(property.property_type),
    description: property.description ?? '',
    address: property.address ?? '',
    latitude: property.latitude === null ? null : Number(property.latitude),
    longitude: property.longitude === null ? null : Number(property.longitude),
    city: property.city ?? '',
    province: property.province ?? '',
    price: Number(property.price),
    status: mapListStatus(property),
    total_rooms: totalRooms,
    occupied_rooms: occupiedRooms,
    monthly_revenue: Number(property.monthly_revenue),
    created_at: property.created_at,
    amenities,
    photos,
    pending_applications: Number(property.pending_applications ?? 0),
  };
}

function formatLandlordPropertyDetail(result: LandlordPropertyDetailResult) {
  const property = result.property;

  return {
    id: Number(property.id),
    name: property.title,
    type: mapPropertyType(property.property_type),
    gender_preference: property.gender_preference ?? 'any',
    description: property.description ?? '',
    address: property.address ?? '',
    latitude: property.latitude === null ? '' : Number(property.latitude),
    longitude: property.longitude === null ? '' : Number(property.longitude),
    city: property.city ?? '',
    province: property.province ?? '',
    price: Number(property.price),
    deposit: property.deposit === null ? 0 : Number(property.deposit),
    capacity: '',
    min_stay: property.min_stay ?? '',
    availability: 'available-now',
    status: mapDetailStatus(property.status),
    total_rooms: Number(property.rooms_count),
    rooms: Number(property.rooms_count),
    occupied_rooms: Number(property.occupied_rooms),
    created_at: property.created_at,
    amenities: result.amenities,
    photos: result.photos,
    rules: property.property_rules ?? '',
    monthlyPayment: Number(property.price),
    monthlyDeposit: property.deposit === null ? 0 : Number(property.deposit),
    advancePayment: property.advance ?? 'None',
  };
}

async function handleCreateListing(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const body = await readJsonObject(c.req.raw);
  const errors = requiredFieldErrors(body);

  if (Object.keys(errors).length > 0) {
    return jsonResponse({ errors }, 400);
  }

  const latitude = isPhpEmpty(body.propertyLatitude) ? null : numberValue(body, 'propertyLatitude');
  const longitude = isPhpEmpty(body.propertyLongitude)
    ? null
    : numberValue(body, 'propertyLongitude');
  const addressId = await createLandlordAddress(
    db,
    stringValue(body, 'propertyAddress'),
    stringValue(body, 'propertyCity'),
    stringValue(body, 'propertyProvince'),
    latitude,
    longitude
  );
  const propertyName = stringValue(body, 'propertyName');
  const propertyPrice = numberValue(body, 'propertyPrice');
  const propertyId = await createLandlordProperty(db, {
    landlordId: user.user_id,
    title: propertyName,
    propertyType: stringValue(body, 'propertyType', 'boarding-house'),
    description: stringValue(body, 'propertyDescription'),
    addressId,
    price: propertyPrice,
    deposit: numberValue(body, 'propertyDeposit'),
    advance: stringValue(body, 'propertyAdvance', '1 month') || '1 month',
    minStay: stringValue(body, 'propertyMinStay', '1 month') || '1 month',
    houseRules: JSON.stringify([]),
    genderPreference: stringValue(body, 'genderPreference', 'any') || 'any',
    propertyRules: stringValue(body, 'propertyRules') || null,
  });
  const roomIds: number[] = [];

  for (const room of listingRooms(body)) {
    const roomId = await createLandlordRoom(db, {
      propertyId,
      landlordId: user.user_id,
      title: room.title,
      price: propertyPrice,
      description: '',
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      capacity: room.capacity,
    });

    roomIds.push(roomId);
  }

  if (Array.isArray(body.amenities)) {
    for (const amenity of body.amenities) {
      const amenityName = String(amenity ?? '').trim();

      if (amenityName) {
        await createLandlordAmenity(db, propertyId, amenityName);
      }
    }
  }

  return jsonResponse(
    {
      message: 'Listing created successfully',
      data: {
        id: propertyId,
        title: propertyName,
        status: 'available',
        room_ids: roomIds,
      },
    },
    201
  );
}

async function handleLandlordProperties(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const propertyIdParam = c.req.query('id');

  if (propertyIdParam) {
    const propertyId = parsePositiveInt(propertyIdParam);

    if (!propertyId) {
      return errorResponse(404, 'Property not found');
    }

    const property = await getLandlordPropertyDetail(db, propertyId, user.user_id);

    if (!property) {
      return errorResponse(404, 'Property not found');
    }

    return jsonResponse({ data: formatLandlordPropertyDetail(property) });
  }

  const result = await listLandlordProperties(db, user.user_id);
  const properties = result.properties.map(property =>
    formatLandlordPropertyListItem(
      property,
      result.amenities.get(Number(property.id)) ?? [],
      result.photos.get(Number(property.id)) ?? []
    )
  );

  return jsonResponse({
    data: {
      properties,
      total_count: properties.length,
    },
  });
}

landlordRoutes.post('/api/landlord/listings', handleCreateListing);
landlordRoutes.get('/api/landlord/properties', handleLandlordProperties);
landlordRoutes.get('/api/landlord/properties.php', handleLandlordProperties);

export default landlordRoutes;
