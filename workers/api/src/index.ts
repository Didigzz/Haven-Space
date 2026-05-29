import { Hono } from 'hono';
import { cors } from 'hono/cors';

import type { Env } from './env';
import { HttpError, jsonResponse, responseFromError } from './lib/http';
import applicationRoutes from './routes/applications';
import authRoutes from './routes/auth';
import boarderRoutes from './routes/boarder';
import landlordRoutes from './routes/landlord';
import propertiesRoutes from './routes/properties';
import roomsRoutes from './routes/rooms';
import systemRoutes from './routes/system';

const app = new Hono<{ Bindings: Env }>();

function resolveOrigin(requestOrigin: string, configuredOrigins?: string): string {
  const origins = (configuredOrigins || requestOrigin || '*')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  if (origins.includes('*')) {
    return requestOrigin || '*';
  }

  return origins.includes(requestOrigin) ? requestOrigin : origins[0] || requestOrigin;
}

app.use(
  '*',
  cors({
    origin: (origin, c) => resolveOrigin(origin, c.env.APP_ORIGIN),
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type'],
    credentials: true,
  })
);

app.route('/', systemRoutes);
app.route('/', authRoutes);
app.route('/', roomsRoutes);
app.route('/', propertiesRoutes);
app.route('/', boarderRoutes);
app.route('/', applicationRoutes);
app.route('/', landlordRoutes);

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
