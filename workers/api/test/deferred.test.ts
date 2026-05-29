import { describe, expect, it } from 'bun:test';

import type { Env } from '../src/env';
import app from '../src/index';

const env: Env = {
  APP_ENV: 'test',
  APP_ORIGIN: 'http://localhost',
  JWT_SECRET: 'test-secret',
};

describe('deferred routes', () => {
  it('returns explicit TODO responses for payment routes', async () => {
    const response = await app.request('http://localhost/api/payments/overview', {}, env);

    expect(response.status).toBe(501);
    expect(await response.json()).toEqual({
      success: false,
      error: 'payments routes are not implemented in the Cloudflare Worker yet',
      code: 'FEATURE_DEFERRED',
      feature: 'payments',
    });
  });

  it('returns explicit TODO responses for message routes', async () => {
    const response = await app.request('http://localhost/api/messages/conversations', {}, env);

    expect(response.status).toBe(501);
    expect(await response.json()).toEqual({
      success: false,
      error: 'messages routes are not implemented in the Cloudflare Worker yet',
      code: 'FEATURE_DEFERRED',
      feature: 'messages',
    });
  });
});
