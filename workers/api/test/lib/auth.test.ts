import { describe, expect, it } from 'bun:test';

import { authorizationHeaders, bearerToken, requireBearerToken } from '../../src/lib/auth';
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
});
