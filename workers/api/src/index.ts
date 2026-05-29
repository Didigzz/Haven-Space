import { Hono } from 'hono';
import { cors } from 'hono/cors';

import type { Env } from './env';
import { HttpError, jsonResponse, responseFromError } from './lib/http';
import accountRoutes from './routes/account';
import adminRoutes from './routes/admin';
import announcementRoutes from './routes/announcements';
import applicationRoutes from './routes/applications';
import authRoutes from './routes/auth';
import boarderRoutes from './routes/boarder';
import deferredRoutes from './routes/deferred';
import landlordRoutes from './routes/landlord';
import notificationRoutes from './routes/notifications';
import propertiesRoutes from './routes/properties';
import roomsRoutes from './routes/rooms';
import systemRoutes from './routes/system';
import tenancyRoutes from './routes/tenancy';

const app = new Hono<{ Bindings: Env }>();

function configuredCorsOrigins(env: Env, requestOrigin: string): string[] {
  return (env.APP_ORIGIN || env.ALLOWED_ORIGINS || env.APP_BASE_URL || requestOrigin || '*')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

function isLocalhostOrigin(value: string): boolean {
  try {
    const { hostname } = new URL(value);
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]'
    );
  } catch {
    return false;
  }
}

function resolveOrigin(requestOrigin: string, env: Env): string {
  const origins = configuredCorsOrigins(env, requestOrigin);

  if (origins.includes('*')) {
    return requestOrigin || '*';
  }

  if (origins.includes(requestOrigin)) {
    return requestOrigin;
  }

  if (
    env.APP_ENV !== 'production' &&
    requestOrigin &&
    isLocalhostOrigin(requestOrigin) &&
    origins.some(origin => isLocalhostOrigin(origin))
  ) {
    return requestOrigin;
  }

  return origins[0] || requestOrigin;
}

app.use(
  '*',
  cors({
    origin: (origin, c) => resolveOrigin(origin, c.env),
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type', 'X-User-ID', 'X-USER-ID'],
    credentials: true,
  })
);

app.route('/', systemRoutes);
app.route('/', authRoutes);
app.route('/', accountRoutes);
app.route('/', roomsRoutes);
app.route('/', propertiesRoutes);
app.route('/', boarderRoutes);
app.route('/', applicationRoutes);
app.route('/', landlordRoutes);
app.route('/', adminRoutes);
app.route('/', notificationRoutes);
app.route('/', tenancyRoutes);
app.route('/', announcementRoutes);
app.route('/', deferredRoutes);

app.notFound(c => {
  return jsonResponse({ error: 'Route not found' }, 404);
});

app.onError((error, c) => {
  if (!(error instanceof HttpError)) {
    console.error(error);
  }

  return responseFromError(error);
});

export default app;
