import { test, expect } from 'bun:test';
import { isTokenExpired, tokenExpiry } from '../src/lib/auth-store';

function makeToken(exp: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ exp }));
  return `${header}.${payload}.signature`;
}

test('tokenExpiry returns the exp claim as a number', () => {
  expect(tokenExpiry(makeToken(2000000000))).toBe(2000000000);
});

test('tokenExpiry returns null for a malformed token', () => {
  expect(tokenExpiry('not-a-jwt')).toBeNull();
});

test('isTokenExpired is true when exp is in the past', () => {
  expect(isTokenExpired(makeToken(1000000000))).toBe(true);
});

test('isTokenExpired is false when exp is in the future', () => {
  expect(isTokenExpired(makeToken(4000000000))).toBe(false);
});
