import { describe, expect, it } from 'bun:test';

import {
  authorizationHeaders,
  bearerToken,
  requireBearerToken,
  signJwt,
  verifyJwt,
} from '../../src/lib/auth';
import { HttpError } from '../../src/lib/http';

describe('auth helpers', () => {
  it('extracts bearer tokens from headers', () => {
    expect(bearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(bearerToken('bearer token-value')).toBe('token-value');
    expect(bearerToken(new Headers({ Authorization: 'Bearer from-headers' }))).toBe('from-headers');
  });

  it('returns null for missing or unsupported authorization schemes', () => {
    expect(bearerToken(null)).toBeNull();
    expect(bearerToken('')).toBeNull();
    expect(bearerToken('Basic abc')).toBeNull();
    expect(bearerToken('Bearer')).toBeNull();
  });

  it('throws a 401 error when a bearer token is required but absent', () => {
    expect(() => requireBearerToken('Basic abc')).toThrow(HttpError);
    expect(() => requireBearerToken('Basic abc')).toThrow('Missing bearer token');
  });

  it('creates outbound authorization headers', () => {
    expect(authorizationHeaders('jwt-token').get('Authorization')).toBe('Bearer jwt-token');
  });

  it('rejects malformed tokens without throwing', async () => {
    expect(await verifyJwt('only-one-part', 'secret')).toBeNull();
    expect(await verifyJwt('a.b.c', 'secret')).toBeNull();
    expect(await verifyJwt('header.payload', 'secret')).toBeNull();
  });

  it('rejects a 3-part token whose signature is not valid base64url instead of throwing', async () => {
    const token = 'header.' + btoa(JSON.stringify({ sub: '1' })) + '.s';
    await expect(verifyJwt(token, 'secret')).resolves.toBeNull();
  });

  it('verifies a token signed with the same secret', async () => {
    const token = await signJwt({ user_id: 7 }, 'secret', 300);
    const payload = await verifyJwt(token, 'secret');

    expect(payload?.user_id).toBe(7);
    expect(await verifyJwt(token, 'different-secret')).toBeNull();
  });
});
