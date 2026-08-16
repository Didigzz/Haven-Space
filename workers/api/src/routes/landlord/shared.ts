import type { Context } from 'hono';

import type { Env } from '../../env';
import { authenticateUser, type AuthenticatedUser } from '../../lib/auth';
import { requireD1 } from '../../lib/d1';
import { errorResponse, jsonResponse } from '../../lib/http';
import type { JsonRecord } from '../../lib/validation';
export const maxPhotoSizeBytes = 5 * 1024 * 1024;

export function parsePositiveInt(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function requireLandlord(
  c: Context<{ Bindings: Env }>
): Promise<AuthenticatedUser | Response> {
  const user = await authenticateUser(requireD1(c.env), c.req.raw, c.env.JWT_SECRET);

  if (user.role !== 'landlord') {
    return errorResponse(403, 'Forbidden: You do not have permission to access this resource');
  }

  return user;
}

export function requireVerifiedLandlordWrite(user: AuthenticatedUser): Response | null {
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

export function isPhpEmpty(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    value === 0 ||
    value === '0' ||
    value === false
  );
}

export function stringValue(body: JsonRecord, field: string, fallback = ''): string {
  const value = body[field];

  if (value === undefined || value === null) {
    return fallback;
  }

  return String(value).trim();
}

export function numberValue(body: JsonRecord, field: string, fallback = 0): number {
  const parsed = Number.parseFloat(String(body[field] ?? ''));

  return Number.isFinite(parsed) ? parsed : fallback;
}

export function intValue(value: unknown, fallback = 0): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);

  return Number.isFinite(parsed) ? parsed : fallback;
}

export function positiveIntValue(value: unknown): number | null {
  const parsed = Number.parseInt(String(value ?? ''), 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function hasBodyField(body: JsonRecord, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, field) && body[field] !== null;
}

export function hasOwnBodyField(body: JsonRecord, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, field);
}

export function hasAnyBodyField(body: JsonRecord, fields: string[]): boolean {
  return fields.some(field => hasBodyField(body, field));
}

export function firstBodyValue(body: JsonRecord, fields: string[]): unknown | undefined {
  for (const field of fields) {
    if (hasBodyField(body, field)) {
      return body[field];
    }
  }

  return undefined;
}

export function stringFromFields(body: JsonRecord, fields: string[], fallback = ''): string {
  const value = firstBodyValue(body, fields);

  if (value === undefined) {
    return fallback;
  }

  return String(value).trim();
}

export function numberFromFields(body: JsonRecord, fields: string[], fallback = 0): number {
  const value = firstBodyValue(body, fields);

  if (value === undefined) {
    return fallback;
  }

  const parsed = Number.parseFloat(String(value));

  return Number.isFinite(parsed) ? parsed : fallback;
}

export function floatValue(value: unknown, fallback = 0): number {
  const parsed = Number.parseFloat(String(value ?? ''));

  return Number.isFinite(parsed) ? parsed : fallback;
}

export function locationNumberFromFields(
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

export function updatePropertyId(c: Context<{ Bindings: Env }>, body: JsonRecord): number | null {
  return positiveIntValue(body.id) ?? parsePositiveInt(c.req.param('id'));
}

export function missingRequiredField(body: JsonRecord, fields: string[]): string | null {
  return fields.find(field => isPhpEmpty(body[field])) ?? null;
}

export function dateStringFromBody(body: JsonRecord, field: string): string {
  const value = stringValue(body, field);

  if (value) {
    return value;
  }

  return new Date().toISOString().slice(0, 10);
}

export function fileExtension(fileName: string): string {
  const match = /\.([^.]+)$/.exec(fileName);

  return match?.[1]?.toLowerCase() ?? '';
}

export function listingPhotoFiles(formData: FormData): File[] {
  const values: unknown[] = [
    ...(formData.getAll('propertyPhotos[]') as unknown[]),
    ...(formData.getAll('propertyPhotos') as unknown[]),
  ];

  return values.filter((value): value is File => value instanceof File && value.size > 0);
}

export function temporaryPropertyPhotoFiles(formData: FormData): File[] {
  const values: unknown[] = [
    ...(formData.getAll('photos[]') as unknown[]),
    ...(formData.getAll('photos') as unknown[]),
  ];

  return values.filter((value): value is File => value instanceof File && value.size > 0);
}

export function roomPhotoFiles(formData: FormData): File[] {
  const values: unknown[] = [
    ...(formData.getAll('roomPhotos[]') as unknown[]),
    ...(formData.getAll('roomPhotos') as unknown[]),
  ];

  return values.filter((value): value is File => value instanceof File && value.size > 0);
}
