import type { Env } from '../env';
import { HttpError } from './http';

export function requireD1(env: Env): D1Database {
  if (!env.DB) {
    throw new HttpError(500, 'Database binding is not configured', {
      code: 'database_not_configured',
    });
  }

  return env.DB;
}
