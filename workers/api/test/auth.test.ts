import { describe, expect, it } from 'bun:test';

import app from '../src/index';
import type { Env } from '../src/env';
import type { AuthUserRow } from '../src/repositories/users';

function createDb(row: AuthUserRow | null): D1Database {
  return {
    prepare: () =>
      ({
        bind: () => ({
          first: async () => row,
        }),
      } as unknown as D1PreparedStatement),
  } as unknown as D1Database;
}

function createEnv(row: AuthUserRow | null): Env {
  return {
    APP_ENV: 'test',
    APP_ORIGIN: 'http://localhost',
    DB: createDb(row),
  };
}

async function postCheckEmail(email: unknown, env: Env): Promise<Response> {
  return await app.request(
    'http://localhost/auth/check-email',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    },
    env
  );
}

describe('auth routes', () => {
  it('returns false when the email is not registered', async () => {
    const response = await postCheckEmail('new@example.com', createEnv(null));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      exists: false,
      is_google_account: false,
    });
  });

  it('returns a non-Google account when a password hash exists', async () => {
    const response = await postCheckEmail(
      'boarder@example.com',
      createEnv({ google_id: null, password_hash: '$2y$10$hash' })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      exists: true,
      is_google_account: false,
    });
  });

  it('returns a Google-only account when google_id exists and password hash is empty', async () => {
    const response = await postCheckEmail(
      'google@example.com',
      createEnv({ google_id: 'google-user-id', password_hash: '' })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      exists: true,
      is_google_account: true,
    });
  });

  it('matches PHP validation errors for missing and invalid email values', async () => {
    const missingResponse = await postCheckEmail('   ', createEnv(null));
    const invalidResponse = await postCheckEmail('not-an-email', createEnv(null));

    expect(missingResponse.status).toBe(400);
    expect(await missingResponse.json()).toEqual({ error: 'Email is required' });

    expect(invalidResponse.status).toBe(400);
    expect(await invalidResponse.json()).toEqual({ error: 'Invalid email format' });
  });
});
