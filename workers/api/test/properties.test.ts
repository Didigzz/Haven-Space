import { describe, expect, it } from 'bun:test';

import app from '../src/index';
import type { Env } from '../src/env';
import type { AmenityRow, MapPropertyRow, PropertyPhotoRow } from '../src/repositories/listings';

interface D1Response {
  first?: unknown;
  all?: unknown[];
}

function createSequenceDb(responses: D1Response[], capturedBinds: unknown[][] = []): D1Database {
  const responseQueue = [...responses];
  const nextResponse = () => responseQueue.shift() ?? {};

  return {
    prepare: () =>
      ({
        bind: (...values: unknown[]) => {
          capturedBinds.push(values);

          return {
            first: async () => nextResponse().first ?? null,
            all: async () => ({ results: nextResponse().all ?? [] }),
          };
        },
        first: async () => nextResponse().first ?? null,
        all: async () => ({ results: nextResponse().all ?? [] }),
      } as unknown as D1PreparedStatement),
  } as unknown as D1Database;
}

function createSequenceEnv(responses: D1Response[], capturedBinds: unknown[][] = []): Env {
  return {
    APP_ENV: 'test',
    APP_ORIGIN: 'http://localhost',
    DB: createSequenceDb(responses, capturedBinds),
  };
}

describe('properties routes', () => {
  it('returns all map properties with the PHP response shape and  alias', async () => {
    const properties: MapPropertyRow[] = [
      {
        id: 10,
        name: 'Pine House',
        description: 'Near campus',
        address: '123 Mabini St',
        latitude: 14.5995,
        longitude: 120.9842,
        price: 4500,
        status: 'available',
        listing_moderation_status: 'published',
        created_at: '2020-01-01T00:00:00.000Z',
        landlord_id: 3,
        city: 'Manila',
        province: 'Metro Manila',
        rooms_count: 2,
        occupied_rooms: 1,
        landlord_first_name: 'Ana',
        landlord_last_name: 'Reyes',
        landlord_business_name: 'Pine Rentals',
      },
      {
        id: 11,
        name: 'Maple House',
        description: null,
        address: '456 Rizal Ave',
        latitude: 14.6501,
        longitude: 121.0499,
        price: 5200,
        status: 'available',
        listing_moderation_status: 'published',
        created_at: '2020-01-02T00:00:00.000Z',
        landlord_id: 4,
        city: 'Quezon City',
        province: 'Metro Manila',
        rooms_count: 2,
        occupied_rooms: 2,
        landlord_first_name: 'Ben',
        landlord_last_name: 'Santos',
        landlord_business_name: '',
      },
    ];
    const amenities: AmenityRow[] = [
      { property_id: 10, amenity_name: 'WiFi' },
      { property_id: 10, amenity_name: 'Laundry' },
    ];
    const photos: PropertyPhotoRow[] = [
      { property_id: 10, photo_url: '/uploads/cover.jpg', is_cover: 1 },
      { property_id: 10, photo_url: '/uploads/side.jpg', is_cover: 0 },
    ];

    const response = await app.request(
      'http://localhost/api/properties/all',
      {},
      createSequenceEnv([{ all: properties }, { all: amenities }, { all: photos }])
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      data: {
        properties: [
          {
            id: 10,
            name: 'Pine House',
            type: 'boarding-house',
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
            occupancy_rate: 50,
            landlord_id: 3,
            landlord_name: 'Pine Rentals',
            created_at: '2020-01-01T00:00:00.000Z',
            amenities: ['WiFi', 'Laundry'],
            photos: ['/uploads/cover.jpg', '/uploads/side.jpg'],
          },
          {
            id: 11,
            name: 'Maple House',
            type: 'boarding-house',
            description: '',
            address: '456 Rizal Ave',
            latitude: 14.6501,
            longitude: 121.0499,
            city: 'Quezon City',
            province: 'Metro Manila',
            price: 5200,
            status: 'full',
            total_rooms: 2,
            occupied_rooms: 2,
            occupancy_rate: 100,
            landlord_id: 4,
            landlord_name: 'Ben Santos',
            created_at: '2020-01-02T00:00:00.000Z',
            amenities: [],
            photos: [],
          },
        ],
        total_count: 2,
      },
    });
  });

  it('returns an empty all-properties response for maps', async () => {
    const response = await app.request(
      'http://localhost/api/properties/all',
      {},
      createSequenceEnv([{ all: [] }])
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        properties: [],
        total_count: 0,
      },
    });
  });
});
