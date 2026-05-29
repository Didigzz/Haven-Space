import { describe, expect, it } from 'bun:test';

import app from '../src/index';
import type { Env } from '../src/env';
import type {
  LandlordAmenityRow,
  LandlordPhotoRow,
  LandlordPropertyDetailRow,
  LandlordPropertyListRow,
} from '../src/repositories/landlord-properties';

interface D1Response {
  first?: unknown;
  all?: unknown[];
}

function createSequenceDb(responses: D1Response[], capturedBinds: unknown[][] = []): D1Database {
  const responseQueue = [...responses];

  return {
    prepare: () =>
      ({
        bind: (...values: unknown[]) => {
          capturedBinds.push(values);
          const response = responseQueue.shift() ?? {};

          return {
            first: async () => response.first ?? null,
            all: async () => ({ results: response.all ?? [] }),
          };
        },
      } as unknown as D1PreparedStatement),
  } as unknown as D1Database;
}

function createSequenceEnv(responses: D1Response[], capturedBinds: unknown[][] = []): Env {
  return {
    APP_ENV: 'test',
    APP_ORIGIN: 'http://localhost',
    JWT_SECRET: 'test-secret',
    DB: createSequenceDb(responses, capturedBinds),
  };
}

const landlordUser = {
  id: 3,
  role: 'landlord',
  is_verified: 1,
  email_verified: 1,
  account_status: 'active',
};

const boarderUser = {
  id: 7,
  role: 'boarder',
  is_verified: 1,
  email_verified: 1,
  account_status: 'active',
};

const propertyRow: LandlordPropertyListRow = {
  id: 10,
  title: 'Pine House',
  description: 'Near campus',
  address: '123 Mabini St',
  city: 'Manila',
  province: 'Metro Manila',
  latitude: 14.5995,
  longitude: 120.9842,
  price: 4500,
  status: 'available',
  listing_moderation_status: 'published',
  created_at: '2026-05-01 10:00:00',
  rooms_count: 2,
  occupied_rooms: 1,
  monthly_revenue: 5000,
  property_type: 'Apartment',
  pending_applications: 3,
};

const detailRow: LandlordPropertyDetailRow = {
  id: 10,
  title: 'Pine House',
  description: 'Near campus',
  property_type: 'boarding-house',
  gender_preference: 'any',
  address: '123 Mabini St',
  latitude: 14.5995,
  longitude: 120.9842,
  city: 'Manila',
  province: 'Metro Manila',
  price: 4500,
  deposit: 1000,
  advance: '1 month',
  min_stay: '6 months',
  property_rules: 'No smoking',
  status: 'available',
  listing_moderation_status: 'published',
  created_at: '2026-05-01 10:00:00',
  rooms_count: 2,
  occupied_rooms: 1,
};

const amenities: LandlordAmenityRow[] = [
  { property_id: 10, amenity_name: 'WiFi' },
  { property_id: 10, amenity_name: 'Laundry' },
];

const photos: LandlordPhotoRow[] = [
  { property_id: 10, photo_url: 'cover.jpg', is_cover: 1 },
  { property_id: 10, photo_url: '/uploads/side.jpg', is_cover: 0 },
];

describe('landlord property routes', () => {
  it('returns landlord properties with the PHP response shape and .php alias', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/properties.php',
      { headers: { 'X-User-ID': '3' } },
      createSequenceEnv(
        [{ first: landlordUser }, { all: [propertyRow] }, { all: amenities }, { all: photos }],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        properties: [
          {
            id: 10,
            name: 'Pine House',
            type: 'apartment',
            description: 'Near campus',
            address: '123 Mabini St',
            latitude: 14.5995,
            longitude: 120.9842,
            city: 'Manila',
            province: 'Metro Manila',
            price: 4500,
            status: 'active',
            total_rooms: 2,
            occupied_rooms: 1,
            monthly_revenue: 5000,
            created_at: '2026-05-01 10:00:00',
            amenities: ['WiFi', 'Laundry'],
            photos: ['/storage/properties/10/cover.jpg', '/uploads/side.jpg'],
            pending_applications: 3,
          },
        ],
        total_count: 1,
      },
    });
    expect(capturedBinds).toEqual([[3], [3], [10], [10]]);
  });

  it('returns an empty landlord property list from the non-php route', async () => {
    const response = await app.request(
      'http://localhost/api/landlord/properties',
      { headers: { 'X-User-ID': '3' } },
      createSequenceEnv([{ first: landlordUser }, { all: [] }])
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        properties: [],
        total_count: 0,
      },
    });
  });

  it('returns single landlord property detail with amenities and photos', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/properties.php?id=10',
      { headers: { 'X-User-ID': '3' } },
      createSequenceEnv(
        [{ first: landlordUser }, { first: detailRow }, { all: amenities }, { all: photos }],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        id: 10,
        name: 'Pine House',
        type: 'boarding-house',
        gender_preference: 'any',
        description: 'Near campus',
        address: '123 Mabini St',
        latitude: 14.5995,
        longitude: 120.9842,
        city: 'Manila',
        province: 'Metro Manila',
        price: 4500,
        deposit: 1000,
        capacity: '',
        min_stay: '6 months',
        availability: 'available-now',
        status: 'active',
        total_rooms: 2,
        rooms: 2,
        occupied_rooms: 1,
        created_at: '2026-05-01 10:00:00',
        amenities: ['WiFi', 'Laundry'],
        photos: ['/storage/properties/10/cover.jpg', '/uploads/side.jpg'],
        rules: 'No smoking',
        monthlyPayment: 4500,
        monthlyDeposit: 1000,
        advancePayment: '1 month',
      },
    });
    expect(capturedBinds).toEqual([[3], [10, 3], [10], [10]]);
  });

  it('returns PHP-compatible landlord property not found behavior', async () => {
    const response = await app.request(
      'http://localhost/api/landlord/properties.php?id=404',
      { headers: { 'X-User-ID': '3' } },
      createSequenceEnv([{ first: landlordUser }, { first: null }])
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Property not found' });
  });

  it('requires a landlord role for landlord properties', async () => {
    const response = await app.request(
      'http://localhost/api/landlord/properties',
      { headers: { 'X-User-ID': '7' } },
      createSequenceEnv([{ first: boarderUser }])
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'Forbidden: You do not have permission to access this resource',
    });
  });
});
