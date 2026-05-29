import { describe, expect, it } from 'bun:test';

import app from '../src/index';
import type { Env } from '../src/env';

const testEnv: Env = {
  APP_ENV: 'test',
  APP_ORIGIN: 'http://localhost',
};

describe('system routes', () => {
  it('matches the existing PHP router smoke response shape', async () => {
    const response = await app.request('http://localhost/api/test?source=worker', {}, testEnv);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('success');
    expect(body.message).toBe('Router is working');
    expect(body.method).toBe('GET');
    expect(body.uri).toBe('/api/test?source=worker');
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('returns health metadata for Cloudflare smoke checks', async () => {
    const response = await app.request('http://localhost/api/health', {}, testEnv);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: 'success',
      service: 'haven-space-api-worker',
      runtime: 'cloudflare-workers',
      environment: 'test',
    });
  });

  it('keeps JSON 404 behavior consistent with the PHP router', async () => {
    const response = await app.request('http://localhost/api/missing', {}, testEnv);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'Route not found' });
  });
});
