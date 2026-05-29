import { describe, expect, it } from 'bun:test';

import { HttpError, errorResponse, jsonResponse, responseFromError } from '../../src/lib/http';

describe('http helpers', () => {
  it('returns JSON responses with a stable content type', async () => {
    const response = jsonResponse({ status: 'success' }, 201);

    expect(response.status).toBe(201);
    expect(response.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
    expect(await response.json()).toEqual({ status: 'success' });
  });

  it('returns structured error responses', async () => {
    const response = errorResponse(422, 'Invalid input', {
      code: 'validation_error',
      details: { field: 'email' },
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: 'Invalid input',
      code: 'validation_error',
      details: { field: 'email' },
    });
  });

  it('converts HttpError instances to JSON responses', async () => {
    const response = responseFromError(
      new HttpError(401, 'Missing bearer token', { code: 'unauthorized' })
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: 'Missing bearer token',
      code: 'unauthorized',
    });
  });
});
