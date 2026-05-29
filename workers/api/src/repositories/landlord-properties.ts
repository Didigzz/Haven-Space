export interface LandlordPropertyListRow {
  id: number;
  title: string;
  description: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
  price: number;
  status: string;
  listing_moderation_status: string;
  created_at: string | null;
  rooms_count: number;
  occupied_rooms: number;
  monthly_revenue: number;
  property_type: string | null;
  pending_applications: number;
}

export interface LandlordPropertyDetailRow {
  id: number;
  title: string;
  description: string | null;
  property_type: string | null;
  gender_preference: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  province: string | null;
  price: number;
  deposit: number | null;
  advance: string | null;
  min_stay: string | null;
  property_rules: string | null;
  status: string;
  listing_moderation_status: string;
  created_at: string | null;
  rooms_count: number;
  occupied_rooms: number;
}

export interface LandlordAmenityRow {
  property_id: number;
  amenity_name: string;
}

export interface LandlordPhotoRow {
  property_id: number;
  photo_url: string;
  is_cover?: number;
}

export interface LandlordPropertiesResult {
  properties: LandlordPropertyListRow[];
  amenities: Map<number, string[]>;
  photos: Map<number, string[]>;
}

export interface LandlordPropertyDetailResult {
  property: LandlordPropertyDetailRow;
  amenities: string[];
  photos: string[];
}

function placeholders(length: number): string {
  return Array.from({ length }, () => '?').join(', ');
}

function groupRows<Row, Key extends string | number>(
  rows: Row[],
  keyForRow: (row: Row) => Key
): Map<Key, Row[]> {
  const groups = new Map<Key, Row[]>();

  for (const row of rows) {
    const key = keyForRow(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  return groups;
}

function normalizePropertyPhoto(propertyId: number, photoUrl: string): string {
  if (!photoUrl || photoUrl.startsWith('/') || photoUrl.startsWith('http')) {
    return photoUrl;
  }

  return `/storage/properties/${propertyId}/${photoUrl}`;
}

async function listLandlordAmenities(
  db: D1Database,
  propertyIds: number[]
): Promise<Map<number, string[]>> {
  if (propertyIds.length === 0) {
    return new Map();
  }

  const result = await db
    .prepare(
      `
        SELECT property_id, amenity_name
        FROM amenities
        WHERE property_id IN (${placeholders(propertyIds.length)})
        ORDER BY property_id ASC, amenity_name ASC
      `
    )
    .bind(...propertyIds)
    .all<LandlordAmenityRow>();
  const groups = groupRows(result.results ?? [], row => Number(row.property_id));

  return new Map(
    Array.from(groups.entries()).map(([propertyId, rows]) => [
      propertyId,
      rows.map(row => row.amenity_name),
    ])
  );
}

async function listLandlordPhotos(
  db: D1Database,
  propertyIds: number[]
): Promise<Map<number, string[]>> {
  if (propertyIds.length === 0) {
    return new Map();
  }

  const result = await db
    .prepare(
      `
        SELECT property_id, photo_url, is_cover
        FROM property_photos
        WHERE property_id IN (${placeholders(propertyIds.length)})
        ORDER BY property_id ASC, display_order ASC, id ASC
      `
    )
    .bind(...propertyIds)
    .all<LandlordPhotoRow>();
  const groups = groupRows(result.results ?? [], row => Number(row.property_id));

  return new Map(
    Array.from(groups.entries()).map(([propertyId, rows]) => [
      propertyId,
      rows.map(row => normalizePropertyPhoto(propertyId, row.photo_url)),
    ])
  );
}

export async function listLandlordProperties(
  db: D1Database,
  landlordId: number
): Promise<LandlordPropertiesResult> {
  const result = await db
    .prepare(
      `
        SELECT
          p.id,
          p.title,
          p.description,
          a.address_line_1 as address,
          a.city,
          a.province,
          a.latitude,
          a.longitude,
          p.price,
          p.status,
          p.listing_moderation_status,
          p.created_at,
          COUNT(DISTINCT r.id) as rooms_count,
          COALESCE(SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END), 0) as occupied_rooms,
          COALESCE(SUM(CASE WHEN r.status = 'occupied' THEN r.price ELSE 0 END), 0) as monthly_revenue,
          lp.property_type as property_type,
          (
            SELECT COUNT(*)
            FROM applications app
            JOIN rooms rm ON app.room_id = rm.id
            WHERE rm.property_id = p.id
              AND app.status = 'pending'
              AND app.deleted_at IS NULL
              AND rm.deleted_at IS NULL
          ) as pending_applications
        FROM properties p
        LEFT JOIN addresses a ON p.address_id = a.id
        LEFT JOIN rooms r ON p.id = r.property_id
          AND r.deleted_at IS NULL
        LEFT JOIN landlord_profiles lp ON lp.user_id = p.landlord_id
        WHERE p.landlord_id = ?
          AND p.deleted_at IS NULL
        GROUP BY
          p.id,
          p.title,
          p.description,
          a.address_line_1,
          a.city,
          a.province,
          a.latitude,
          a.longitude,
          p.price,
          p.status,
          p.listing_moderation_status,
          p.created_at,
          lp.property_type
        ORDER BY p.created_at DESC
      `
    )
    .bind(landlordId)
    .all<LandlordPropertyListRow>();
  const properties = result.results ?? [];
  const propertyIds = properties.map(property => Number(property.id));
  const [amenities, photos] = await Promise.all([
    listLandlordAmenities(db, propertyIds),
    listLandlordPhotos(db, propertyIds),
  ]);

  return {
    properties,
    amenities,
    photos,
  };
}

export async function getLandlordPropertyDetail(
  db: D1Database,
  propertyId: number,
  landlordId: number
): Promise<LandlordPropertyDetailResult | null> {
  const property = await db
    .prepare(
      `
        SELECT
          p.id,
          p.title,
          p.description,
          p.property_type,
          p.gender_preference,
          a.address_line_1 as address,
          a.latitude,
          a.longitude,
          a.city,
          a.province,
          p.price,
          p.deposit,
          p.advance,
          p.min_stay,
          p.property_rules,
          p.status,
          p.listing_moderation_status,
          p.created_at,
          COUNT(DISTINCT r.id) as rooms_count,
          COALESCE(SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END), 0) as occupied_rooms
        FROM properties p
        LEFT JOIN addresses a ON p.address_id = a.id
        LEFT JOIN rooms r ON p.id = r.property_id
          AND r.deleted_at IS NULL
        WHERE p.id = ?
          AND p.landlord_id = ?
          AND p.deleted_at IS NULL
        GROUP BY
          p.id,
          p.title,
          p.description,
          p.property_type,
          p.gender_preference,
          a.address_line_1,
          a.latitude,
          a.longitude,
          a.city,
          a.province,
          p.price,
          p.deposit,
          p.advance,
          p.min_stay,
          p.property_rules,
          p.status,
          p.listing_moderation_status,
          p.created_at
        LIMIT 1
      `
    )
    .bind(propertyId, landlordId)
    .first<LandlordPropertyDetailRow>();

  if (!property) {
    return null;
  }

  const [amenities, photos] = await Promise.all([
    listLandlordAmenities(db, [propertyId]),
    listLandlordPhotos(db, [propertyId]),
  ]);

  return {
    property,
    amenities: amenities.get(propertyId) ?? [],
    photos: photos.get(propertyId) ?? [],
  };
}
