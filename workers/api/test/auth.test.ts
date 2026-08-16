import { afterEach, describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import app from '../src/index';
import type { Env } from '../src/env';

function runMigrations(db: Database): void {
  const migrationDir = join(import.meta.dir, '..', 'migrations');
  const migrationNames = readdirSync(migrationDir)
    .filter(name => name.endsWith('.sql'))
    .sort();

  for (const name of migrationNames) {
    db.exec(readFileSync(join(migrationDir, name), 'utf8'));
  }
}

function createSqliteD1(db: Database): D1Database {
  return {
    prepare: (sql: string) =>
      ({
        bind: (...values: unknown[]) => {
          const statement = db.prepare(sql);

          return {
            first: async <T>() => (statement.get(...values) ?? null) as T | null,
            all: async <T>() => ({ results: statement.all(...values) as T[] }),
            run: async () => {
              const result = statement.run(...values);

              return {
                success: true,
                meta: {
                  last_row_id: Number(result.lastInsertRowid ?? 0),
                  changes: Number(result.changes ?? 0),
                },
                results: [],
              };
            },
          };
        },
      } as unknown as D1PreparedStatement),
  } as unknown as D1Database;
}

function createEnv(db: Database): Env {
  return {
    APP_ENV: 'test',
    APP_ORIGIN: 'http://localhost:4173,http://localhost:8788',
    JWT_SECRET: 'test-secret',
    GOOGLE_CLIENT_ID: 'test-google-client',
    GOOGLE_CLIENT_SECRET: 'test-google-secret',
    DB: createSqliteD1(db),
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

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function stateFromRedirect(response: Response): string {
  const location = response.headers.get('Location');

  expect(location).toBeString();

  const state = new URL(location as string).searchParams.get('state');

  expect(state).toBeString();

  return state as string;
}

function cookieHeader(response: Response): string {
  const cookie = response.headers.get('Set-Cookie');

  expect(cookie).toBeString();

  return (cookie as string).split(';')[0];
}

async function authorizeGoogleSignup(env: Env): Promise<{ cookie: string; state: string }> {
  const authorize = await app.request(
    'http://localhost/auth/google/authorize?action=signup&role=boarder',
    { headers: { Referer: 'http://localhost:4173/auth/signup.html' } },
    env
  );

  expect(authorize.status).toBe(302);
  expect(authorize.headers.get('Location')).toStartWith(
    'https://accounts.google.com/o/oauth2/v2/auth?'
  );

  return {
    cookie: cookieHeader(authorize),
    state: stateFromRedirect(authorize),
  };
}

const originalFetch = globalThis.fetch;

function mockGoogleFetch(profile: Record<string, unknown>): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    if (url === 'https://oauth2.googleapis.com/token') {
      const body = init?.body?.toString() || '';

      expect(body).toContain('grant_type=authorization_code');
      expect(body).toContain('client_id=test-google-client');
      expect(body).toContain('client_secret=test-google-secret');

      return new Response(
        JSON.stringify({
          access_token: 'google-access-token',
          expires_in: 3600,
          scope: 'openid profile email',
          token_type: 'Bearer',
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (url === 'https://openidconnect.googleapis.com/v1/userinfo') {
      expect(init?.headers).toEqual({
        Authorization: 'Bearer google-access-token',
      });

      return new Response(JSON.stringify(profile), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return originalFetch(input, init);
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('auth routes', () => {
  it('returns false when the email is not registered', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const response = await postCheckEmail('new@example.com', createEnv(sqlite));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      exists: false,
      is_google_account: false,
    });
  });

  it('returns a non-Google account when a password hash exists', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    sqlite
      .prepare(
        `
          INSERT INTO users (first_name, last_name, email, password_hash, role)
          VALUES ('Bea', 'Boarder', 'boarder@example.com', '$2y$10$hash', 'boarder')
        `
      )
      .run();

    const response = await postCheckEmail('boarder@example.com', createEnv(sqlite));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      exists: true,
      is_google_account: false,
    });
  });

  it('returns a Google-only account when google_id exists and password hash is empty', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    sqlite
      .prepare(
        `
          INSERT INTO users (first_name, last_name, email, password_hash, role, google_id)
          VALUES ('Gia', 'Google', 'google@example.com', '', 'boarder', 'google-user-id')
        `
      )
      .run();

    const response = await postCheckEmail('google@example.com', createEnv(sqlite));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      exists: true,
      is_google_account: true,
    });
  });

  it('matches PHP validation errors for missing and invalid email values', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
    const missingResponse = await postCheckEmail('   ', env);
    const invalidResponse = await postCheckEmail('not-an-email', env);

    expect(missingResponse.status).toBe(400);
    expect(await missingResponse.json()).toEqual({ error: 'Email is required' });

    expect(invalidResponse.status).toBe(400);
    expect(await invalidResponse.json()).toEqual({ error: 'Invalid email format' });
  });

  it('starts Google OAuth with a signed state cookie', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const response = await app.request(
      'http://localhost/api/auth/google/authorize?action=signup&role=boarder',
      { headers: { Referer: 'http://localhost:4173/auth/signup.html' } },
      createEnv(sqlite)
    );
    const location = response.headers.get('Location');
    const redirect = new URL(location as string);

    expect(response.status).toBe(302);
    expect(redirect.origin + redirect.pathname).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth'
    );
    expect(redirect.searchParams.get('client_id')).toBe('test-google-client');
    expect(redirect.searchParams.get('scope')).toBe('openid profile email');
    expect(redirect.searchParams.get('response_type')).toBe('code');
    expect(redirect.searchParams.get('state')).toBeString();
    expect(response.headers.get('Set-Cookie')).toContain('google_oauth_state=');
  });

  it('creates a boarder account from Google callback and redirects with app tokens', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
    const { cookie, state } = await authorizeGoogleSignup(env);

    mockGoogleFetch({
      sub: 'google-sub-123',
      email: 'new.google@example.com',
      email_verified: true,
      given_name: 'Gina',
      family_name: 'Google',
      picture: 'https://example.com/gina.jpg',
    });

    const callback = await app.request(
      `http://localhost/auth/google/callback?code=google-code&state=${encodeURIComponent(state)}`,
      { headers: { Cookie: cookie } },
      env
    );
    const location = new URL(callback.headers.get('Location') as string);
    const authPayload = JSON.parse(decodeURIComponent(location.hash.replace(/^#auth=/, ''))) as {
      access_token: string;
      user: { id: number; email: string; role: string; boarder_status: string };
    };

    expect(callback.status).toBe(302);
    expect(location.origin + location.pathname).toBe('http://localhost:4173/boarder/find-a-room');
    expect(authPayload.access_token).toBeString();
    expect(authPayload.user).toMatchObject({
      email: 'new.google@example.com',
      role: 'boarder',
      boarder_status: 'new',
    });

    const me = await app.request(
      'http://localhost/auth/me',
      { headers: authHeaders(authPayload.access_token) },
      env
    );
    const meBody = (await me.json()) as { user: { email: string; email_verified: boolean } };

    expect(me.status).toBe(200);
    expect(meBody.user.email).toBe('new.google@example.com');
    expect(meBody.user.email_verified).toBe(true);
  });

  it('links Google login to an existing verified email account', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
    sqlite
      .prepare(
        `
          INSERT INTO users (
            first_name,
            last_name,
            email,
            password_hash,
            role,
            is_verified,
            email_verified,
            account_status,
            boarder_status
          )
          VALUES ('Paula', 'Password', 'paula@example.com', '$2y$10$hash', 'boarder', 1, 1, 'active', 'new')
        `
      )
      .run();

    const authorize = await app.request(
      'http://localhost/auth/google/authorize?action=login',
      { headers: { Referer: 'http://localhost:4173/auth/login.html' } },
      env
    );
    const state = stateFromRedirect(authorize);
    const cookie = cookieHeader(authorize);

    mockGoogleFetch({
      sub: 'google-sub-linked',
      email: 'paula@example.com',
      email_verified: true,
      given_name: 'Paula',
      family_name: 'Password',
      picture: 'https://example.com/paula.jpg',
    });

    const callback = await app.request(
      `http://localhost/api/auth/google/callback?code=google-code&state=${encodeURIComponent(
        state
      )}`,
      { headers: { Cookie: cookie } },
      env
    );

    expect(callback.status).toBe(302);
    expect(
      sqlite.prepare('SELECT google_id FROM users WHERE email = ?').get('paula@example.com')
    ).toEqual({ google_id: 'google-sub-linked' });
  });
});
