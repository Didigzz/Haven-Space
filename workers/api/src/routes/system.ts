import { Hono } from 'hono';

import type { Env } from '../env';

const systemRoutes = new Hono<{ Bindings: Env }>();

function phpStyleTimestamp(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function requestUri(url: string): string {
  const parsedUrl = new URL(url);
  return `${parsedUrl.pathname}${parsedUrl.search}`;
}

systemRoutes.get('/api/test', c => {
  return c.json({
    status: 'success',
    message: 'Router is working',
    timestamp: phpStyleTimestamp(new Date()),
    method: c.req.method,
    uri: requestUri(c.req.url),
  });
});

systemRoutes.get('/test', c => {
  return c.json({
    status: 'success',
    message: 'Router is working',
    timestamp: phpStyleTimestamp(new Date()),
    method: c.req.method,
    uri: requestUri(c.req.url),
  });
});

systemRoutes.get('/api/health', c => {
  return c.json({
    status: 'success',
    service: 'haven-space-api-worker',
    runtime: 'cloudflare-workers',
    environment: c.env.APP_ENV ?? 'unknown',
  });
});

export default systemRoutes;
