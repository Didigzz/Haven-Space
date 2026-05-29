import { describe, expect, it } from 'bun:test';

import { HttpError } from '../../src/lib/http';
import {
  optionalString,
  readJsonObject,
  requiredEmail,
  requiredString,
  requiredStringFields,
} from '../../src/lib/validation';

describe('validation helpers', () => {
  it('reads JSON object request bodies', async () => {
    const request = new Request('http://localhost/auth/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'boarder@example.com' }),
    });

    await expect(readJsonObject(request)).resolves.toEqual({ email: 'boarder@example.com' });
  });

  it('rejects non-JSON bodies', async () => {
    const request = new Request('http://localhost/auth/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'email=boarder@example.com',
    });

    await expect(readJsonObject(request)).rejects.toThrow(HttpError);
    await expect(readJsonObject(request.clone())).rejects.toThrow(
      'Expected application/json request body'
    );
  });

  it('normalizes required strings and email fields', () => {
    const body = { email: '  USER@Example.COM ', password: ' secret ' };

    expect(requiredString(body, 'password')).toBe('secret');
    expect(requiredEmail(body)).toBe('user@example.com');
  });

  it('collects required string fields into a typed object', () => {
    expect(
      requiredStringFields({ email: 'a@b.test', password: 'secret' }, [
        'email',
        'password',
      ] as const)
    ).toEqual({
      email: 'a@b.test',
      password: 'secret',
    });
  });

  it('allows optional strings to be absent', () => {
    expect(optionalString({}, 'name')).toBeUndefined();
    expect(optionalString({ name: ' Haven ' }, 'name')).toBe('Haven');
  });

  it('throws validation errors for invalid fields', () => {
    expect(() => requiredString({}, 'password')).toThrow('Field "password" is required');
    expect(() => requiredEmail({ email: 'not-an-email' })).toThrow(
      'Field "email" must be a valid email'
    );
    expect(() => optionalString({ name: 10 }, 'name')).toThrow('Field "name" must be a string');
  });
});
