import { Hono } from 'hono';

import type { Env } from '../env';
import { requireD1 } from '../lib/d1';
import { errorResponse, jsonResponse } from '../lib/http';
import { readJsonObject } from '../lib/validation';
import { findAuthUserByEmail } from '../repositories/users';

const authRoutes = new Hono<{ Bindings: Env }>();

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const email = value.trim();
  return email ? email.toLowerCase() : null;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

authRoutes.post('/auth/check-email', async c => {
  const body = await readJsonObject(c.req.raw);
  const email = normalizeEmail(body.email);

  if (!email) {
    return errorResponse(400, 'Email is required');
  }

  if (!isEmail(email)) {
    return errorResponse(400, 'Invalid email format');
  }

  const user = await findAuthUserByEmail(requireD1(c.env), email);

  if (!user) {
    return jsonResponse({
      exists: false,
      is_google_account: false,
    });
  }

  return jsonResponse({
    exists: true,
    is_google_account: Boolean(user.google_id) && !user.password_hash,
  });
});

export default authRoutes;
