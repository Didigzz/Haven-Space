import { HttpError } from './http';

export type JsonRecord = Record<string, unknown>;

export function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function readJsonObject(request: Request): Promise<JsonRecord> {
  const contentType = request.headers.get('Content-Type')?.toLowerCase() ?? '';

  if (!contentType.includes('application/json')) {
    throw new HttpError(415, 'Expected application/json request body', {
      code: 'unsupported_media_type',
    });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, 'Invalid JSON request body', { code: 'invalid_json' });
  }

  if (!isJsonRecord(body)) {
    throw new HttpError(400, 'Expected JSON object request body', {
      code: 'invalid_json_body',
    });
  }

  return body;
}

export function requiredString(
  body: JsonRecord,
  field: string,
  options: { trim?: boolean } = {}
): string {
  const value = body[field];

  if (typeof value !== 'string') {
    throw new HttpError(422, `Field "${field}" is required`, {
      code: 'validation_error',
      details: { field },
    });
  }

  const normalizedValue = options.trim === false ? value : value.trim();

  if (!normalizedValue) {
    throw new HttpError(422, `Field "${field}" is required`, {
      code: 'validation_error',
      details: { field },
    });
  }

  return normalizedValue;
}

export function optionalString(
  body: JsonRecord,
  field: string,
  options: { trim?: boolean } = {}
): string | undefined {
  const value = body[field];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new HttpError(422, `Field "${field}" must be a string`, {
      code: 'validation_error',
      details: { field },
    });
  }

  return options.trim === false ? value : value.trim();
}

export function requiredEmail(body: JsonRecord, field = 'email'): string {
  const email = requiredString(body, field).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(422, `Field "${field}" must be a valid email`, {
      code: 'validation_error',
      details: { field },
    });
  }

  return email;
}

export function requiredStringFields<const Fields extends readonly string[]>(
  body: JsonRecord,
  fields: Fields
): { [Key in Fields[number]]: string } {
  return fields.reduce(
    (values, field) => ({
      ...values,
      [field]: requiredString(body, field),
    }),
    {} as { [Key in Fields[number]]: string }
  );
}
