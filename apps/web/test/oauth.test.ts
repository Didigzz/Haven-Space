import { test, expect } from 'bun:test';
import { handleOAuthHash, redirectPathForUser } from '../src/lib/oauth';
import type { AuthUser } from '../src/lib/types';

const user = (role: AuthUser['role']): AuthUser => ({
  id: 1,
  user_id: 1,
  first_name: 'Test',
  last_name: 'User',
  email: 'test@example.com',
  role,
  is_verified: true,
  email_verified: true,
  account_status: 'active',
  avatar_url: null,
  phone_number: null,
  verification_status: null,
});

test('redirectPathForUser maps admin to /admin', () => {
  expect(redirectPathForUser(user('admin'))).toBe('/admin');
});

test('redirectPathForUser maps landlord to /landlord', () => {
  expect(redirectPathForUser(user('landlord'))).toBe('/landlord');
});

test('redirectPathForUser maps boarder to /boarder', () => {
  expect(redirectPathForUser(user('boarder'))).toBe('/boarder');
});

test('handleOAuthHash returns null when no auth hash is present', () => {
  window.location.hash = '';
  expect(handleOAuthHash()).toBeNull();
});

test('handleOAuthHash parses and persists a valid auth hash', () => {
  const payload = {
    access_token: 'token-123',
    refresh_token: 'refresh-456',
    user: user('boarder'),
  };
  window.location.hash = `#auth=${encodeURIComponent(JSON.stringify(payload))}`;

  const result = handleOAuthHash();
  expect(result?.id).toBe(1);
  expect(localStorage.getItem('token')).toBe('token-123');
  expect(localStorage.getItem('refresh_token')).toBe('refresh-456');
});

test('handleOAuthHash returns null for a malformed hash', () => {
  window.location.hash = '#auth=not-json';
  expect(handleOAuthHash()).toBeNull();
});
