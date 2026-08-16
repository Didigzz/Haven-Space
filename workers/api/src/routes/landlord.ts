import { Hono, type Context } from 'hono';

import type { Env } from '../env';
import { authenticateUser, type AuthenticatedUser } from '../lib/auth';
import { requireD1 } from '../lib/d1';
import { errorResponse, jsonResponse } from '../lib/http';
import { deleteUploadThingFileByUrl, uploadFilesToUploadThing } from '../lib/uploadthing';
import { readJsonObject, type JsonRecord } from '../lib/validation';
import {
  createManualBoarderApplication,
  createManualBoarderUser,
  findBoarderUserByEmail,
  findLandlordBoarderApplication,
  listLandlordBoarders,
  softDeleteLandlordBoarderApplications,
  updateBoarderApplication,
  updateBoarderRoomPricing,
  updateBoarderUser,
} from '../repositories/landlord-boarders';
import { getLandlordDashboardStats } from '../repositories/landlord-dashboard';
import {
  clearLandlordRoomCover,
  createLandlordRoomPhoto,
  createLandlordManagedRoom,
  deleteLandlordRoomPhoto,
  findDuplicateLandlordRoomNumber,
  findLandlordRoomPhoto,
  findLandlordManagedRoomIdentity,
  findLandlordRoomProperty,
  findNextLandlordRoomPhoto,
  getLandlordRoomPhotoStats,
  getLandlordManagedRoom,
  getLandlordManagedRoomById,
  listLandlordManagedRooms,
  listLandlordRoomPhotos,
  setLandlordRoomPhotoCover,
  softDeleteLandlordManagedRoom,
  updateLandlordManagedRoom,
  type LandlordRoomPhotoRow,
  type LandlordRoomRow,
} from '../repositories/landlord-rooms';
import {
  countLandlordRooms,
  createLandlordAddress,
  createLandlordAmenity,
  createLandlordPropertyPhoto,
  createLandlordProperty,
  createLandlordPropertyFromAlias,
  createLandlordRoom,
  deleteLandlordAmenities,
  deleteLandlordPropertyPhotoByUrl,
  findLandlordPropertyForUpdate,
  findLandlordPropertyIdentity,
  getLandlordAddress,
  getMaxPropertyPhotoDisplayOrder,
  getLandlordPropertyDetail,
  listLandlordRoomIdsForRemoval,
  listLandlordPropertyPhotoUrls,
  listLandlordProperties,
  softDeleteLandlordProperty,
  softDeleteLandlordPropertyRooms,
  softDeleteLandlordRoomsById,
  updateLandlordActiveRooms,
  updateLandlordAddress,
  updateLandlordPropertyPhotoOrder,
  updateLandlordProperty,
  type LandlordPropertyDetailResult,
  type LandlordPropertyListRow,
  type LandlordPropertyUpdateRow,
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
const minStayMap: Record<string, string> = {
  'no-minimum': 'No minimum',
  '1-month': '1 month',
  '3-months': '3 months',
  '6-months': '6 months',
  '1-year': '1 year',
};
const validRoomStatuses = new Set(['available', 'occupied', 'maintenance']);
const allowedPhotoExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const allowedRoomPhotoExtensions = new Set(['jpg', 'jpeg', 'png', 'webp']);
const maxPhotoSizeBytes = 5 * 1024 * 1024;

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

function requireVerifiedLandlordWrite(user: AuthenticatedUser): Response | null {
  if (!user.email_verified) {
    return jsonResponse(
      {
        error: 'Email verification required',
        message: 'Please verify your email address before accessing landlord features.',
      },
      403
    );
  }

  if (user.account_status === 'pending_verification') {
    return jsonResponse(
      {
        error: 'Account verification pending',
        message:
          'Your account is pending verification. Write operations are not allowed until an admin approves your account.',
      },
      403
    );
  }

  if (!user.is_verified) {
    return jsonResponse(
      {
        error: 'Account verification required',
        message:
          'Your account is pending verification. Write operations are not allowed until an admin approves your account.',
      },
      403
    );
  }

  return null;
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

function positiveIntValue(value: unknown): number | null {
  const parsed = Number.parseInt(String(value ?? ''), 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function hasBodyField(body: JsonRecord, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, field) && body[field] !== null;
}

function hasOwnBodyField(body: JsonRecord, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, field);
}

function hasAnyBodyField(body: JsonRecord, fields: string[]): boolean {
  return fields.some(field => hasBodyField(body, field));
}

function firstBodyValue(body: JsonRecord, fields: string[]): unknown | undefined {
  for (const field of fields) {
    if (hasBodyField(body, field)) {
      return body[field];
    }
  }

  return undefined;
}

function stringFromFields(body: JsonRecord, fields: string[], fallback = ''): string {
  const value = firstBodyValue(body, fields);

  if (value === undefined) {
    return fallback;
  }

  return String(value).trim();
}

function numberFromFields(body: JsonRecord, fields: string[], fallback = 0): number {
  const value = firstBodyValue(body, fields);

  if (value === undefined) {
    return fallback;
  }

  const parsed = Number.parseFloat(String(value));

  return Number.isFinite(parsed) ? parsed : fallback;
}

function floatValue(value: unknown, fallback = 0): number {
  const parsed = Number.parseFloat(String(value ?? ''));

  return Number.isFinite(parsed) ? parsed : fallback;
}

function locationNumberFromFields(
  body: JsonRecord,
  fields: string[],
  fallback: number | null
): number | null {
  const value = firstBodyValue(body, fields);

  if (value === undefined || isPhpEmpty(value)) {
    return fallback;
  }

  const parsed = Number.parseFloat(String(value));

  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeListingStatus(status: string): string {
  if (status === 'active') {
    return 'available';
  }

  if (status === 'inactive') {
    return 'hidden';
  }

  return status || 'available';
}

function normalizeRoomCreateStatus(value: unknown): string {
  const status = String(value ?? '');

  return validRoomStatuses.has(status) ? status : 'available';
}

function minStayFromBody(body: JsonRecord, fallback: string): string {
  const value = firstBodyValue(body, ['min_stay', 'propertyMinStay']);

  if (value === undefined) {
    return fallback;
  }

  const minStay = String(value).trim();

  return minStayMap[minStay] ?? minStay;
}

function updatePropertyId(c: Context<{ Bindings: Env }>, body: JsonRecord): number | null {
  return positiveIntValue(body.id) ?? parsePositiveInt(c.req.param('id'));
}

function missingRequiredField(body: JsonRecord, fields: string[]): string | null {
  return fields.find(field => isPhpEmpty(body[field])) ?? null;
}

function dateStringFromBody(body: JsonRecord, field: string): string {
  const value = stringValue(body, field);

  if (value) {
    return value;
  }

  return new Date().toISOString().slice(0, 10);
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

function updateRoomTitle(roomNumber: string, roomCapacity: number | null): string {
  if (!roomCapacity) {
    return roomNumber;
  }

  return roomCapacity === 1
    ? `Single Room - ${roomNumber}`
    : `Shared Room (${roomCapacity} persons) - ${roomNumber}`;
}

function formatLandlordManagedRoom(room: LandlordRoomRow, photos: LandlordRoomPhotoRow[] = []) {
  const formattedPhotos = photos.map(photo => ({
    id: Number(photo.id),
    photo_url: photo.photo_url,
    is_cover: Boolean(photo.is_cover),
    display_order: Number(photo.display_order),
  }));
  const coverPhoto =
    formattedPhotos.find(photo => photo.is_cover)?.photo_url ??
    formattedPhotos[0]?.photo_url ??
    null;

  return {
    id: Number(room.id),
    property_id: Number(room.property_id),
    room_number: room.room_number ?? '',
    room_type: room.room_type ?? null,
    description: room.description ?? null,
    price: Number(room.price),
    deposit: Number(room.deposit ?? 0),
    status: room.status ?? 'available',
    capacity: Number(room.capacity ?? 1),
    size: room.size === null || room.size === undefined ? null : Number(room.size),
    cover_photo: coverPhoto,
    photos: formattedPhotos,
    tenant: null,
    created_at: room.created_at ?? null,
    updated_at: room.updated_at ?? null,
  };
}

function fileExtension(fileName: string): string {
  const match = /\.([^.]+)$/.exec(fileName);

  return match?.[1]?.toLowerCase() ?? '';
}

function listingPhotoFiles(formData: FormData): File[] {
  const values: unknown[] = [
    ...(formData.getAll('propertyPhotos[]') as unknown[]),
    ...(formData.getAll('propertyPhotos') as unknown[]),
  ];

  return values.filter((value): value is File => value instanceof File && value.size > 0);
}

function temporaryPropertyPhotoFiles(formData: FormData): File[] {
  const values: unknown[] = [
    ...(formData.getAll('photos[]') as unknown[]),
    ...(formData.getAll('photos') as unknown[]),
  ];

  return values.filter((value): value is File => value instanceof File && value.size > 0);
}

function roomPhotoFiles(formData: FormData): File[] {
  const values: unknown[] = [
    ...(formData.getAll('roomPhotos[]') as unknown[]),
    ...(formData.getAll('roomPhotos') as unknown[]),
  ];

  return values.filter((value): value is File => value instanceof File && value.size > 0);
}

async function handleCreateListing(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const verificationError = requireVerifiedLandlordWrite(user);

  if (verificationError) {
    return verificationError;
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
    propertyRules: stringValue(body, 'propertyRules'),
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
      deposit: numberValue(body, 'propertyDeposit'),
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

async function handleCreateLandlordPropertyAlias(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const verificationError = requireVerifiedLandlordWrite(user);

  if (verificationError) {
    return verificationError;
  }

  const body = await readJsonObject(c.req.raw);

  if (
    !hasBodyField(body, 'propertyName') ||
    !hasBodyField(body, 'propertyAddress') ||
    !hasBodyField(body, 'propertyPrice')
  ) {
    return errorResponse(
      400,
      'Missing required fields: propertyName, propertyAddress, propertyPrice'
    );
  }

  const latitude = isPhpEmpty(body.propertyLatitude) ? null : numberValue(body, 'propertyLatitude');
  const longitude = isPhpEmpty(body.propertyLongitude)
    ? null
    : numberValue(body, 'propertyLongitude');
  const addressId = await createLandlordAddress(
    db,
    stringValue(body, 'propertyAddress'),
    stringValue(body, 'propertyCity', 'Unknown') || 'Unknown',
    stringValue(body, 'propertyProvince', 'Unknown') || 'Unknown',
    latitude,
    longitude
  );
  const propertyId = await createLandlordPropertyFromAlias(db, {
    landlordId: user.user_id,
    title: stringValue(body, 'propertyName'),
    description: stringValue(body, 'propertyDescription'),
    addressId,
    price: numberValue(body, 'propertyPrice'),
    status: stringValue(body, 'propertyStatus', 'available') || 'available',
  });

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
      success: true,
      data: {
        property_id: propertyId,
        message: 'Property created successfully',
      },
    },
    201
  );
}

async function updateListingAddressIfNeeded(
  db: D1Database,
  body: JsonRecord,
  property: LandlordPropertyUpdateRow
): Promise<void> {
  if (
    !property.address_id ||
    !hasAnyBodyField(body, [
      'address',
      'propertyAddress',
      'latitude',
      'propertyLatitude',
      'longitude',
      'propertyLongitude',
      'city',
      'propertyCity',
      'province',
      'propertyProvince',
    ])
  ) {
    return;
  }

  const currentAddress = await getLandlordAddress(db, property.address_id);

  await updateLandlordAddress(db, {
    addressId: property.address_id,
    address: stringFromFields(
      body,
      ['address', 'propertyAddress'],
      currentAddress?.address_line_1 ?? ''
    ),
    city: stringFromFields(body, ['city', 'propertyCity'], currentAddress?.city ?? ''),
    province: stringFromFields(
      body,
      ['province', 'propertyProvince'],
      currentAddress?.province ?? ''
    ),
    latitude: locationNumberFromFields(
      body,
      ['latitude', 'propertyLatitude'],
      currentAddress?.latitude ?? null
    ),
    longitude: locationNumberFromFields(
      body,
      ['longitude', 'propertyLongitude'],
      currentAddress?.longitude ?? null
    ),
  });
}

async function updateListingAmenitiesIfNeeded(
  db: D1Database,
  body: JsonRecord,
  propertyId: number
): Promise<void> {
  if (!Array.isArray(body.amenities)) {
    return;
  }

  await deleteLandlordAmenities(db, propertyId);

  for (const amenity of body.amenities) {
    const amenityName = String(amenity ?? '').trim();

    if (amenityName) {
      await createLandlordAmenity(db, propertyId, amenityName);
    }
  }
}

async function updateListingRoomsIfNeeded(
  db: D1Database,
  body: JsonRecord,
  property: LandlordPropertyUpdateRow,
  landlordId: number
): Promise<void> {
  const hasRoomUpdate = hasAnyBodyField(body, [
    'total_rooms',
    'propertyRooms',
    'capacity',
    'propertyCapacity',
  ]);

  if (!hasRoomUpdate) {
    return;
  }

  const propertyId = Number(property.id);
  const currentRoomCount = await countLandlordRooms(db, propertyId);
  const roomCountValue = firstBodyValue(body, ['total_rooms', 'propertyRooms']);
  const roomCapacityValue = firstBodyValue(body, ['capacity', 'propertyCapacity']);
  const newRoomCount =
    roomCountValue === undefined ? currentRoomCount : Math.max(0, intValue(roomCountValue));
  const roomCapacity =
    roomCapacityValue === undefined ? null : Math.max(0, intValue(roomCapacityValue));
  const roomType = roomCapacity === 1 ? 'single' : 'shared';
  const roomPrice = numberFromFields(
    body,
    ['price', 'propertyPrice', 'monthlyPayment'],
    Number(property.price)
  );

  if (newRoomCount > currentRoomCount) {
    for (let roomIndex = currentRoomCount + 1; roomIndex <= newRoomCount; roomIndex += 1) {
      const roomNumber = `Room ${roomIndex}`;
      await createLandlordRoom(db, {
        propertyId,
        landlordId,
        title: updateRoomTitle(roomNumber, roomCapacity),
        price: roomPrice,
        description: '',
        roomNumber,
        roomType,
        capacity: roomCapacity ?? 1,
        deposit: Number(property.deposit ?? 0),
      });
    }
  } else if (newRoomCount < currentRoomCount) {
    const roomIds = await listLandlordRoomIdsForRemoval(
      db,
      propertyId,
      currentRoomCount - newRoomCount
    );
    await softDeleteLandlordRoomsById(db, roomIds);
  }

  if (roomCapacity !== null) {
    await updateLandlordActiveRooms(db, propertyId, roomCapacity, roomType, roomPrice);
  }
}

async function updateListingPhotosIfNeeded(
  env: Env,
  db: D1Database,
  body: JsonRecord,
  propertyId: number
): Promise<void> {
  if (!Array.isArray(body.photos)) {
    return;
  }

  if (Array.isArray(body.photos_to_delete)) {
    for (const photoUrlValue of body.photos_to_delete) {
      const photoUrl = String(photoUrlValue ?? '').trim();

      if (!photoUrl) {
        continue;
      }

      await deleteLandlordPropertyPhotoByUrl(db, propertyId, photoUrl);

      try {
        await deleteUploadThingFileByUrl(env, photoUrl);
      } catch (error) {
        console.warn('Failed to delete UploadThing property photo', error);
      }
    }
  }

  const existingPhotoUrls = new Set(await listLandlordPropertyPhotoUrls(db, propertyId));

  for (const [index, photoUrlValue] of body.photos.entries()) {
    const photoUrl = String(photoUrlValue ?? '').trim();

    if (!photoUrl) {
      continue;
    }

    const isCover = index === 0 ? 1 : 0;

    if (existingPhotoUrls.has(photoUrl)) {
      await updateLandlordPropertyPhotoOrder(db, propertyId, photoUrl, isCover, index);
    } else {
      await createLandlordPropertyPhoto(db, propertyId, photoUrl, isCover, index);
      existingPhotoUrls.add(photoUrl);
    }
  }
}

async function handleUpdateListing(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const body = await readJsonObject(c.req.raw);
  const propertyId = updatePropertyId(c, body);

  if (!propertyId) {
    return errorResponse(400, 'Property ID is required');
  }

  const property = await findLandlordPropertyForUpdate(db, propertyId, user.user_id);

  if (!property) {
    return errorResponse(403, 'Property not found or access denied');
  }

  await updateListingAddressIfNeeded(db, body, property);

  const advancePayment = firstBodyValue(body, ['advancePayment', 'propertyAdvance']);
  const advance =
    advancePayment !== undefined && String(advancePayment) !== ''
      ? String(advancePayment)
      : property.advance ?? 'None';
  const status = normalizeListingStatus(
    stringFromFields(body, ['status', 'propertyStatus'], 'available')
  );

  await updateLandlordProperty(db, {
    propertyId,
    landlordId: user.user_id,
    title: stringFromFields(body, ['name', 'propertyName'], property.title),
    description: stringFromFields(
      body,
      ['description', 'propertyDescription'],
      property.description ?? ''
    ),
    price: numberFromFields(
      body,
      ['monthlyPayment', 'price', 'propertyPrice'],
      Number(property.price)
    ),
    deposit: numberFromFields(
      body,
      ['monthlyDeposit', 'deposit', 'propertyDeposit'],
      Number(property.deposit ?? 0)
    ),
    advance,
    minStay: minStayFromBody(body, property.min_stay ?? ''),
    propertyRules: stringFromFields(
      body,
      ['rules', 'propertyRules'],
      property.property_rules ?? ''
    ),
    propertyType: stringFromFields(body, ['type', 'propertyType'], property.property_type ?? ''),
    genderPreference: stringFromFields(
      body,
      ['gender_preference', 'genderPreference'],
      property.gender_preference ?? 'any'
    ),
    status,
  });
  await updateListingAmenitiesIfNeeded(db, body, propertyId);
  await updateListingRoomsIfNeeded(db, body, property, user.user_id);
  await updateListingPhotosIfNeeded(c.env, db, body, propertyId);

  return jsonResponse({
    message: 'Listing updated successfully',
    data: { id: propertyId },
  });
}

async function handleUploadTemporaryPropertyPhotos(c: Context<{ Bindings: Env }>) {
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  let formData: FormData;

  try {
    formData = await c.req.raw.formData();
  } catch {
    return errorResponse(400, 'No photos provided');
  }

  const files = temporaryPropertyPhotoFiles(formData);

  if (files.length === 0) {
    return errorResponse(400, 'No photos provided');
  }

  const validFiles = files.filter(file => {
    const extension = fileExtension(file.name);

    return allowedPhotoExtensions.has(extension) && file.size <= maxPhotoSizeBytes;
  });

  if (validFiles.length === 0) {
    return errorResponse(400, 'Failed to upload photos');
  }

  const uploadResults = await uploadFilesToUploadThing(c.env, validFiles, {
    landlordId: user.user_id,
    route: 'landlord-temporary-property-photos',
  });
  const uploadedPhotos = uploadResults
    .map(result => result.data?.ufsUrl ?? result.data?.url ?? result.data?.appUrl ?? null)
    .filter((url): url is string => Boolean(url));

  if (uploadedPhotos.length === 0) {
    return errorResponse(
      400,
      uploadResults.find(result => result.error)?.error?.message || 'Failed to upload photos'
    );
  }

  return jsonResponse({
    message: 'Photos uploaded successfully',
    data: {
      urls: uploadedPhotos,
    },
  });
}

async function handleUploadListingPhotos(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const propertyId = parsePositiveInt(c.req.param('id'));

  if (!propertyId) {
    return errorResponse(400, 'Invalid property ID');
  }

  const property = await findLandlordPropertyIdentity(db, propertyId, user.user_id);

  if (!property) {
    return errorResponse(403, 'Property not found or access denied');
  }

  let formData: FormData;

  try {
    formData = await c.req.raw.formData();
  } catch {
    return errorResponse(400, 'No photos provided');
  }

  const files = listingPhotoFiles(formData);

  if (files.length === 0) {
    return errorResponse(400, 'No photos provided');
  }

  const maxOrder = await getMaxPropertyPhotoDisplayOrder(db, propertyId);
  const validFiles = files.filter(file => {
    const extension = fileExtension(file.name);

    return allowedPhotoExtensions.has(extension) && file.size <= maxPhotoSizeBytes;
  });

  if (validFiles.length === 0) {
    return errorResponse(
      400,
      'Failed to upload photos. Check file types and sizes (max 5 MB, jpg/png/webp/gif).'
    );
  }

  const uploadResults = await uploadFilesToUploadThing(c.env, validFiles, {
    landlordId: user.user_id,
    propertyId,
    route: 'landlord-listing-photos',
  });
  const uploadedPhotos = uploadResults
    .map(result => result.data?.ufsUrl ?? result.data?.url ?? result.data?.appUrl ?? null)
    .filter((url): url is string => Boolean(url));

  if (uploadedPhotos.length === 0) {
    return errorResponse(
      400,
      uploadResults.find(result => result.error)?.error?.message ||
        'Failed to upload photos. Check file types and sizes (max 5 MB, jpg/png/webp/gif).'
    );
  }

  for (const [index, photoUrl] of uploadedPhotos.entries()) {
    const displayOrder = maxOrder + 1 + index;
    const isCover = maxOrder === -1 && index === 0 ? 1 : 0;
    await createLandlordPropertyPhoto(db, propertyId, photoUrl, isCover, displayOrder);
  }

  return jsonResponse({
    message: 'Photos uploaded successfully',
    data: {
      urls: uploadedPhotos,
    },
  });
}

async function handleListLandlordRooms(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const propertyId = parsePositiveInt(c.req.query('propertyId'));

  if (!propertyId) {
    return errorResponse(400, 'propertyId is required');
  }

  const property = await findLandlordRoomProperty(db, propertyId, user.user_id);

  if (!property) {
    return errorResponse(404, 'Property not found or access denied');
  }

  const roomId = parsePositiveInt(c.req.query('id'));

  if (roomId) {
    const room = await getLandlordManagedRoom(db, roomId, propertyId, user.user_id);

    if (!room) {
      return errorResponse(404, 'Room not found');
    }

    const photos = await listLandlordRoomPhotos(db, [roomId]);

    return jsonResponse({
      data: formatLandlordManagedRoom(room, photos.get(roomId) ?? []),
    });
  }

  const rooms = await listLandlordManagedRooms(db, propertyId, user.user_id);
  const roomIds = rooms.map(room => Number(room.id));
  const photos = await listLandlordRoomPhotos(db, roomIds);
  const occupiedRooms = rooms.filter(room => room.status === 'occupied').length;

  return jsonResponse({
    data: {
      property: {
        id: Number(property.id),
        name: property.title,
        status: property.status,
        total_rooms: rooms.length,
        occupied_rooms: occupiedRooms,
      },
      rooms: rooms.map(room => formatLandlordManagedRoom(room, photos.get(Number(room.id)) ?? [])),
    },
  });
}

async function handleCreateLandlordRoom(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const body = await readJsonObject(c.req.raw);
  const propertyId = positiveIntValue(body.property_id);

  if (!propertyId) {
    return errorResponse(400, 'property_id is required');
  }

  const property = await findLandlordRoomProperty(db, propertyId, user.user_id);

  if (!property) {
    return errorResponse(404, 'Property not found or access denied');
  }

  if (isPhpEmpty(body.room_number)) {
    return errorResponse(400, 'room_number is required');
  }

  if (body.price === undefined || body.price === null || body.price === '') {
    return errorResponse(400, 'price is required');
  }

  const roomNumber = String(body.room_number).trim();
  const duplicate = await findDuplicateLandlordRoomNumber(db, propertyId, roomNumber);

  if (duplicate) {
    return errorResponse(409, 'A room with this number already exists in this property');
  }

  const roomId = await createLandlordManagedRoom(db, {
    propertyId,
    landlordId: user.user_id,
    roomNumber,
    roomType: isPhpEmpty(body.room_type) ? null : String(body.room_type),
    price: floatValue(body.price),
    deposit: body.deposit === undefined ? 0 : floatValue(body.deposit),
    status: normalizeRoomCreateStatus(body.status),
    capacity: body.capacity === undefined ? 1 : intValue(body.capacity),
    description: isPhpEmpty(body.description) ? '' : String(body.description),
    size: isPhpEmpty(body.size) ? 0 : floatValue(body.size),
  });
  const room = await getLandlordManagedRoomById(db, roomId);

  if (!room) {
    throw new Error('Created room was not found');
  }

  const photos = await listLandlordRoomPhotos(db, [roomId]);

  return jsonResponse(
    {
      success: true,
      message: 'Room created successfully',
      data: formatLandlordManagedRoom(room, photos.get(roomId) ?? []),
    },
    201
  );
}

async function handleUpdateLandlordRoom(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const body = await readJsonObject(c.req.raw);
  const roomId = parsePositiveInt(c.req.query('id')) ?? positiveIntValue(body.id);

  if (!roomId) {
    return errorResponse(400, 'Room id is required');
  }

  const existing = await findLandlordManagedRoomIdentity(db, roomId, user.user_id);

  if (!existing) {
    return errorResponse(404, 'Room not found or access denied');
  }

  if (
    hasOwnBodyField(body, 'room_number') &&
    String(body.room_number) !== (existing.room_number ?? '')
  ) {
    const duplicate = await findDuplicateLandlordRoomNumber(
      db,
      Number(existing.property_id),
      String(body.room_number),
      roomId
    );

    if (duplicate) {
      return errorResponse(409, 'A room with this number already exists in this property');
    }
  }

  await updateLandlordManagedRoom(db, roomId, {
    ...(hasOwnBodyField(body, 'room_number') ? { room_number: String(body.room_number) } : {}),
    ...(hasOwnBodyField(body, 'room_type') ? { room_type: String(body.room_type) } : {}),
    ...(hasOwnBodyField(body, 'price') ? { price: floatValue(body.price) } : {}),
    ...(hasOwnBodyField(body, 'deposit') ? { deposit: floatValue(body.deposit) } : {}),
    ...(hasOwnBodyField(body, 'status') ? { status: String(body.status) } : {}),
    ...(hasOwnBodyField(body, 'capacity') ? { capacity: intValue(body.capacity) } : {}),
    ...(hasOwnBodyField(body, 'description') ? { description: String(body.description) } : {}),
    ...(hasOwnBodyField(body, 'size') ? { size: floatValue(body.size) } : {}),
  });

  const room = await getLandlordManagedRoomById(db, roomId);

  if (!room) {
    throw new Error('Updated room was not found');
  }

  const photos = await listLandlordRoomPhotos(db, [roomId]);

  return jsonResponse({
    success: true,
    message: 'Room updated successfully',
    data: formatLandlordManagedRoom(room, photos.get(roomId) ?? []),
  });
}

async function handleDeleteLandlordRoom(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const roomId = parsePositiveInt(c.req.query('id'));

  if (!roomId) {
    return errorResponse(400, 'Room id is required');
  }

  const room = await findLandlordManagedRoomIdentity(db, roomId, user.user_id);

  if (!room) {
    return errorResponse(404, 'Room not found or access denied');
  }

  await softDeleteLandlordManagedRoom(db, roomId);

  return jsonResponse({
    success: true,
    message: 'Room deleted successfully',
  });
}

async function handleUploadRoomPhotos(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const roomId = parsePositiveInt(c.req.param('id'));

  if (!roomId) {
    return errorResponse(400, 'Invalid room ID in URL');
  }

  const room = await findLandlordManagedRoomIdentity(db, roomId, user.user_id);

  if (!room) {
    return errorResponse(404, 'Room not found or access denied');
  }

  let formData: FormData;

  try {
    formData = await c.req.raw.formData();
  } catch {
    return errorResponse(400, 'No photos provided (field name: roomPhotos[])');
  }

  const files = roomPhotoFiles(formData);

  if (files.length === 0) {
    return errorResponse(400, 'No photos provided (field name: roomPhotos[])');
  }

  const errors: string[] = [];
  const validFiles = files.filter(file => {
    const extension = fileExtension(file.name);

    if (!allowedRoomPhotoExtensions.has(extension)) {
      errors.push(`File ${file.name}: unsupported type (allowed: jpg, png, webp)`);
      return false;
    }

    if (file.size > maxPhotoSizeBytes) {
      errors.push(`File ${file.name}: exceeds 5 MB limit`);
      return false;
    }

    return true;
  });

  if (validFiles.length === 0) {
    return jsonResponse(
      {
        error: 'No photos were saved. Check file types (jpg/png/webp) and sizes (max 5 MB).',
        errors,
      },
      400
    );
  }

  const stats = await getLandlordRoomPhotoStats(db, roomId);
  const uploadResults = await uploadFilesToUploadThing(c.env, validFiles, {
    landlordId: user.user_id,
    propertyId: Number(room.property_id),
    roomId,
    route: 'landlord-room-photos',
  });
  const uploaded: Array<{
    id: number;
    photo_url: string;
    is_cover: boolean;
    display_order: number;
  }> = [];

  for (const [index, result] of uploadResults.entries()) {
    const photoUrl = result.data?.ufsUrl ?? result.data?.url ?? result.data?.appUrl ?? null;

    if (!photoUrl) {
      errors.push(
        `File ${validFiles[index]?.name ?? 'photo'}: ${result.error?.message ?? 'failed to upload'}`
      );
      continue;
    }

    const displayOrder = stats.maxOrder + 1 + uploaded.length;
    const isCover = stats.photoCount === 0 && uploaded.length === 0 ? 1 : 0;
    const photoId = await createLandlordRoomPhoto(db, roomId, photoUrl, isCover, displayOrder);
    uploaded.push({
      id: photoId,
      photo_url: photoUrl,
      is_cover: Boolean(isCover),
      display_order: displayOrder,
    });
  }

  if (uploaded.length === 0) {
    return jsonResponse(
      {
        error: 'No photos were saved. Check file types (jpg/png/webp) and sizes (max 5 MB).',
        errors,
      },
      400
    );
  }

  return jsonResponse(
    {
      success: true,
      message: `${uploaded.length} photo(s) uploaded successfully`,
      data: {
        photos: uploaded,
        errors,
      },
    },
    201
  );
}

async function handleSetRoomPhotoCover(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const roomId = parsePositiveInt(c.req.param('id'));

  if (!roomId) {
    return errorResponse(400, 'Invalid room ID in URL');
  }

  const room = await findLandlordManagedRoomIdentity(db, roomId, user.user_id);

  if (!room) {
    return errorResponse(404, 'Room not found or access denied');
  }

  const body = await readJsonObject(c.req.raw);
  const photoId = positiveIntValue(body.photo_id);

  if (!photoId) {
    return errorResponse(400, 'photo_id is required');
  }

  const photo = await findLandlordRoomPhoto(db, roomId, photoId);

  if (!photo) {
    return errorResponse(404, 'Photo not found');
  }

  await clearLandlordRoomCover(db, roomId);
  await setLandlordRoomPhotoCover(db, photoId);

  return jsonResponse({
    success: true,
    message: 'Cover photo updated',
  });
}

async function handleDeleteRoomPhoto(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const roomId = parsePositiveInt(c.req.param('id'));

  if (!roomId) {
    return errorResponse(400, 'Invalid room ID in URL');
  }

  const room = await findLandlordManagedRoomIdentity(db, roomId, user.user_id);

  if (!room) {
    return errorResponse(404, 'Room not found or access denied');
  }

  const body = await readJsonObject(c.req.raw);
  const photoId = positiveIntValue(body.photo_id);

  if (!photoId) {
    return errorResponse(400, 'photo_id is required');
  }

  const photo = await findLandlordRoomPhoto(db, roomId, photoId);

  if (!photo) {
    return errorResponse(404, 'Photo not found');
  }

  await deleteLandlordRoomPhoto(db, photoId);

  if (photo.is_cover) {
    const nextPhoto = await findNextLandlordRoomPhoto(db, roomId);

    if (nextPhoto) {
      await setLandlordRoomPhotoCover(db, nextPhoto.id);
    }
  }

  try {
    await deleteUploadThingFileByUrl(c.env, photo.photo_url);
  } catch (error) {
    console.warn('Failed to delete UploadThing room photo', error);
  }

  return jsonResponse({
    success: true,
    message: 'Photo deleted',
  });
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

async function handleDeleteLandlordProperty(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const propertyIdParam = c.req.query('id');

  if (isPhpEmpty(propertyIdParam)) {
    return errorResponse(400, 'Property ID is required');
  }

  const propertyId = parsePositiveInt(propertyIdParam);

  if (!propertyId) {
    return errorResponse(404, 'Property not found or access denied');
  }

  const property = await findLandlordPropertyIdentity(db, propertyId, user.user_id);

  if (!property) {
    return errorResponse(404, 'Property not found or access denied');
  }

  await softDeleteLandlordProperty(db, propertyId, user.user_id);
  await softDeleteLandlordPropertyRooms(db, propertyId);

  return jsonResponse({
    success: true,
    message: 'Property deleted successfully',
    data: {
      property_id: propertyId,
      property_name: property.title,
    },
  });
}

async function handleLandlordDashboardStats(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const stats = await getLandlordDashboardStats(db, user.user_id);

  return jsonResponse({ data: stats });
}

async function handleListLandlordBoarders(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const propertyId = parsePositiveInt(c.req.query('propertyId'));

  if (!propertyId) {
    return errorResponse(400, 'propertyId is required');
  }

  const property = await findLandlordRoomProperty(db, propertyId, user.user_id);

  if (!property) {
    return errorResponse(404, 'Property not found');
  }

  const boarders = await listLandlordBoarders(db, propertyId, user.user_id);

  return jsonResponse({
    success: true,
    data: {
      boarders,
      total_count: boarders.length,
    },
  });
}

async function handleCreateLandlordBoarder(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const body = await readJsonObject(c.req.raw);
  const missing = missingRequiredField(body, [
    'property_id',
    'first_name',
    'last_name',
    'email',
    'room_id',
  ]);

  if (missing) {
    return errorResponse(400, `Missing required field: ${missing}`);
  }

  const propertyId = positiveIntValue(body.property_id);
  const roomId = positiveIntValue(body.room_id);

  if (!propertyId || !roomId) {
    return errorResponse(
      400,
      !propertyId ? 'Missing required field: property_id' : 'Missing required field: room_id'
    );
  }

  const property = await findLandlordRoomProperty(db, propertyId, user.user_id);

  if (!property) {
    return errorResponse(404, 'Property not found');
  }

  const room = await getLandlordManagedRoom(db, roomId, propertyId, user.user_id);

  if (!room) {
    return errorResponse(404, 'Room not found or access denied');
  }

  const email = stringValue(body, 'email');
  const existingUser = await findBoarderUserByEmail(db, email);
  const boarderUserId =
    existingUser?.id ??
    (await createManualBoarderUser(db, {
      firstName: stringValue(body, 'first_name'),
      lastName: stringValue(body, 'last_name'),
      email,
    }));

  await createManualBoarderApplication(db, {
    boarderId: boarderUserId,
    landlordId: user.user_id,
    roomId,
    moveInDate: dateStringFromBody(body, 'move_in_date'),
  });

  return jsonResponse(
    {
      success: true,
      data: {
        message: 'Boarder added successfully',
        boarder_id: boarderUserId,
      },
    },
    201
  );
}

async function handleUpdateLandlordBoarder(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const body = await readJsonObject(c.req.raw);
  const missing = missingRequiredField(body, [
    'id',
    'property_id',
    'first_name',
    'last_name',
    'email',
    'room_id',
  ]);

  if (missing) {
    return errorResponse(400, `Missing required field: ${missing}`);
  }

  const boarderUserId = positiveIntValue(body.id);
  const propertyId = positiveIntValue(body.property_id);
  const roomId = positiveIntValue(body.room_id);

  if (!boarderUserId || !propertyId || !roomId) {
    const field = !boarderUserId ? 'id' : !propertyId ? 'property_id' : 'room_id';
    return errorResponse(400, `Missing required field: ${field}`);
  }

  const property = await findLandlordRoomProperty(db, propertyId, user.user_id);

  if (!property) {
    return errorResponse(404, 'Property not found');
  }

  const application = await findLandlordBoarderApplication(
    db,
    boarderUserId,
    user.user_id,
    propertyId
  );

  if (!application) {
    return errorResponse(404, 'Boarder not found');
  }

  const room = await getLandlordManagedRoom(db, roomId, propertyId, user.user_id);

  if (!room) {
    return errorResponse(404, 'Room not found or access denied');
  }

  await updateBoarderUser(db, boarderUserId, {
    firstName: stringValue(body, 'first_name'),
    lastName: stringValue(body, 'last_name'),
    email: stringValue(body, 'email'),
  });
  await updateBoarderApplication(
    db,
    Number(application.id),
    roomId,
    dateStringFromBody(body, 'move_in_date')
  );
  await updateBoarderRoomPricing(
    db,
    roomId,
    propertyId,
    hasBodyField(body, 'rent') ? floatValue(body.rent) : 0,
    hasBodyField(body, 'deposit') ? floatValue(body.deposit) : 0
  );

  return jsonResponse({
    success: true,
    data: {
      message: 'Boarder updated successfully',
      boarder_id: boarderUserId,
    },
  });
}

async function handleDeleteLandlordBoarder(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const boarderUserId = parsePositiveInt(c.req.query('id'));

  if (!boarderUserId) {
    return errorResponse(400, 'Boarder id is required');
  }

  const changes = await softDeleteLandlordBoarderApplications(db, boarderUserId, user.user_id);

  if (changes === 0) {
    return errorResponse(404, 'Boarder not found');
  }

  return jsonResponse({
    success: true,
    data: {
      message: 'Boarder removed successfully',
    },
  });
}

landlordRoutes.post('/api/landlord/listings', handleCreateListing);
landlordRoutes.put('/api/landlord/listings/:id', handleUpdateListing);
landlordRoutes.post('/api/landlord/upload-photos', handleUploadTemporaryPropertyPhotos);
landlordRoutes.post('/api/landlord/listings/:id/photos', handleUploadListingPhotos);
landlordRoutes.post('/api/landlord/properties', handleCreateLandlordPropertyAlias);
landlordRoutes.get('/api/landlord/dashboard-stats', handleLandlordDashboardStats);
landlordRoutes.get('/api/landlord/dashboard/stats', handleLandlordDashboardStats);
landlordRoutes.get('/api/landlord/boarders', handleListLandlordBoarders);
landlordRoutes.post('/api/landlord/boarders', handleCreateLandlordBoarder);
landlordRoutes.put('/api/landlord/boarders', handleUpdateLandlordBoarder);
landlordRoutes.delete('/api/landlord/boarders', handleDeleteLandlordBoarder);
landlordRoutes.get('/api/landlord/rooms', handleListLandlordRooms);
landlordRoutes.post('/api/landlord/rooms', handleCreateLandlordRoom);
landlordRoutes.post('/api/landlord/rooms/:id/photos', handleUploadRoomPhotos);
landlordRoutes.patch('/api/landlord/rooms/:id/photos', handleSetRoomPhotoCover);
landlordRoutes.delete('/api/landlord/rooms/:id/photos', handleDeleteRoomPhoto);
landlordRoutes.put('/api/landlord/rooms', handleUpdateLandlordRoom);
landlordRoutes.delete('/api/landlord/rooms', handleDeleteLandlordRoom);
landlordRoutes.get('/api/landlord/properties', handleLandlordProperties);
landlordRoutes.delete('/api/landlord/properties', handleDeleteLandlordProperty);

export default landlordRoutes;
